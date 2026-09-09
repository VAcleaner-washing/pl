import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};
const validBookingId = (value: unknown) => /^[0-9a-f-]{36}$/i.test(String(value ?? ""));

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ error: "unauthorized" }, 401);

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: admin, error: adminError } = await db.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (adminError) throw adminError;
    if (!admin) return json({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => ({})) as Record<string, any>;
    if (String(body.action || "") !== "confirm_without_prepayment") return json({ error: "invalid_action" }, 400);

    const bookingId = validBookingId(body.bookingId) ? String(body.bookingId) : "";
    const bookingCode = cleanText(body.bookingCode, 40);
    if (!bookingId && !bookingCode) return json({ error: "invalid_booking" }, 400);

    let query = db.from("vacleaner_bookings").select("*,vacleaner_booking_resources(resource_code,quantity)");
    query = bookingId ? query.eq("id", bookingId) : query.eq("booking_code", bookingCode);
    const { data: booking, error: bookingError } = await query.maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return json({ error: "invalid_booking" }, 404);

    const currentExtras = booking.extras && typeof booking.extras === "object" ? booking.extras : {};
    if (booking.status === "confirmed" && currentExtras?.prepayment_waiver?.active === true) {
      return json({ booking, prepaymentWaiver: true, alreadyApplied: true });
    }
    if (!["pending", "waiting_payment"].includes(String(booking.status || ""))) return json({ error: "invalid_transition" }, 409);

    const contacted = body.contacted === true;
    const confirmationSent = body.confirmationSent === true;
    const documentsRequired = body.documentsRequired === true;
    const identityVerified = body.identityVerified === true;
    const documentNumber = cleanText(body.documentNumber, 80);
    if (!contacted) return json({ error: "contact_required" }, 409);
    if (!confirmationSent) return json({ error: "confirmation_required" }, 409);
    if (documentsRequired && !identityVerified) return json({ error: "identity_required" }, 409);
    if (documentsRequired && documentNumber.length < 4) return json({ error: "document_required" }, 409);

    const customerName = cleanText(body.customerName ?? booking.customer_name, 120);
    const customerPhone = normalizePhone(body.customerPhone ?? booking.customer_phone);
    if (customerName.length < 2 || !customerPhone) return json({ error: "invalid_customer_data" }, 400);

    const now = new Date().toISOString();
    const customerKind = ["new", "repeat", "known"].includes(String(body.customerKind || "")) ? String(body.customerKind) : (documentsRequired ? "new" : "known");
    const processing = {
      contacted: true,
      confirmation_sent: true,
      documents_required: documentsRequired,
      identity_verified: identityVerified,
      customer_kind: customerKind,
      updated_at: now,
    };
    const waiver = {
      active: true,
      reason: "same_day_or_agreement",
      label: "Без передоплати · день у день / за домовленістю",
      waived_at: now,
      waived_by: userData.user.id,
    };
    const extras = { ...currentExtras, processing, prepayment_waiver: waiver };

    const { data: confirmed, error: confirmError } = await db.rpc("vacleaner_confirm_without_prepayment_v1", {
      p_booking_id: booking.id,
      p_extras: extras,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
    });
    if (confirmError) {
      const message = String(confirmError.message || "");
      if (message.includes("inventory_conflict")) return json({ error: "inventory_conflict" }, 409);
      if (message.includes("invalid_transition")) return json({ error: "invalid_transition" }, 409);
      throw confirmError;
    }

    const customer: Record<string, any> = {
      phone: customerPhone,
      name: customerName,
      telegram: cleanText(booking.customer_telegram, 80) || null,
      instagram: cleanText(booking.customer_instagram, 80).replace(/^@/, "") || null,
      preferred_contact: ["phone", "telegram", "instagram"].includes(String(booking.preferred_contact || "")) ? String(booking.preferred_contact) : "phone",
      updated_at: now,
    };
    const customerAddress = cleanText(body.customerAddress, 220);
    if (customerAddress) customer.address = customerAddress;
    const documentType = cleanText(body.documentType, 40);
    if (documentNumber) {
      customer.document_number = documentNumber;
      customer.document_type = ["Паспорт", "ID-картка", "Водійське посвідчення"].includes(documentType) ? documentType : "Паспорт";
      customer.document_updated_at = now;
      if (identityVerified) customer.document_verified_at = now;
    }
    const { error: customerError } = await db.from("vacleaner_customers").upsert(customer, { onConflict: "phone" });
    if (customerError) console.warn("prepayment_waiver_customer_sync_failed", customerError.message);

    await db.from("vacleaner_booking_audit").update({ actor_id: userData.user.id, source: "edge:prepayment_waiver" })
      .eq("booking_id", booking.id).is("actor_id", null).gte("created_at", new Date(Date.now() - 5000).toISOString());

    return json({ booking: confirmed, prepaymentWaiver: true });
  } catch (error) {
    console.error("vacleaner-prepayment-waiver-v1", error instanceof Error ? error.message : error);
    return json({ error: "service_error" }, 500);
  }
});
