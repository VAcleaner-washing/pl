import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import {
  DEFAULT_CATALOG,
  DEFAULT_DEPOSIT_RULES,
  DEFAULT_SLOTS,
  rentalDays,
  rentalBase,
  isWeekendDeposit,
  slotIndex,
} from "./config.ts";
import { productUsesPuzzi, settlementConfirmation, settlementFromBooking } from "./settlement.mjs";
import { discountInfo } from "./pricing.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

type WindowCode = "morning" | "evening";
type DepositRules = Record<"oneUnit" | "twoUnits" | "general" | "elite", { day: number; weekend: number }>;
type SlotConfig = { morningStart: string; morningEnd: string; eveningStart: string; eveningEnd: string };

const defaultCatalog: any = structuredClone(DEFAULT_CATALOG);
const defaultDepositRules: DepositRules = structuredClone(DEFAULT_DEPOSIT_RULES) as DepositRules;
const defaultSlots: SlotConfig = structuredClone(DEFAULT_SLOTS) as SlotConfig;
const cleanInt = (value: unknown, max = 100000) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
const validBookingId = (value: unknown) => /^[0-9a-f-]{36}$/i.test(String(value ?? ""));
const dateValue = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
const validTime = (value: unknown) => typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};
const safeBooking = (booking: Record<string, any>) => { const out = { ...booking }; delete out.ip_hash; return out; };

function mergeCatalog(value: any) {
  const out: any = structuredClone(defaultCatalog);
  if (!value || typeof value !== "object") return out;
  const pp = Number(value.puzziPacketPrice);
  if (Number.isFinite(pp) && pp >= 0) out.puzziPacketPrice = pp;
  for (const [code, item] of Object.entries(value.products || {})) {
    if (!item || typeof item !== "object") continue;
    out.products[code] = { ...(out.products[code] || {}), ...(item as Record<string, any>) };
  }
  for (const [code, item] of Object.entries(value.extras || {})) {
    if (!item || typeof item !== "object") continue;
    out.extras[code] = { ...(out.extras[code] || {}), ...(item as Record<string, any>) };
  }
  return out;
}
function normalizeDepositRules(value: any) {
  const out = structuredClone(defaultDepositRules);
  if (!value || typeof value !== "object") return out;
  for (const key of Object.keys(out) as Array<keyof typeof out>) {
    const day = cleanInt(value?.[key]?.day, 100000), weekend = cleanInt(value?.[key]?.weekend, 100000);
    if (day > 0) out[key].day = day;
    if (weekend > 0) out[key].weekend = weekend;
  }
  return out;
}
function normalizeSlots(value: any): SlotConfig {
  if (!value || typeof value !== "object") return structuredClone(defaultSlots);
  const out: SlotConfig = {
    morningStart: String(value.morningStart ?? defaultSlots.morningStart),
    morningEnd: String(value.morningEnd ?? defaultSlots.morningEnd),
    eveningStart: String(value.eveningStart ?? defaultSlots.eveningStart),
    eveningEnd: String(value.eveningEnd ?? defaultSlots.eveningEnd),
  };
  if (!Object.values(out).every(validTime)) return structuredClone(defaultSlots);
  if (!(out.morningStart < out.morningEnd && out.morningEnd < out.eveningStart && out.eveningStart < out.eveningEnd)) return structuredClone(defaultSlots);
  return out;
}
function inWindow(time: string, window: WindowCode, slots: SlotConfig) {
  return window === "morning" ? time >= slots.morningStart && time <= slots.morningEnd : time >= slots.eveningStart && time <= slots.eveningEnd;
}
function depositGroup(productCode: string, catalog: any = defaultCatalog) {
  return catalog?.products?.[productCode]?.depositGroup || defaultCatalog.products?.[productCode]?.depositGroup || "oneUnit";
}
function calculateDeposit(productCode: string, startDate: string, returnDate: string, pickupWindow: WindowCode, returnWindow: WindowCode, rules: DepositRules, catalog: any) {
  const group = depositGroup(productCode, catalog) as keyof DepositRules;
  const row = rules[group] || defaultDepositRules[group];
  return Number(isWeekendDeposit(startDate, returnDate, pickupWindow, returnWindow) ? row.weekend : row.day) || 0;
}
function canonicalExtraLookup(code: string) { return code === "premium_sc2" ? "premium_nozzles" : code; }
function normalizeSelectedExtras(value: unknown, productCode: string, catalog: any) {
  const codes = Array.isArray(value) ? [...new Set(value.map(String))] : [];
  const items = codes.flatMap(code => {
    const lookupCode = canonicalExtraLookup(code);
    const item = catalog?.extras?.[lookupCode] || defaultCatalog.extras?.[lookupCode];
    if (!item) return [];
    const requires = Array.isArray(item.requires) ? item.requires.map(String) : [];
    if (requires.length && !requires.includes(productCode)) return [];
    return [{ code, label: String(item.label || code), price: Math.max(0, Number(item.price || 0)) }];
  });
  return { items, amount: items.reduce((sum, item) => sum + item.price, 0) };
}
function periodFromBody(body: Record<string, any>, slots: SlotConfig) {
  const startDate = dateValue(body.startDate), returnDate = dateValue(body.returnDate);
  const pickupWindow = body.pickupWindow === "evening" ? "evening" : "morning";
  const returnWindow = body.returnWindow === "evening" ? "evening" : "morning";
  const pickupTime = String(body.pickupTime || (pickupWindow === "morning" ? slots.morningStart : slots.eveningStart));
  const returnTime = String(body.returnTime || (returnWindow === "morning" ? slots.morningEnd : slots.eveningEnd));
  if (!startDate || !returnDate) throw new Error("invalid_dates");
  if (!validTime(pickupTime) || !validTime(returnTime) || !inWindow(pickupTime, pickupWindow, slots) || !inWindow(returnTime, returnWindow, slots)) throw new Error("invalid_exact_time");
  const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
  if (days < 1 || days > 14) throw new Error("invalid_rental_period");
  return { startDate, returnDate, pickupWindow, returnWindow, pickupTime, returnTime, days };
}
function isActiveBooking(row: Record<string, any>) {
  if (["confirmed", "issued"].includes(String(row.status))) return true;
  return row.status === "waiting_payment" && row.hold_expires_at && new Date(row.hold_expires_at).getTime() > Date.now();
}
async function availability(supabase: ReturnType<typeof createClient>, product: any, period: ReturnType<typeof periodFromBody>, excludeId = "") {
  const codes = Object.keys(product?.resources || {});
  if (!codes.length) return { available: false, remaining: {} };
  const requestStart = slotIndex(period.startDate, period.pickupWindow), requestEnd = slotIndex(period.returnDate, period.returnWindow);
  if (!Number.isFinite(requestStart) || !Number.isFinite(requestEnd) || requestEnd <= requestStart) return { available: false, remaining: {} };
  const [{ data: inventory, error: inventoryError }, { data: bookings, error: bookingsError }] = await Promise.all([
    supabase.from("vacleaner_inventory").select("resource_code,capacity").in("resource_code", codes).eq("active", true),
    supabase.from("vacleaner_bookings")
      .select("id,status,hold_expires_at,start_date,return_date,pickup_window,return_window,vacleaner_booking_resources(resource_code,quantity)")
      .in("status", ["waiting_payment", "confirmed", "issued"]),
  ]);
  if (inventoryError || bookingsError) throw inventoryError ?? bookingsError;
  const active = (bookings || []).filter((row: any) => row.id !== excludeId && isActiveBooking(row));
  const remaining: Record<string, number> = {};
  let available = true;
  for (const code of codes) {
    const capacity = Number(inventory?.find((row: any) => row.resource_code === code)?.capacity || 0);
    let minimum = capacity;
    for (let slot = requestStart; slot < requestEnd; slot += 1) {
      let reserved = 0;
      for (const row of active as any[]) {
        const start = slotIndex(row.start_date, row.pickup_window || "morning"), end = slotIndex(row.return_date, row.return_window || "evening");
        if (!(start <= slot && slot < end)) continue;
        const resource = row.vacleaner_booking_resources?.find((item: any) => item.resource_code === code);
        reserved += Number(resource?.quantity || 0);
      }
      minimum = Math.min(minimum, Math.max(0, capacity - reserved));
    }
    remaining[code] = minimum;
    if (minimum < Number(product.resources?.[code] || 0)) available = false;
  }
  return { available, remaining };
}
function resourcePayload(product: any) {
  return Object.entries(product?.resources || {}).map(([resource_code, quantity]) => ({ resource_code, quantity: Number(quantity || 0) })).filter(row => row.quantity > 0);
}
async function applyReservation(supabase: ReturnType<typeof createClient>, bookingId: string, period: ReturnType<typeof periodFromBody>, product: any, targetStatus: string, holdExpiresAt: string | null = null) {
  const { data, error } = await supabase.rpc("vacleaner_apply_reservation", {
    p_booking_id: bookingId,
    p_start_date: period.startDate,
    p_return_date: period.returnDate,
    p_pickup_window: period.pickupWindow,
    p_return_window: period.returnWindow,
    p_start_at: `${period.startDate}T${period.pickupTime}:00.000Z`,
    p_end_at: `${period.returnDate}T${period.returnTime}:00.000Z`,
    p_rental_days: period.days,
    p_resources: resourcePayload(product),
    p_target_status: targetStatus,
    p_hold_expires_at: holdExpiresAt,
  });
  if (error) {
    if (String(error.message || "").includes("inventory_conflict")) throw new Error("inventory_conflict");
    throw error;
  }
  return Array.isArray(data) ? data[0] : data;
}
async function tagAudit(supabase: ReturnType<typeof createClient>, bookingId: string, actorId: string, source: string, since: string) {
  if (!validBookingId(bookingId)) return;
  const { error } = await supabase.from("vacleaner_booking_audit").update({ actor_id: actorId, source })
    .eq("booking_id", bookingId).is("actor_id", null).gte("created_at", since);
  if (error) console.warn("audit_tag_failed", error.message);
}
async function upsertCustomer(supabase: ReturnType<typeof createClient>, body: Record<string, any>, fallback: Record<string, any> = {}) {
  const phone = normalizePhone(body.customerPhone ?? fallback.customer_phone);
  if (!phone) return;
  const customer: Record<string, any> = {
    phone,
    name: cleanText(body.customerName ?? fallback.customer_name, 120),
    telegram: cleanText(body.customerTelegram ?? fallback.customer_telegram, 80) || null,
    updated_at: new Date().toISOString(),
  };
  const address = cleanText(body.customerAddress ?? body.deliveryAddress, 220); if (address) customer.address = address;
  const documentNumber = cleanText(body.documentNumber, 80), documentType = cleanText(body.documentType, 40);
  if (documentNumber) {
    customer.document_number = documentNumber;
    customer.document_type = ["Паспорт", "ID-картка", "Водійське посвідчення"].includes(documentType) ? documentType : "Паспорт";
    customer.document_updated_at = new Date().toISOString();
    if (body.identityVerified === true) customer.document_verified_at = new Date().toISOString();
  }
  const { error } = await supabase.from("vacleaner_customers").upsert(customer, { onConflict: "phone" });
  if (error) throw error;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL"), serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = request.headers.get("Authorization") ?? "", token = authHeader.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (!admin) return json({ error: "forbidden" }, 403);

    const body = await request.json() as Record<string, any>;
    const action = String(body.action || "");
    const actionStartedAt = new Date(Date.now() - 1500).toISOString();
    const { data: settingsRows } = await supabase.from("vacleaner_settings").select("key,value").in("key", ["deposit_rules", "catalog", "booking_slots"]);
    const settingsMap = Object.fromEntries((settingsRows || []).map((row: any) => [row.key, row.value]));
    const depositRules = normalizeDepositRules(settingsMap.deposit_rules), catalog = mergeCatalog(settingsMap.catalog), slots = normalizeSlots(settingsMap.booking_slots);

    if (action === "list") {
      const { data, error } = await supabase.from("vacleaner_bookings").select("*,vacleaner_booking_resources(resource_code,quantity)").order("start_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return json({ bookings: (data || []).map((row: any) => safeBooking(row)) });
    }

    if (action === "calendar") {
      const from = dateValue(body.from) || new Date().toISOString().slice(0, 10), requestedDays = Math.max(7, Math.min(31, cleanInt(body.days, 31) || 14));
      const [{ data: inventory, error: ie }, { data: bookings, error: be }] = await Promise.all([
        supabase.from("vacleaner_inventory").select("resource_code,label,capacity").eq("active", true).order("resource_code"),
        supabase.from("vacleaner_bookings").select("id,status,hold_expires_at,start_date,return_date,pickup_window,return_window,vacleaner_booking_resources(resource_code,quantity)").in("status", ["waiting_payment", "confirmed", "issued"]),
      ]);
      if (ie || be) throw ie ?? be;
      const active = (bookings || []).filter((row: any) => isActiveBooking(row));
      const base = Date.parse(`${from}T12:00:00Z`);
      const days = Array.from({ length: requestedDays }, (_, index) => {
        const date = new Date(base + index * 86400000).toISOString().slice(0, 10), resources: Record<string, any> = {};
        for (const item of inventory || []) {
          const capacity = Number(item.capacity || 0);
          const countAt = (window: WindowCode) => active.reduce((sum: number, booking: any) => {
            const at = slotIndex(date, window), startN = slotIndex(booking.start_date, booking.pickup_window || "morning"), endN = slotIndex(booking.return_date, booking.return_window || "evening");
            if (!(startN <= at && at < endN)) return sum;
            const row = booking.vacleaner_booking_resources?.find((r: any) => r.resource_code === item.resource_code);
            return sum + Number(row?.quantity || 0);
          }, 0);
          resources[item.resource_code] = { label: item.label, capacity, morning: Math.max(0, capacity - countAt("morning")), evening: Math.max(0, capacity - countAt("evening")) };
        }
        return { date, resources };
      });
      return json({ days });
    }

    if (action === "clients") {
      const { data, error } = await supabase.from("vacleaner_customers")
        .select("phone,name,telegram,address,document_type,document_number,document_verified_at,document_updated_at,document_photo_path,document_photo_name,document_photo_mime,document_photo_uploaded_at,created_at,updated_at")
        .order("updated_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return json({ customers: data || [] });
    }

    if (action === "save_customer") {
      const originalPhone = normalizePhone(body.originalPhone), customerPhone = normalizePhone(body.customerPhone), customerName = cleanText(body.customerName, 120);
      if (!originalPhone || !customerPhone || customerName.length < 2) return json({ error: "invalid_customer_data" }, 400);
      const { data: existing, error: existingError } = await supabase.from("vacleaner_customers").select("*").eq("phone", originalPhone).maybeSingle();
      if (existingError) throw existingError;
      if (customerPhone !== originalPhone) {
        const { data: conflict, error: conflictError } = await supabase.from("vacleaner_customers").select("phone").eq("phone", customerPhone).maybeSingle();
        if (conflictError) throw conflictError;
        if (conflict) return json({ error: "customer_phone_exists" }, 409);
      }
      const now = new Date().toISOString(), documentNumber = cleanText(body.documentNumber, 80), requestedType = cleanText(body.documentType, 40);
      const documentType = documentNumber && ["Паспорт", "ID-картка", "Водійське посвідчення"].includes(requestedType) ? requestedType : documentNumber ? "Паспорт" : null;
      const verified = documentNumber && body.identityVerified === true;
      const row: Record<string, any> = {
        phone: customerPhone,
        name: customerName,
        telegram: cleanText(body.customerTelegram, 80) || null,
        address: cleanText(body.customerAddress, 220) || null,
        document_type: documentType,
        document_number: documentNumber || null,
        document_verified_at: verified ? (existing?.document_verified_at || now) : null,
        document_updated_at: documentNumber !== String(existing?.document_number || "") ? now : (existing?.document_updated_at || (documentNumber ? now : null)),
        updated_at: now,
      };
      if (existing) {
        const { error } = await supabase.from("vacleaner_customers").update(row).eq("phone", originalPhone); if (error) throw error;
      } else {
        const { error } = await supabase.from("vacleaner_customers").upsert({ ...row, created_at: now }, { onConflict: "phone" }); if (error) throw error;
      }
      const bookingPatch = { customer_name: customerName, customer_phone: customerPhone, customer_telegram: row.telegram, updated_at: now };
      const { error: bookingsError } = await supabase.from("vacleaner_bookings").update(bookingPatch).eq("customer_phone", originalPhone);
      if (bookingsError) throw bookingsError;
      return json({ customer: { phone: customerPhone, name: customerName, telegram: row.telegram, address: row.address, document_type: row.document_type, document_number: row.document_number, document_verified_at: row.document_verified_at, updated_at: now } });
    }

    if (action === "lookup_customer") {
      const phone = normalizePhone(body.phone); if (!phone) return json({ customer: null });
      const [{ data: profile }, { data: orders, error }] = await Promise.all([
        supabase.from("vacleaner_customers").select("phone,name,telegram,address,document_type,document_number,document_verified_at,document_photo_path,document_photo_name,document_photo_mime,document_photo_uploaded_at,updated_at").eq("phone", phone).maybeSingle(),
        supabase.from("vacleaner_bookings").select("customer_name,customer_telegram,fulfillment,fulfillment_address,product_label,start_date,status,total_amount,created_at").eq("customer_phone", phone).order("created_at", { ascending: false }).limit(100),
      ]);
      if (error) throw error;
      if (!profile && !orders?.length) return json({ customer: null });
      const completed = (orders || []).filter((row: any) => row.status === "completed"), latest = orders?.[0], latestDelivery = (orders || []).find((row: any) => row.fulfillment === "delivery" && row.fulfillment_address);
      const completedOrders = completed.length, loyalty = completedOrders >= 6 ? { level: "VIP", percent: 10 } : completedOrders >= 3 ? { level: "Regular", percent: 5 } : { level: "Start", percent: 0 };
      const hasDocument = Boolean(profile?.document_number), isRepeatCustomer = completedOrders > 0;
      return json({ customer: {
        phone, name: profile?.name || latest?.customer_name || "", telegram: profile?.telegram || latest?.customer_telegram || "", address: profile?.address || latestDelivery?.fulfillment_address || "",
        documentType: profile?.document_type || "", documentNumber: profile?.document_number || "", documentVerifiedAt: profile?.document_verified_at || null,
        documentPhotoName: profile?.document_photo_name || "", documentPhotoMime: profile?.document_photo_mime || "", documentPhotoUploadedAt: profile?.document_photo_uploaded_at || null, hasDocumentPhoto: Boolean(profile?.document_photo_path),
        hasDocument, isRepeatCustomer, documentsRequired: !hasDocument && !isRepeatCustomer, completedOrders, totalOrders: (orders || []).filter((row: any) => !["cancelled", "declined"].includes(row.status)).length,
        totalSpent: completed.reduce((sum: number, row: any) => sum + Number(row.total_amount || 0), 0), lastDate: latest?.start_date || "", lastProduct: latest?.product_label || "", loyalty,
      }});
    }

    if (action === "audit_log") {
      const bookingId = String(body.bookingId || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const limit = Math.max(1, Math.min(100, cleanInt(body.limit, 100) || 60));
      const { data, error } = await supabase.from("vacleaner_booking_audit").select("id,booking_id,booking_code,event_type,changed_fields,old_values,new_values,actor_id,source,created_at").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error; return json({ entries: data || [] });
    }

    if (action === "create" || action === "edit") {
      const productCode = String(body.productCode || ""), product = catalog.products?.[productCode];
      if (!product) return json({ error: "invalid_product" }, 400);
      const period = periodFromBody(body, slots), bookingId = action === "edit" ? String(body.bookingId || "") : "";
      if (action === "edit" && !validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const av = await availability(supabase, product, period, bookingId); if (!av.available) return json({ error: "inventory_conflict", availability: av }, 409);
      const customerName = cleanText(body.customerName, 120), customerPhone = normalizePhone(body.customerPhone), fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
      const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 220) : "Полтава, вул. Європейська, 146Е";
      if (customerName.length < 2 || !customerPhone || (fulfillment === "delivery" && address.length < 8)) return json({ error: "invalid_customer_data" }, 400);
      const rawBase = rentalBase(product, period.startDate, period.returnDate, period.pickupWindow, period.returnWindow), existing = action === "edit" ? (await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single()).data : null;
      if (action === "edit" && !existing) return json({ error: "invalid_booking" }, 404);
      const currentExtras = existing?.extras && typeof existing.extras === "object" ? existing.extras : {}, discount = discountInfo(body, rawBase, currentExtras), selected = normalizeSelectedExtras(body.selectedExtras, productCode, catalog);
      const deliveryAmount = fulfillment === "delivery" ? 250 : 0, depositAmount = calculateDeposit(productCode, period.startDate, period.returnDate, period.pickupWindow, period.returnWindow, depositRules, catalog), prepaymentPaid = body.prepaymentPaid === true || existing?.prepayment_paid === true;
      const extras = { ...currentExtras, pickup_time: period.pickupTime, return_time: period.returnTime, slot_config: slots,
        discount: { type: discount.type, percent: discount.percent, amount: discount.amount, source: discount.source, reason: discount.source === "manual" ? discount.manualReason : "" },
        manual_discount: discount.manualType === "none" ? null : { type: discount.manualType, value: discount.manualValue, amount: discount.manualAmount, reason: discount.manualReason },
        loyalty: { level: String(body.loyaltyLevel || currentExtras?.loyalty?.level || (discount.loyaltyPercent === 10 ? "VIP" : discount.loyaltyPercent === 5 ? "Regular" : "Start")), percent: discount.loyaltyPercent, completed_orders: cleanInt(body.completedOrders ?? currentExtras?.loyalty?.completed_orders, 10000) },
        base_before_discount: rawBase, selected_items: selected.items, selected_items_amount: selected.amount };
      const common: Record<string, any> = {
        product_code: productCode, product_label: product.label || productCode, start_date: period.startDate, return_date: period.returnDate,
        start_at: `${period.startDate}T${period.pickupTime}:00.000Z`, end_at: `${period.returnDate}T${period.returnTime}:00.000Z`, pickup_window: period.pickupWindow, return_window: period.returnWindow, rental_days: period.days,
        fulfillment, fulfillment_address: address, customer_name: customerName, customer_phone: customerPhone, customer_telegram: cleanText(body.customerTelegram, 80) || null, customer_comment: cleanText(body.customerComment, 800) || null,
        source: cleanText(body.source, 30) || "instagram", extras, base_amount: discount.baseAmount, extras_amount: selected.amount, delivery_amount: deliveryAmount, total_amount: discount.baseAmount + selected.amount + deliveryAmount,
        prepayment_amount: 200, prepayment_paid: prepaymentPaid, deposit_amount: depositAmount, admin_note: cleanText(body.adminNote, 800) || null, updated_at: new Date().toISOString(),
      };
      let saved: any;
      if (action === "create") {
        const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase(), now = new Date();
        const holdExpiresAt = prepaymentPaid ? null : new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const insert = { ...common, booking_code: `VAC-${period.startDate.replaceAll("-", "").slice(2)}-${suffix}`, deposit_paid: false, deposit_returned: false,
          status: "pending", prepayment_paid: false, prepayment_paid_at: null, confirmed_at: null, hold_expires_at: null };
        const { data, error } = await supabase.from("vacleaner_bookings").insert(insert).select("*").single(); if (error || !data) throw error || new Error("insert_failed");
        try {
          saved = await applyReservation(supabase, data.id, period, product, prepaymentPaid ? "confirmed" : "waiting_payment", holdExpiresAt);
        } catch (reservationError) {
          await supabase.from("vacleaner_bookings").delete().eq("id", data.id);
          throw reservationError;
        }
      } else {
        if (!["pending", "waiting_payment", "confirmed"].includes(String(existing.status || ""))) return json({ error: "invalid_transition" }, 409);
        const targetStatus = String(existing.status || "pending"), holdExpiresAt = targetStatus === "waiting_payment" ? (existing.hold_expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()) : null;
        saved = await applyReservation(supabase, bookingId, period, product, targetStatus, holdExpiresAt);
        const patch = { ...common, status: saved.status, hold_expires_at: saved.hold_expires_at, prepayment_paid: saved.prepayment_paid, prepayment_paid_at: saved.prepayment_paid_at, confirmed_at: saved.confirmed_at };
        const { data, error } = await supabase.from("vacleaner_bookings").update(patch).eq("id", bookingId).select("*").single(); if (error || !data) throw error || new Error("update_failed"); saved = data;
      }
      await upsertCustomer(supabase, body, saved); await tagAudit(supabase, saved.id, userData.user.id, `edge:${action}`, actionStartedAt);
      return json({ booking: safeBooking(saved) }, action === "create" ? 201 : 200);
    }

    if (action === "update") {
      const bookingId = String(body.bookingId || ""), nextStatus = String(body.status || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const { data: current, error } = await supabase.from("vacleaner_bookings").select("*,vacleaner_booking_resources(resource_code,quantity)").eq("id", bookingId).single(); if (error || !current) return json({ error: "invalid_booking" }, 404);
      if (nextStatus === "confirmed" || nextStatus === "waiting_payment") {
        const reservationAllowed = nextStatus === "confirmed" ? ["pending", "waiting_payment", "confirmed"] : ["pending", "waiting_payment"];
        if (!reservationAllowed.includes(String(current.status || ""))) return json({ error: "invalid_transition" }, 409);
        const product = catalog.products?.[current.product_code]; if (!product) return json({ error: "invalid_product" }, 400);
        const period = { startDate: String(current.start_date), returnDate: String(current.return_date), pickupWindow: current.pickup_window || "morning", returnWindow: current.return_window || "evening", pickupTime: current.extras?.pickup_time || (current.pickup_window === "evening" ? slots.eveningStart : slots.morningStart), returnTime: current.extras?.return_time || (current.return_window === "evening" ? slots.eveningEnd : slots.morningEnd), days: current.rental_days } as any;
        const hold = nextStatus === "waiting_payment" ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null;
        try {
          const reserved = await applyReservation(supabase, bookingId, period, product, nextStatus, hold);
          await tagAudit(supabase, bookingId, userData.user.id, `edge:update`, actionStartedAt);
          return json({ booking: safeBooking(reserved) });
        } catch (reservationError) {
          if (reservationError instanceof Error && reservationError.message === "inventory_conflict") return json({ error: "inventory_conflict" }, 409);
          throw reservationError;
        }
      }
      const allowed = nextStatus === "issued" ? ["confirmed"] : nextStatus === "completed" ? ["confirmed", "issued"] : ["pending", "waiting_payment", "confirmed", "issued"];
      if (!["issued", "completed", "declined", "cancelled"].includes(nextStatus) || !allowed.includes(current.status)) return json({ error: "invalid_transition" }, 409);
      const now = new Date().toISOString(), patch: Record<string, any> = { status: nextStatus, admin_note: cleanText(body.adminNote, 800) || current.admin_note, updated_at: now };
      if (nextStatus === "waiting_payment") patch.hold_expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      else patch.hold_expires_at = null;
      if (nextStatus === "confirmed") { patch.prepayment_paid = true; patch.prepayment_amount = 200; patch.prepayment_paid_at = current.prepayment_paid_at || now; patch.confirmed_at = current.confirmed_at || now; }
      if (nextStatus === "issued") patch.issued_at = current.issued_at || now;
      if (nextStatus === "completed") patch.completed_at = current.completed_at || now;
      const { data, error: updateError } = await supabase.from("vacleaner_bookings").update(patch).eq("id", bookingId).select("*").single(); if (updateError) throw updateError;
      await tagAudit(supabase, bookingId, userData.user.id, `edge:update`, actionStartedAt); return json({ booking: safeBooking(data) });
    }

    if (action === "save_finance") {
      const bookingId = String(body.bookingId || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const { data: current, error: currentError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single(); if (currentError || !current) return json({ error: "invalid_booking" }, 404);
      const packetLimit = productUsesPuzzi(String(current.product_code || ""), catalog, defaultCatalog) ? 8 : 0, usedPackets = cleanInt(body.usedPackets, packetLimit), storyMention = packetLimit > 0 && body.storyMention === true;
      const depositAmount = cleanInt(body.depositAmount ?? current.deposit_amount, 100000), depositPaid = body.depositPaid === true || current.deposit_paid === true;
      const currentExtras = current.extras && typeof current.extras === "object" ? current.extras : {};
      const rawBase = Math.max(0, Number(currentExtras.base_before_discount ?? (Number(current.base_amount || 0) + Number(currentExtras?.discount?.amount || 0))) || 0);
      const discount = discountInfo(body, rawBase, currentExtras), discountedExtras = { ...currentExtras,
        discount: { type: discount.type, percent: discount.percent, amount: discount.amount, source: discount.source, reason: discount.source === "manual" ? discount.manualReason : "" },
        manual_discount: discount.manualType === "none" ? null : { type: discount.manualType, value: discount.manualValue, amount: discount.manualAmount, reason: discount.manualReason },
        base_before_discount: rawBase };
      const calculationInput = { ...current, base_amount: discount.baseAmount, deposit_amount: depositAmount, deposit_paid: depositPaid, extras: { ...discountedExtras, chemistry: { used_packets: usedPackets, story_mention: storyMention } } };
      const finance = settlementFromBooking(calculationInput, catalog, defaultCatalog), now = new Date().toISOString();
      const extras = { ...discountedExtras, chemistry: { used_packets: finance.usedPackets, story_mention: finance.storyMention, free_packets: finance.freePackets, paid_packets: finance.paidPackets, price_per_packet: finance.packetPrice, amount: finance.chemistryAmount }, settlement: { ...(currentExtras.settlement || {}), model: "prepayment_plus_deposit", prepayment_amount: finance.prepaymentAmount, deposit_amount: finance.depositPaid ? finance.securityDeposit : 0, received_amount: finance.receivedAmount, expenses_amount: finance.totalAmount, refund_amount: finance.refundAmount, due_amount: finance.dueAmount, completed: false, completed_at: null, calculated_at: now } };
      const { data, error } = await supabase.from("vacleaner_bookings").update({ extras, base_amount: discount.baseAmount, extras_amount: finance.totalExtras, total_amount: finance.totalAmount, deposit_amount: depositAmount, deposit_paid: depositPaid, deposit_paid_at: depositPaid ? (current.deposit_paid_at || now) : null, issue_payment_amount: 0, issue_payment_paid: false, issue_payment_paid_at: null, updated_at: now }).eq("id", bookingId).select("*").single(); if (error) throw error;
      await tagAudit(supabase, bookingId, userData.user.id, "edge:save_finance", actionStartedAt); return json({ booking: data, finance });
    }

    if (action === "save_deposit_return") {
      const bookingId = String(body.bookingId || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const { data: current, error: currentError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single(); if (currentError || !current) return json({ error: "invalid_booking" }, 404);
      if (current.deposit_paid !== true) return json({ error: "deposit_not_received" }, 409);
      if (!["confirmed", "issued", "completed"].includes(String(current.status || ""))) return json({ error: "invalid_transition" }, 409);
      const finance = settlementFromBooking(current, catalog, defaultCatalog), confirmation = settlementConfirmation(body, finance); if (!confirmation.ok) return json({ error: confirmation.error, finance }, 409);
      const now = new Date().toISOString(), currentExtras = current.extras && typeof current.extras === "object" ? current.extras : {};
      const extras = { ...currentExtras, settlement: { ...(currentExtras.settlement || {}), model: "prepayment_plus_deposit", prepayment_amount: finance.prepaymentAmount, deposit_amount: finance.depositPaid ? finance.securityDeposit : 0, received_amount: finance.receivedAmount, expenses_amount: finance.totalAmount, refund_amount: finance.refundAmount, due_amount: finance.dueAmount, refund_paid: finance.refundAmount > 0 ? confirmation.refundPaid : false, due_paid: finance.dueAmount > 0 ? confirmation.duePaid : false, completed: true, completed_at: now, calculated_at: now } };
      const { data, error } = await supabase.from("vacleaner_bookings").update({ extras, extras_amount: finance.totalExtras, total_amount: finance.totalAmount, deposit_returned: true, deposit_returned_at: now, return_payment_amount: finance.dueAmount, return_payment_paid: finance.dueAmount > 0 ? confirmation.duePaid : false, return_payment_paid_at: finance.dueAmount > 0 && confirmation.duePaid ? now : null, status: "completed", completed_at: current.completed_at || now, hold_expires_at: null, updated_at: now }).eq("id", bookingId).select("*").single(); if (error) throw error;
      await tagAudit(supabase, bookingId, userData.user.id, "edge:save_deposit_return", actionStartedAt); return json({ booking: data, finance });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "service_error";
    if (message === "inventory_conflict") return json({ error: "inventory_conflict" }, 409);
    if (["invalid_dates", "invalid_exact_time", "invalid_rental_period"].includes(message)) return json({ error: message }, 400);
    console.error("vacleaner-admin-bookings-v3", message);
    return json({ error: "service_error" }, 500);
  }
});
