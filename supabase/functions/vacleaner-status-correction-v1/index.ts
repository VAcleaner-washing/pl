import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});
const validBookingId = (value: unknown) => /^[0-9a-f-]{36}$/i.test(String(value ?? ""));
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const startedAt = new Date(Date.now() - 1500).toISOString();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL"), serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (!admin) return json({ error: "forbidden" }, 403);

    const body = await request.json() as Record<string, any>;
    const bookingId = String(body.bookingId || ""), nextStatus = String(body.status || ""), reason = cleanText(body.reason, 240);
    if (!validBookingId(bookingId)) return json({ error: "invalid_booking" }, 400);
    if (!["pending", "waiting_payment", "confirmed", "issued"].includes(nextStatus)) return json({ error: "invalid_target_status" }, 400);

    const { data: current, error } = await supabase.from("vacleaner_bookings")
      .select("*,vacleaner_booking_resources(resource_code,quantity)").eq("id", bookingId).single();
    if (error || !current) return json({ error: "invalid_booking" }, 404);
    const currentStatus = String(current.status || "");
    const allowed: Record<string, string[]> = {
      waiting_payment: ["pending", "confirmed"],
      confirmed: ["pending", "waiting_payment", "issued"],
      issued: ["confirmed"],
      completed: ["issued"],
      cancelled: ["pending", "waiting_payment", "confirmed"],
    };
    if (!allowed[currentStatus]?.includes(nextStatus)) return json({ error: "invalid_transition" }, 409);
    if (nextStatus === "confirmed" && current.prepayment_paid !== true) return json({ error: "prepayment_required" }, 409);
    if (nextStatus === "issued" && (current.prepayment_paid !== true || current.deposit_paid !== true)) return json({ error: "issue_payment_required" }, 409);
    if (["pending", "waiting_payment"].includes(nextStatus) && current.deposit_paid === true) return json({ error: "deposit_already_received" }, 409);

    const resources = (current.vacleaner_booking_resources || []).map((row: any) => ({ resource_code: String(row.resource_code || ""), quantity: Number(row.quantity || 0) })).filter((row: any) => row.resource_code && row.quantity > 0);
    if (!resources.length) return json({ error: "inventory_missing" }, 409);
    const hold = nextStatus === "waiting_payment" ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null;
    const { error: reservationError } = await supabase.rpc("vacleaner_apply_reservation", {
      p_booking_id: bookingId,
      p_start_date: current.start_date,
      p_return_date: current.return_date,
      p_pickup_window: current.pickup_window || "morning",
      p_return_window: current.return_window || "evening",
      p_start_at: current.start_at,
      p_end_at: current.end_at,
      p_rental_days: Number(current.rental_days || 1),
      p_resources: resources,
      p_target_status: nextStatus,
      p_hold_expires_at: hold,
    });
    if (reservationError) {
      if (String(reservationError.message || "").includes("inventory_conflict")) return json({ error: "inventory_conflict" }, 409);
      throw reservationError;
    }

    const now = new Date().toISOString(), currentExtras = current.extras && typeof current.extras === "object" ? current.extras : {};
    const patch: Record<string, any> = { updated_at: now };
    if (["pending", "waiting_payment"].includes(nextStatus)) { patch.confirmed_at = null; patch.issued_at = null; patch.completed_at = null; }
    if (currentStatus === "confirmed" && ["pending", "waiting_payment"].includes(nextStatus)) { patch.prepayment_paid = false; patch.prepayment_paid_at = null; }
    if (nextStatus === "confirmed") { patch.confirmed_at = current.confirmed_at || now; patch.issued_at = null; patch.completed_at = null; }
    if (nextStatus === "issued") { patch.issued_at = current.issued_at || now; patch.completed_at = null; }
    if (currentStatus === "issued" && nextStatus === "confirmed") {
      patch.deposit_paid = false; patch.deposit_paid_at = null; patch.deposit_returned = false; patch.deposit_returned_at = null;
    }
    if (currentStatus === "completed" && nextStatus === "issued") {
      const settlement = currentExtras.settlement && typeof currentExtras.settlement === "object" ? currentExtras.settlement : {};
      patch.extras = { ...currentExtras, settlement: { ...settlement, completed: false, completed_at: null, refund_paid: false, due_paid: false, corrected_from_completed: true } };
      patch.deposit_returned = false; patch.deposit_returned_at = null; patch.return_payment_paid = false; patch.return_payment_paid_at = null;
    }
    if (reason) patch.admin_note = [String(current.admin_note || "").trim(), `Корекція статусу: ${reason}`].filter(Boolean).join("\n").slice(0, 800);
    const { data, error: updateError } = await supabase.from("vacleaner_bookings").update(patch).eq("id", bookingId).select("*").single();
    if (updateError || !data) throw updateError || new Error("update_failed");

    await supabase.from("vacleaner_booking_audit").update({ actor_id: userData.user.id, source: `edge:correct_status:${currentStatus}_to_${nextStatus}` })
      .eq("booking_id", bookingId).is("actor_id", null).gte("created_at", startedAt);
    return json({ booking: data });
  } catch (error) {
    console.error("vacleaner_status_correction", error);
    return json({ error: "server_error" }, 500);
  }
});
