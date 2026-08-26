import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import {
  DEFAULT_CATALOG,
  DEFAULT_DELIVERY_FEE,
  DEFAULT_DELIVERY_PRICING,
  DEFAULT_DEPOSIT_RULES,
  DEFAULT_SLOTS,
  rentalDays,
  rentalBase,
  paidDayMoments,
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
const defaultDeliveryFee = Number(DEFAULT_DELIVERY_FEE) || 250;
const defaultDeliveryPricing: any = structuredClone(DEFAULT_DELIVERY_PRICING);
const cleanInt = (value: unknown, max = 100000) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
const cleanAdminAlias = (value: unknown) => {
  const alias = cleanText(value, 40).toLowerCase();
  return alias === "vacleaner" || alias === "annanevidoma" ? alias : "";
};
const legacyWorkflowNotes = new Set([
  "Документи нового клієнта перевірено й збережено",
  "Повторний клієнт — документи повторно не запитували",
  "З клієнтом зв’язались",
  "Умови оренди та сума залогового платежу надіслані",
  "Передплата 200 грн отримана",
]);
const cleanAdminNote = (value: unknown, max = 800) => cleanText(value, max).split(/\r?\n/).map(line => line.trim()).filter(line => line && !legacyWorkflowNotes.has(line) && !line.startsWith("[[VAC_PROCESS:")).join("\n").slice(0, max);
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
function normalizeDeliveryPricing(value: unknown) {
  const source: any = value && typeof value === "object" ? value : { local: value };
  const amount = (raw: unknown, fallback: number, min = 0, max = 100000) => {
    const n = Number(raw); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : fallback;
  };
  const local = amount(source?.local ?? source?.amount ?? source, defaultDeliveryFee);
  const baseOutside = amount(source?.baseOutside ?? source?.suburb, Number(defaultDeliveryPricing.baseOutside ?? defaultDeliveryPricing.suburb ?? 350));
  const includedKm = amount(source?.includedKm, Number(defaultDeliveryPricing.includedKm || 10), 1, 100);
  const perKm = amount(source?.perKm, Number(defaultDeliveryPricing.perKm || 15), 1, 1000);
  const maxOutsideKm = amount(source?.maxOutsideKm ?? source?.serviceRadiusKm, Number(defaultDeliveryPricing.maxOutsideKm || 30), includedKm, 200);
  return { local, suburb: baseOutside, baseOutside, includedKm, perKm, maxOutsideKm, localSettlements: [...(defaultDeliveryPricing.localSettlements || ["Полтава","Розсошенці","Щербані","Горбанівка"])], outsideZone: String(defaultDeliveryPricing.outsideZone || "agreement") };
}
function normalizeSettlement(value: unknown) {
  return String(value || "").toLocaleLowerCase("uk-UA").replace(/^[смт.\s]+/u, "").replace(/[’`]/g, "'").trim();
}
function deliveryQuote(fulfillment: string, address: string, verified: boolean, distanceValue: unknown, pricing: any) {
  if (fulfillment !== "delivery") return { amount: 0, zone: "pickup", quoteRequired: false, settlement: "", distanceKm: null, extraKm: 0 };
  const base = String(address || "").split(" · ")[0].trim();
  if (!base) return { amount: pricing.local, zone: "pending", quoteRequired: false, settlement: "", distanceKm: null, extraKm: 0 };
  const settlement = base.split(",")[0].trim(), normalized = normalizeSettlement(settlement);
  const local = (pricing.localSettlements || []).some((item: string) => normalizeSettlement(item) === normalized);
  if (local) return { amount: pricing.local, zone: "local", quoteRequired: false, settlement, distanceKm: 0, extraKm: 0 };
  const distanceKm = Number(distanceValue);
  if (verified && Number.isFinite(distanceKm) && distanceKm >= 0) {
    if (distanceKm > pricing.maxOutsideKm) return { amount: 0, zone: "agreement", quoteRequired: true, settlement, distanceKm, extraKm: 0 };
    const extraKm = Math.max(0, Math.ceil((distanceKm - pricing.includedKm) - 1e-9));
    return { amount: pricing.baseOutside + extraKm * pricing.perKm, zone: extraKm > 0 ? "distance" : "nearby", quoteRequired: false, settlement, distanceKm, extraKm };
  }
  return { amount: 0, zone: "agreement", quoteRequired: true, settlement, distanceKm: Number.isFinite(distanceKm) ? distanceKm : null, extraKm: 0 };
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
    return [{ code, label: String(item.label || code), price: Math.max(0, Number(item.price || 0)), payment_mode: "upfront" }];
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
async function notifyPeerAdmin(request: Request, supabaseUrl: string, bookingId: string, eventType: "new" | "issued" | "completed", body: Record<string, any>) {
  const adminAlias = cleanAdminAlias(body.adminAlias), actorDeviceId = cleanText(body.actorDeviceId, 128);
  if (!validBookingId(bookingId) || (!adminAlias && actorDeviceId.length < 8)) return;
  try {
    const authorization = request.headers.get("Authorization") || "";
    const apiKey = request.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const response = await fetch(`${supabaseUrl}/functions/v1/vacleaner-push`, {
      method: "POST",
      headers: { Authorization: authorization, apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notify_admin_event", bookingId, eventType, adminAlias, actorDeviceId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.warn("peer_push_failed", eventType, response.status);
  } catch (error) {
    console.warn("peer_push_failed", eventType, error instanceof Error ? error.message : "unknown_error");
  }
}

function promoExtraFromCandidate(promo: Record<string, any>, applied = false) {
  return promo ? {
    code: String(promo.code || ""),
    campaign_id: String(promo.campaignId || ""),
    campaign_name: String(promo.campaignName || ""),
    campaign_type: String(promo.campaignType || ""),
    discount_type: promo.discountType === "fixed" ? "fixed" : "percent",
    discount_value: Math.max(0, Number(promo.discountValue || 0)),
    applied: applied === true,
  } : null;
}
function promoScore(promo: Record<string, any>, rawBase = 0) {
  const value = Math.max(0, Number(promo.discountValue || 0));
  return promo.discountType === "fixed" ? value : rawBase > 0 ? Math.round(rawBase * Math.min(100, value) / 100) : value * 10;
}
async function resolvePhonePromo(supabase: ReturnType<typeof createClient>, args: Record<string, any>) {
  const phone = normalizePhone(args.phone); if (!phone) return null;
  const { data: promoCodes, error: codeError } = await supabase.from("vacleaner_promo_codes")
    .select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,created_at")
    .eq("customer_phone", phone).eq("active", true).order("created_at", { ascending: false }).limit(20);
  if (codeError) throw codeError;
  if (!promoCodes?.length) return null;
  const campaignIds = [...new Set(promoCodes.map((row: any) => String(row.campaign_id || "")).filter(Boolean))];
  if (!campaignIds.length) return null;
  const historyPromise = Array.isArray(args.history)
    ? Promise.resolve({ data: args.history, error: null })
    : supabase.from("vacleaner_bookings").select("id,status,hold_expires_at,start_date,return_date,created_at")
      .eq("customer_phone", phone).order("created_at", { ascending: false }).limit(200);
  const [{ data: campaigns, error: campaignError }, { data: redemptions, error: redemptionError }, historyResult] = await Promise.all([
    supabase.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,dormant_days,allowed_product_codes,allowed_weekdays,min_completed_orders,starts_at,ends_at,usage_limit_total,usage_limit_per_customer").in("id", campaignIds),
    supabase.from("vacleaner_promo_redemptions").select("promo_code_id,campaign_id,customer_phone").in("campaign_id", campaignIds),
    historyPromise,
  ]);
  if (campaignError || redemptionError || historyResult.error) throw campaignError || redemptionError || historyResult.error;
  const history = Array.isArray(historyResult.data) ? historyResult.data : [];
  const completed = history.filter((row: any) => String(row.status) === "completed");
  const lastCompleted = completed.reduce((latest: string, row: any) => {
    const value = String(row.return_date || row.start_date || "").slice(0, 10);
    return value > latest ? value : latest;
  }, "");
  const excludeBookingId = String(args.excludeBookingId || "");
  const hasActiveBooking = history.some((row: any) => String(row.id || "") !== excludeBookingId && ["waiting_payment", "confirmed", "issued"].includes(String(row.status)));
  const now = Date.now(), productCode = String(args.productCode || ""), rawBase = Math.max(0, Number(args.rawBase || 0));
  const hasRentalContext = Boolean(productCode && dateValue(args.startDate) && dateValue(args.returnDate));
  const pickupWindow = args.pickupWindow === "evening" ? "evening" : "morning", returnWindow = args.returnWindow === "evening" ? "evening" : "morning";
  const candidates: Record<string, any>[] = [];
  for (const promoCode of promoCodes) {
    const campaign = campaigns?.find((row: any) => String(row.id) === String(promoCode.campaign_id));
    if (!campaign || campaign.status !== "active") continue;
    const starts = new Date(campaign.starts_at).getTime(), ends = campaign.ends_at ? new Date(campaign.ends_at).getTime() : 0, codeEnds = promoCode.expires_at ? new Date(promoCode.expires_at).getTime() : 0;
    if ((Number.isFinite(starts) && starts > now) || (ends && ends <= now) || (codeEnds && codeEnds <= now)) continue;
    const codeUses = (redemptions || []).filter((row: any) => String(row.promo_code_id) === String(promoCode.id)).length;
    const customerUses = (redemptions || []).filter((row: any) => String(row.campaign_id) === String(campaign.id) && normalizePhone(row.customer_phone) === phone).length;
    const campaignUses = (redemptions || []).filter((row: any) => String(row.campaign_id) === String(campaign.id)).length;
    if (codeUses >= Math.max(1, Number(promoCode.usage_limit || 1))) continue;
    if (customerUses >= Math.max(1, Number(campaign.usage_limit_per_customer || 1))) continue;
    if (campaign.usage_limit_total && campaignUses >= Number(campaign.usage_limit_total)) continue;
    if (campaign.campaign_type === "personal" && normalizePhone(promoCode.customer_phone) !== phone) continue;
    let blockedReason = "";
    if (completed.length < Number(campaign.min_completed_orders || 0)) blockedReason = "not_eligible";
    if (!blockedReason && campaign.campaign_type === "return") {
      if (!lastCompleted) blockedReason = "not_eligible";
      else {
        const dormantDays = Math.max(1, Number(campaign.dormant_days || 180)), cutoff = now - dormantDays * 86400000;
        if (new Date(lastCompleted + "T12:00:00Z").getTime() > cutoff) blockedReason = "not_dormant_long_enough";
        else if (hasActiveBooking) blockedReason = "active_booking";
      }
    }
    if (!blockedReason && hasRentalContext) {
      const products = Array.isArray(campaign.allowed_product_codes) ? campaign.allowed_product_codes.map(String) : [];
      if (products.length && !products.includes(productCode)) blockedReason = "product_not_eligible";
      const weekdays = Array.isArray(campaign.allowed_weekdays) ? campaign.allowed_weekdays.map(Number) : [];
      if (!blockedReason && weekdays.length) {
        const moments = paidDayMoments(String(args.startDate), String(args.returnDate), pickupWindow, returnWindow);
        if (!moments.length || moments.some((item: any) => !weekdays.includes(new Date(item.date + "T12:00:00Z").getUTCDay()))) blockedReason = "weekday_not_eligible";
      }
    }
    candidates.push({
      code: String(promoCode.code || ""), promoCodeId: promoCode.id, campaignId: campaign.id, campaignName: campaign.name,
      campaignType: campaign.campaign_type, discountType: campaign.discount_type === "fixed" ? "fixed" : "percent", discountValue: Number(campaign.discount_value || 0),
      expiresAt: promoCode.expires_at || campaign.ends_at || null, eligible: !blockedReason, blockedReason,
    });
  }
  if (!candidates.length) return null;
  const eligible = candidates.filter(row => row.eligible).sort((a, b) => promoScore(b, rawBase) - promoScore(a, rawBase));
  if (eligible.length) return eligible[0];
  if (args.includeBlocked === true) return candidates.sort((a, b) => promoScore(b, rawBase) - promoScore(a, rawBase))[0];
  return null;
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
    const { data: settingsRows } = await supabase.from("vacleaner_settings").select("key,value").in("key", ["deposit_rules", "catalog", "booking_slots", "delivery_fee"]);
    const settingsMap = Object.fromEntries((settingsRows || []).map((row: any) => [row.key, row.value]));
    const depositRules = normalizeDepositRules(settingsMap.deposit_rules), catalog = mergeCatalog(settingsMap.catalog), slots = normalizeSlots(settingsMap.booking_slots), deliveryPricing = normalizeDeliveryPricing(settingsMap.delivery_fee);

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
        supabase.from("vacleaner_bookings").select("id,customer_name,customer_telegram,fulfillment,fulfillment_address,product_label,start_date,return_date,status,hold_expires_at,total_amount,created_at").eq("customer_phone", phone).order("created_at", { ascending: false }).limit(100),
      ]);
      if (error) throw error;
      let promoRawBase = 0;
      const promoProductCode = String(body.productCode || ""), promoProduct = catalog.products?.[promoProductCode];
      if (promoProduct && dateValue(body.startDate) && dateValue(body.returnDate)) {
        promoRawBase = rentalBase(promoProduct, String(body.startDate), String(body.returnDate), body.pickupWindow === "evening" ? "evening" : "morning", body.returnWindow === "evening" ? "evening" : "morning");
      }
      const promo = await resolvePhonePromo(supabase, { phone, productCode: promoProductCode, startDate: body.startDate, returnDate: body.returnDate, pickupWindow: body.pickupWindow, returnWindow: body.returnWindow, rawBase: promoRawBase, history: orders || [], includeBlocked: true, excludeBookingId: body.bookingId });
      if (!profile && !orders?.length && !promo) return json({ customer: null });
      const completed = (orders || []).filter((row: any) => row.status === "completed"), latest = orders?.[0], latestDelivery = (orders || []).find((row: any) => row.fulfillment === "delivery" && row.fulfillment_address);
      const completedOrders = completed.length, loyalty = completedOrders >= 6 ? { level: "VIP", percent: 10 } : completedOrders >= 3 ? { level: "Regular", percent: 5 } : { level: "Start", percent: 0 };
      const hasDocument = Boolean(profile?.document_number), isRepeatCustomer = completedOrders > 0;
      return json({ customer: {
        phone, name: profile?.name || latest?.customer_name || "", telegram: profile?.telegram || latest?.customer_telegram || "", address: profile?.address || latestDelivery?.fulfillment_address || "",
        documentType: profile?.document_type || "", documentNumber: profile?.document_number || "", documentVerifiedAt: profile?.document_verified_at || null,
        documentPhotoName: profile?.document_photo_name || "", documentPhotoMime: profile?.document_photo_mime || "", documentPhotoUploadedAt: profile?.document_photo_uploaded_at || null, hasDocumentPhoto: Boolean(profile?.document_photo_path),
        hasDocument, isRepeatCustomer, documentsRequired: !hasDocument && !isRepeatCustomer, completedOrders, totalOrders: (orders || []).filter((row: any) => !["cancelled", "declined"].includes(row.status)).length,
        totalSpent: completed.reduce((sum: number, row: any) => sum + Number(row.total_amount || 0), 0), lastDate: latest?.start_date || "", lastProduct: latest?.product_label || "", loyalty, promo,
      }});
    }

    if (action === "detach_promo") {
      const bookingId = String(body.bookingId || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const { data: booking, error: bookingError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).maybeSingle();
      if (bookingError) throw bookingError; if (!booking) return json({ error: "invalid_booking" }, 404);
      if (!["pending", "waiting_payment", "confirmed"].includes(String(booking.status || ""))) return json({ error: "invalid_transition" }, 409);
      const currentExtras = booking.extras && typeof booking.extras === "object" ? booking.extras : {};
      if (!currentExtras?.promo) return json({ booking: safeBooking(booking), detached: false });
      const rawBase = Math.max(0, Number(currentExtras?.base_before_discount || 0) || (Number(booking.base_amount || 0) + Number(currentExtras?.discount?.amount || 0)));
      const pricingExtras = { ...currentExtras, promo: null };
      const discount = discountInfo({}, rawBase, pricingExtras);
      const extras = { ...currentExtras, promo: null, discount: { type: discount.type, percent: discount.percent, amount: discount.amount, source: discount.source, reason: discount.source === "manual" ? discount.manualReason : "" }, base_before_discount: rawBase };
      const baseAmount = discount.baseAmount, totalAmount = baseAmount + Math.max(0, Number(booking.extras_amount || 0)) + Math.max(0, Number(booking.delivery_amount || 0));
      const { error: detachError } = await supabase.rpc("vacleaner_admin_detach_booking_promo", { p_booking_id: bookingId, p_extras: extras, p_base_amount: baseAmount, p_total_amount: totalAmount });
      if (detachError) throw detachError;
      const { data: saved, error: savedError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single(); if (savedError || !saved) throw savedError || new Error("update_failed");
      await tagAudit(supabase, bookingId, userData.user.id, "edge:detach_promo", actionStartedAt);
      return json({ booking: safeBooking(saved), detached: true });
    }

    if (action === "attach_promo") {
      const bookingId = String(body.bookingId || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const { data: booking, error: bookingError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).maybeSingle();
      if (bookingError) throw bookingError; if (!booking) return json({ error: "invalid_booking" }, 404);
      if (!["pending", "waiting_payment", "confirmed"].includes(String(booking.status || ""))) return json({ error: "invalid_transition" }, 409);
      const currentExtras = booking.extras && typeof booking.extras === "object" ? booking.extras : {};
      if (currentExtras?.promo) return json({ error: "booking_promo_already_attached" }, 409);
      const product = catalog.products?.[String(booking.product_code || "")]; if (!product) return json({ error: "invalid_product" }, 400);
      const rawBase = rentalBase(product, String(booking.start_date || ""), String(booking.return_date || ""), booking.pickup_window === "evening" ? "evening" : "morning", booking.return_window === "evening" ? "evening" : "morning");
      const promo = await resolvePhonePromo(supabase, { phone: booking.customer_phone, productCode: booking.product_code, startDate: booking.start_date, returnDate: booking.return_date, pickupWindow: booking.pickup_window, returnWindow: booking.return_window, rawBase, includeBlocked: false, excludeBookingId: bookingId });
      if (!promo?.promoCodeId || !promo?.campaignId) return json({ error: "promo_unavailable" }, 409);
      const pricingExtras = { ...currentExtras, promo: promoExtraFromCandidate(promo, true) };
      const discount = discountInfo({}, rawBase, pricingExtras);
      if (discount.source !== "promo" || discount.amount <= 0) return json({ error: "promo_not_best_discount" }, 409);
      const extras = { ...currentExtras, promo: promoExtraFromCandidate(promo, true), discount: { type: discount.type, percent: discount.percent, amount: discount.amount, source: discount.source, reason: "" }, base_before_discount: rawBase };
      const baseAmount = discount.baseAmount, totalAmount = baseAmount + Math.max(0, Number(booking.extras_amount || 0)) + Math.max(0, Number(booking.delivery_amount || 0));
      const { error: attachError } = await supabase.rpc("vacleaner_admin_attach_booking_promo", { p_booking_id: bookingId, p_promo_code_id: promo.promoCodeId, p_campaign_id: promo.campaignId, p_customer_phone: normalizePhone(booking.customer_phone), p_discount_amount: discount.amount, p_base_before_discount: rawBase, p_extras: extras, p_base_amount: baseAmount, p_total_amount: totalAmount });
      if (attachError) return json({ error: String(attachError.message || "promo_unavailable").includes("promo_") ? "promo_unavailable" : "service_error" }, 409);
      const { data: saved, error: savedError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single(); if (savedError || !saved) throw savedError || new Error("update_failed");
      await tagAudit(supabase, bookingId, userData.user.id, "edge:attach_promo", actionStartedAt);
      return json({ booking: safeBooking(saved), attached: true, promo: { ...promo, applied: true } });
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
      const currentExtras = existing?.extras && typeof existing.extras === "object" ? existing.extras : {};
      const autoPromo = action === "create" ? await resolvePhonePromo(supabase, { phone: customerPhone, productCode, startDate: period.startDate, returnDate: period.returnDate, pickupWindow: period.pickupWindow, returnWindow: period.returnWindow, rawBase, includeBlocked: false }) : null;
      const promoPricingExtras = autoPromo ? { ...currentExtras, promo: promoExtraFromCandidate(autoPromo, true) } : currentExtras;
      const discount = discountInfo(body, rawBase, promoPricingExtras), promoApplied = Boolean(autoPromo && discount.source === "promo"), selected = normalizeSelectedExtras(body.selectedExtras, productCode, catalog);
      const depositSnapshotLocked = Boolean(existing && (currentExtras?.processing?.confirmation_sent === true || ["waiting_payment", "confirmed", "issued", "completed"].includes(String(existing.status || ""))));
      const calculatedDeposit = calculateDeposit(productCode, period.startDate, period.returnDate, period.pickupWindow, period.returnWindow, depositRules, catalog);
      const depositAmount = depositSnapshotLocked ? Math.max(0, Number(existing?.deposit_amount || calculatedDeposit) || 0) : calculatedDeposit;
      const requestedDeliveryOverride = body.deliveryAmountOverride === undefined || body.deliveryAmountOverride === null || body.deliveryAmountOverride === "" ? null : cleanInt(body.deliveryAmountOverride, 100000);
      const autoDelivery = deliveryQuote(fulfillment, address, body.deliveryAddressVerified === true, body.deliveryDistanceKm, deliveryPricing);
      const preserveExistingDelivery = Boolean(existing?.fulfillment === "delivery" && Number(existing.delivery_amount) > 0 && requestedDeliveryOverride === null);
      const deliveryAmount = fulfillment === "delivery"
        ? requestedDeliveryOverride !== null ? requestedDeliveryOverride : preserveExistingDelivery ? Math.max(0, Number(existing.delivery_amount) || 0) : autoDelivery.amount
        : 0, prepaymentPaid = body.prepaymentPaid === true || existing?.prepayment_paid === true;
      const requestedProcessing = body.processing && typeof body.processing === "object" ? body.processing : null;
      const processing = requestedProcessing ? { contacted: requestedProcessing.contacted === true, confirmation_sent: requestedProcessing.confirmation_sent === true, documents_required: requestedProcessing.documents_required === true, identity_verified: requestedProcessing.identity_verified === true, customer_kind: ["new", "repeat", "known"].includes(String(requestedProcessing.customer_kind || "")) ? String(requestedProcessing.customer_kind) : "known", updated_at: new Date().toISOString() } : currentExtras?.processing;
      const selectedItems = selected.items;
      const selectedAmount = selected.amount;
      const extras = { ...currentExtras, pickup_time: period.pickupTime, return_time: period.returnTime, slot_config: slots, ...(processing ? { processing } : {}),
        discount: { type: discount.type, percent: discount.percent, amount: discount.amount, source: discount.source, reason: discount.source === "manual" ? discount.manualReason : "" },
        manual_discount: discount.manualType === "none" ? null : { type: discount.manualType, value: discount.manualValue, amount: discount.manualAmount, reason: discount.manualReason },
        loyalty: { level: String(body.loyaltyLevel || currentExtras?.loyalty?.level || (discount.loyaltyPercent === 10 ? "VIP" : discount.loyaltyPercent === 5 ? "Regular" : "Start")), percent: discount.loyaltyPercent, completed_orders: cleanInt(body.completedOrders ?? currentExtras?.loyalty?.completed_orders, 10000) },
        promo: promoApplied ? promoExtraFromCandidate(autoPromo, true) : (currentExtras?.promo || null),
        delivery: fulfillment === "delivery" ? { zone: requestedDeliveryOverride !== null ? "manual" : preserveExistingDelivery ? (currentExtras?.delivery?.zone || "snapshot") : autoDelivery.zone, quote_required: requestedDeliveryOverride !== null ? false : preserveExistingDelivery ? Boolean(currentExtras?.delivery?.quote_required) : autoDelivery.quoteRequired, verified: body.deliveryAddressVerified === true, settlement: autoDelivery.settlement, amount: deliveryAmount, pricing_distance_km: autoDelivery.distanceKm, extra_km: autoDelivery.extraKm, route_km: Number.isFinite(Number(body.deliveryRouteKm)) ? Number(body.deliveryRouteKm) : null, distance_source: cleanText(body.deliveryDistanceSource, 24) || null } : { zone: "pickup", quote_required: false, amount: 0 },
        base_before_discount: rawBase, selected_items: selectedItems, selected_items_amount: selectedAmount };
      const common: Record<string, any> = {
        product_code: productCode, product_label: product.label || productCode, start_date: period.startDate, return_date: period.returnDate,
        start_at: `${period.startDate}T${period.pickupTime}:00.000Z`, end_at: `${period.returnDate}T${period.returnTime}:00.000Z`, pickup_window: period.pickupWindow, return_window: period.returnWindow, rental_days: period.days,
        fulfillment, fulfillment_address: address, customer_name: customerName, customer_phone: customerPhone, customer_telegram: cleanText(body.customerTelegram, 80) || null, customer_comment: cleanText(body.customerComment, 800) || null,
        source: cleanText(body.source, 30) || "instagram", extras, base_amount: discount.baseAmount, extras_amount: selectedAmount, delivery_amount: deliveryAmount, total_amount: discount.baseAmount + selectedAmount + deliveryAmount,
        prepayment_amount: 200, prepayment_paid: prepaymentPaid, deposit_amount: depositAmount, admin_note: cleanAdminNote(body.adminNote, 800) || null, updated_at: new Date().toISOString(),
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
      await upsertCustomer(supabase, body, saved);
      if (action === "create" && promoApplied && autoPromo?.promoCodeId && autoPromo?.campaignId) {
        const { error: promoError } = await supabase.rpc("vacleaner_redeem_promo", { p_promo_code_id: autoPromo.promoCodeId, p_campaign_id: autoPromo.campaignId, p_booking_id: saved.id, p_customer_phone: customerPhone, p_discount_amount: discount.amount, p_base_before_discount: rawBase });
        if (promoError) {
          await supabase.from("vacleaner_booking_resources").delete().eq("booking_id", saved.id);
          await supabase.from("vacleaner_bookings").delete().eq("id", saved.id);
          return json({ error: "promo_unavailable" }, 409);
        }
      }
      await tagAudit(supabase, saved.id, userData.user.id, `edge:${action}`, actionStartedAt);
      if (action === "create") await notifyPeerAdmin(request, supabaseUrl, saved.id, "new", body);
      return json({ booking: safeBooking(saved), promo: autoPromo ? { ...autoPromo, applied: promoApplied } : null }, action === "create" ? 201 : 200);
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
      const now = new Date().toISOString(), patch: Record<string, any> = { status: nextStatus, admin_note: cleanAdminNote(body.adminNote, 800) || cleanAdminNote(current.admin_note, 800) || null, updated_at: now };
      if (nextStatus === "cancelled") {
        const currentExtras = current.extras && typeof current.extras === "object" ? current.extras : {};
        const startMs = new Date(current.start_at || `${current.start_date}T${current.pickup_window === "evening" ? slots.eveningStart : slots.morningStart}:00.000Z`).getTime();
        const hoursBefore = Number.isFinite(startMs) ? Math.max(0, (startMs - Date.now()) / 3600000) : 0;
        const refundable = current.prepayment_paid !== true || hoursBefore >= 72;
        patch.extras = { ...currentExtras, cancellation: { policy_days: 3, cancelled_at: now, hours_before_start: Math.round(hoursBefore * 10) / 10, prepayment_refundable: refundable, prepayment_retained: current.prepayment_paid === true && !refundable ? Math.max(0, Number(current.prepayment_amount || 200)) : 0 } };
      }
      if (nextStatus === "waiting_payment") patch.hold_expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      else patch.hold_expires_at = null;
      if (nextStatus === "confirmed") { patch.prepayment_paid = true; patch.prepayment_amount = 200; patch.prepayment_paid_at = current.prepayment_paid_at || now; patch.confirmed_at = current.confirmed_at || now; }
      if (nextStatus === "issued") patch.issued_at = current.issued_at || now;
      if (nextStatus === "completed") patch.completed_at = current.completed_at || now;
      const { data, error: updateError } = await supabase.from("vacleaner_bookings").update(patch).eq("id", bookingId).select("*").single(); if (updateError) throw updateError;
      await tagAudit(supabase, bookingId, userData.user.id, `edge:update`, actionStartedAt);
      if (nextStatus === "issued" || nextStatus === "completed") await notifyPeerAdmin(request, supabaseUrl, bookingId, nextStatus, body);
      return json({ booking: safeBooking(data) });
    }

    if (action === "save_finance") {
      const bookingId = String(body.bookingId || ""); if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const { data: current, error: currentError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single(); if (currentError || !current) return json({ error: "invalid_booking" }, 404);
      const packetLimit = productUsesPuzzi(String(current.product_code || ""), catalog, defaultCatalog) ? 8 : 0, usedPackets = cleanInt(body.usedPackets, packetLimit), storyMention = packetLimit > 0 && body.storyMention === true;
      const depositAmount = cleanInt(body.depositAmount ?? current.deposit_amount, 100000), depositPaid = body.depositPaid === true || current.deposit_paid === true;
      const currentExtras = current.extras && typeof current.extras === "object" ? current.extras : {};
      const rawBase = Math.max(0, Number(currentExtras.base_before_discount ?? (Number(current.base_amount || 0) + Number(currentExtras?.discount?.amount || 0))) || 0);
      const selectedItems = Array.isArray(currentExtras.selected_items) ? currentExtras.selected_items.map((item: any) => {
        const { opened: _opened, ...rest } = item || {};
        return { ...rest, payment_mode: "upfront" };
      }) : [];
      const discount = discountInfo(body, rawBase, currentExtras), discountedExtras = { ...currentExtras, selected_items: selectedItems,
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
      await tagAudit(supabase, bookingId, userData.user.id, "edge:save_deposit_return", actionStartedAt);
      if (current.status !== "completed") await notifyPeerAdmin(request, supabaseUrl, bookingId, "completed", body);
      return json({ booking: data, finance });
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
