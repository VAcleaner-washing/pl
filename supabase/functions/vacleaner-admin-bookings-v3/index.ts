import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import { DEFAULT_CATALOG, DEFAULT_DEPOSIT_RULES } from "./config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

const defaultDepositRules = structuredClone(DEFAULT_DEPOSIT_RULES);
const defaultCatalog: any = structuredClone(DEFAULT_CATALOG);
const cleanInt = (value: unknown, max = 100000) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};
const validBookingId = (value: unknown) => /^[0-9a-f-]{36}$/i.test(String(value ?? ""));
const dateValue = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

function depositGroup(productCode: string, catalog: any = defaultCatalog) {
  return catalog?.products?.[productCode]?.depositGroup || defaultCatalog.products[productCode as keyof typeof defaultCatalog.products]?.depositGroup || "oneUnit";
}
function rentalDays(startDate: string, returnDate: string, pickupWindow: string, returnWindow: string) {
  const start = Date.parse(`${startDate}T12:00:00Z`), finish = Date.parse(`${returnDate}T12:00:00Z`);
  const calendarDays = Math.round((finish - start) / 86400000);
  const pickupOrder = pickupWindow === "evening" ? 1 : 0, returnOrder = returnWindow === "evening" ? 1 : 0;
  return calendarDays === 0 ? (returnOrder > pickupOrder ? 1 : 0) : calendarDays + (returnOrder > pickupOrder ? 1 : 0);
}
function calculateBase(product: any, startDate: string, days: number) {
  if (days === 2 && new Date(`${startDate}T12:00:00Z`).getUTCDay() === 6 && product?.saturdaySunday) return Number(product.saturdaySunday);
  let total = 0;
  for (let index = 0; index < days; index += 1) {
    const day = new Date(Date.parse(`${startDate}T12:00:00Z`) + index * 86400000).getUTCDay();
    total += Number(day === 0 || day === 6 ? product?.weekend : product?.weekday) || 0;
  }
  return total;
}
function includesFullWeekend(startDate: string, returnDate: string) {
  if (!startDate || !returnDate) return false;
  let cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${returnDate}T12:00:00Z`);
  let saturday = false, sunday = false;
  for (let guard = 0; cursor <= end && guard < 32; guard += 1) {
    const d = cursor.getUTCDay();
    if (d === 6) saturday = true;
    if (d === 0) sunday = true;
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return saturday && sunday;
}
function normalizeDepositRules(value: any) {
  const out = structuredClone(defaultDepositRules);
  if (!value || typeof value !== "object") return out;
  for (const key of Object.keys(out) as Array<keyof typeof out>) {
    const day = cleanInt(value?.[key]?.day, 100000);
    const weekend = cleanInt(value?.[key]?.weekend, 100000);
    if (day > 0) out[key].day = day;
    if (weekend > 0) out[key].weekend = weekend;
  }
  return out;
}
function calculateDeposit(productCode: string, startDate: string, returnDate: string, rules: typeof defaultDepositRules, catalog: any = defaultCatalog) {
  const group = depositGroup(productCode, catalog) as keyof typeof rules;
  return rules[group][includesFullWeekend(startDate, returnDate) ? "weekend" : "day"];
}
async function tagAudit(supabase: ReturnType<typeof createClient>, bookingId: string, actorId: string, source: string, since: string) {
  if (!validBookingId(bookingId)) return;
  const { error } = await supabase.from("vacleaner_booking_audit").update({ actor_id: actorId, source })
    .eq("booking_id", bookingId).is("actor_id", null).gte("created_at", since);
  if (error) console.warn("audit_tag_failed", error.message);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (!admin) return json({ error: "forbidden" }, 403);

    const incoming = await request.json() as Record<string, any>;
    const body: Record<string, any> = { ...incoming };
    const action = String(body.action ?? "");
    const actionStartedAt = new Date(Date.now() - 1500).toISOString();

    const { data: settingsRows } = await supabase.from("vacleaner_settings").select("key,value").in("key", ["deposit_rules", "catalog"]);
    const settingsMap = Object.fromEntries((settingsRows ?? []).map((row: any) => [row.key, row.value]));
    const depositRules = normalizeDepositRules(settingsMap.deposit_rules);
    const catalog = settingsMap.catalog && typeof settingsMap.catalog === "object" ? settingsMap.catalog : defaultCatalog;

    if (["create", "edit"].includes(action)) {
      const productCode = String(body.productCode ?? "");
      const startDate = dateValue(body.startDate);
      const returnDate = dateValue(body.returnDate);
      if (productCode && startDate && returnDate) body.depositAmount = calculateDeposit(productCode, startDate, returnDate, depositRules, catalog);
    }

    if (action === "audit_log") {
      const bookingId = String(body.bookingId ?? "");
      if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const limit = Math.max(1, Math.min(100, cleanInt(body.limit, 100) || 60));
      const { data, error } = await supabase.from("vacleaner_booking_audit")
        .select("id,booking_id,booking_code,event_type,changed_fields,old_values,new_values,actor_id,source,created_at")
        .eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return json({ entries: data ?? [] });
    }

    if (action === "save_finance") {
      const bookingId = String(body.bookingId ?? "");
      if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const usedPackets = cleanInt(body.usedPackets, 100);
      const storyMention = body.storyMention === true;
      const issuePayment = cleanInt(body.issuePayment, 100000);
      const issuePaid = body.issuePaid === true || issuePayment > 0;
      const freePackets = storyMention ? 2 : 0;
      const paidPackets = Math.max(0, usedPackets - freePackets);
      const chemistryAmount = paidPackets * 50;
      const { data: current, error: currentError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single();
      if (currentError || !current) return json({ error: "invalid_booking" }, 404);
      const depositPaid = body.depositPaid === true || current.deposit_paid === true;
      const currentExtras = current.extras && typeof current.extras === "object" ? current.extras as Record<string, any> : {};
      const selectedAmount = Array.isArray(currentExtras.selected_items)
        ? currentExtras.selected_items.reduce((sum: number, item: Record<string, any>) => sum + Number(item.price || 0), 0)
        : 0;
      const extras = {
        ...currentExtras,
        chemistry: {
          used_packets: usedPackets,
          story_mention: storyMention,
          free_packets: freePackets,
          paid_packets: paidPackets,
          price_per_packet: 50,
          amount: chemistryAmount,
        },
      };
      const totalExtras = selectedAmount + chemistryAmount;
      const totalAmount = Number(current.base_amount || 0) + Number(current.delivery_amount || 0) + totalExtras;
      const receivedAmount = Number(current.prepayment_paid ? current.prepayment_amount || 200 : 0) + (issuePaid ? issuePayment : 0);
      const balance = receivedAmount - totalAmount;
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("vacleaner_bookings").update({
        extras,
        extras_amount: totalExtras,
        total_amount: totalAmount,
        issue_payment_amount: issuePayment,
        issue_payment_paid: issuePaid,
        issue_payment_paid_at: issuePaid ? (current.issue_payment_paid_at || now) : null,
        deposit_paid: depositPaid,
        deposit_paid_at: depositPaid ? (current.deposit_paid_at || now) : null,
        updated_at: now,
      }).eq("id", bookingId).select("*").single();
      if (error) throw error;
      await tagAudit(supabase, bookingId, userData.user.id, "edge:save_finance", actionStartedAt);
      return json({
        booking: data,
        finance: {
          usedPackets,
          storyMention,
          freePackets,
          paidPackets,
          chemistryAmount,
          selectedExtrasAmount: selectedAmount,
          issuePayment,
          issuePaid,
          securityDeposit: Number(current.deposit_amount || 0),
          depositPaid,
          receivedAmount,
          totalAmount,
          refundAmount: Math.max(0, balance),
          dueAmount: Math.max(0, -balance),
        },
      });
    }

    if (action === "save_deposit_return") {
      const bookingId = String(body.bookingId ?? "");
      if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
      const returned = body.returned === true;
      const { data: current, error: currentError } = await supabase.from("vacleaner_bookings").select("deposit_paid").eq("id", bookingId).single();
      if (currentError || !current) return json({ error: "invalid_booking" }, 404);
      if (returned && current.deposit_paid !== true) return json({ error: "deposit_not_received" }, 409);
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("vacleaner_bookings").update({
        deposit_returned: returned,
        deposit_returned_at: returned ? now : null,
        updated_at: now,
      }).eq("id", bookingId).select("*").single();
      if (error) throw error;
      await tagAudit(supabase, bookingId, userData.user.id, "edge:save_deposit_return", actionStartedAt);
      return json({ booking: data });
    }

    const upstream = await fetch(`${supabaseUrl}/functions/v1/vacleaner-admin-bookings-v2`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
        "x-client-info": request.headers.get("x-client-info") ?? "vacleaner-admin-v3.0",
      },
      body: JSON.stringify(body),
    });
    const payload = await upstream.json().catch(() => ({ error: "invalid_upstream_response" })) as Record<string, any>;
    if (!upstream.ok) return json(payload, upstream.status);

    if (action === "lookup_customer") {
      const phone = normalizePhone(body.phone);
      if (phone) {
        const { data: profile } = await supabase.from("vacleaner_customers").select("phone,name,telegram,address,document_type,document_number,document_verified_at,updated_at").eq("phone", phone).maybeSingle();
        if (profile) {
          payload.customer = {
            ...(payload.customer || {}),
            phone,
            name: profile.name || payload.customer?.name || "",
            telegram: profile.telegram || payload.customer?.telegram || "",
            address: profile.address || payload.customer?.address || "",
            documentType: profile.document_type || "",
            documentNumber: profile.document_number || "",
            documentVerifiedAt: profile.document_verified_at || null,
            hasDocument: Boolean(profile.document_number),
            isRepeatCustomer: Number(payload.customer?.completedOrders || 0) > 0,
            documentsRequired: !profile.document_number && Number(payload.customer?.completedOrders || 0) === 0,
          };
        } else if (payload.customer) {
          const isRepeatCustomer = Number(payload.customer.completedOrders || 0) > 0;
          payload.customer = { ...payload.customer, hasDocument: false, isRepeatCustomer, documentsRequired: !isRepeatCustomer };
        }
      }
      return json(payload, upstream.status);
    }

    if (["create", "edit"].includes(action) && payload.booking && typeof payload.booking === "object") {
      const booking = payload.booking as Record<string, any>;
      const bookingId = String(booking.id ?? body.bookingId ?? "");
      const productCode = String(body.productCode ?? booking.product_code ?? "");
      const startDate = dateValue(body.startDate ?? booking.start_date);
      const returnDate = dateValue(body.returnDate ?? booking.return_date);
      const depositAmount = productCode && startDate && returnDate
        ? calculateDeposit(productCode, startDate, returnDate, depositRules, catalog)
        : Number(booking.deposit_amount || 0);
      if (validBookingId(bookingId)) {
        const prepaymentPaid = body.prepaymentPaid === true;
        const product = catalog?.products?.[productCode] || defaultCatalog.products[productCode as keyof typeof defaultCatalog.products];
        const days = rentalDays(startDate, returnDate, String(body.pickupWindow ?? booking.pickup_window ?? "morning"), String(body.returnWindow ?? booking.return_window ?? "morning"));
        const baseAmount = product && days > 0 ? calculateBase(product, startDate, days) : Number(booking.base_amount || 0);
        const extrasAmount = Number(booking.extras_amount || 0), deliveryAmount = Number(booking.delivery_amount || 0);
        const { data, error } = await supabase.from("vacleaner_bookings").update({
          product_label: product?.label || booking.product_label,
          base_amount: baseAmount,
          total_amount: baseAmount + extrasAmount + deliveryAmount,
          prepayment_paid: prepaymentPaid,
          prepayment_amount: 200,
          deposit_amount: depositAmount,
          updated_at: new Date().toISOString(),
        }).eq("id", bookingId).select("*").single();
        if (error) throw error;
        payload.booking = { ...booking, ...data };
      }

      if (validBookingId(bookingId)) await tagAudit(supabase, bookingId, userData.user.id, `edge:${action}`, actionStartedAt);

      const phone = normalizePhone(body.customerPhone ?? booking.customer_phone);
      if (phone) {
        const customer: Record<string, any> = {
          phone,
          name: cleanText(body.customerName ?? booking.customer_name, 120),
          telegram: cleanText(body.customerTelegram ?? booking.customer_telegram, 80) || null,
          updated_at: new Date().toISOString(),
        };
        const customerAddress = cleanText(body.customerAddress, 220);
        if (customerAddress) customer.address = customerAddress;
        const documentNumber = cleanText(body.documentNumber, 80);
        const documentType = cleanText(body.documentType, 40);
        if (documentNumber) {
          customer.document_number = documentNumber;
          customer.document_type = ["Паспорт", "ID-картка", "Водійське посвідчення"].includes(documentType) ? documentType : "Паспорт";
          customer.document_updated_at = new Date().toISOString();
          if (body.identityVerified === true) customer.document_verified_at = new Date().toISOString();
        }
        const { error } = await supabase.from("vacleaner_customers").upsert(customer, { onConflict: "phone" });
        if (error) throw error;
      }
    }

    if (!["list", "calendar", "lookup_customer", "create", "edit"].includes(action)) {
      const upstreamBookingId = String(payload.booking?.id ?? body.bookingId ?? "");
      if (validBookingId(upstreamBookingId)) await tagAudit(supabase, upstreamBookingId, userData.user.id, `edge:${action}`, actionStartedAt);
    }
    return json(payload, upstream.status);
  } catch (error) {
    console.error("vacleaner-admin-bookings-v3", error instanceof Error ? error.message : error);
    return json({ error: "service_error" }, 500);
  }
});
