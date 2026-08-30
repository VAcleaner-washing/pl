import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import webpush from "npm:web-push@3.6.7";
import { DateTime } from "npm:luxon@3.7.1";

const ZONE = "Europe/Kyiv";
const ADMIN_PRODUCT_LABELS: Record<string,string> = {
  puzzi: "Kärcher Puzzi", puzzi_jimmy: "Puzzi + Jimmy", puzzi_abir: "Puzzi + робот", sc2: "Kärcher SC 2", abir: "Робот ABIR", combo: "Puzzi + SC 2", general: "Puzzi + SC 2 + Jimmy", ideal_windows: "SC 2 + робот", elite: "HOME RESET",
};
const adminProductLabel = (code: unknown, fallback: unknown) => ADMIN_PRODUCT_LABELS[String(code ?? "")] || String(fallback ?? "Техніка").trim() || "Техніка";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
const compactProductLabel = (value: unknown) => String(value ?? "Техніка").replace(/^Kärcher\s+/i, "").replace(/^Karcher\s+/i, "").trim() || "Техніка";
const shortDate = (value: unknown) => { const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}` : String(value ?? ""); };
const money = (value: unknown) => new Intl.NumberFormat("uk-UA").format(Math.max(0, Number(value || 0)));
const exactTime = (booking: any, kind: "pickup" | "return", slots: any) => {
  const extras = booking?.extras && typeof booking.extras === "object" ? booking.extras : {};
  const exact = String(extras?.[kind === "pickup" ? "pickup_time" : "return_time"] || "").match(/^\d{2}:\d{2}$/)?.[0];
  if (exact) return exact;
  const raw = String(kind === "pickup" ? booking?.start_at || "" : booking?.end_at || "");
  const timestampTime = raw.match(/[T\s](\d{2}):(\d{2})/)?.slice(1, 3).join(":");
  if (timestampTime) return timestampTime;
  const windowName = kind === "pickup" ? booking?.pickup_window : booking?.return_window;
  if (kind === "pickup") return windowName === "evening" ? String(slots?.eveningStart || "17:30") : String(slots?.morningStart || "08:00");
  return windowName === "evening" ? String(slots?.eveningEnd || "20:00") : String(slots?.morningEnd || "10:00");
};
async function sendToManagers(db: any, payload: Record<string, unknown>, ttl = 3600) {
  const [{ data: config }, { data: subs }] = await Promise.all([
    db.from("vacleaner_push_config").select("vapid_public_key,vapid_private_key").eq("singleton", true).maybeSingle(),
    db.from("vacleaner_push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("active", true),
  ]);
  if (!config || !subs?.length) return { delivered: 0, attempted: 0 };
  webpush.setVapidDetails("https://vacleaner.pp.ua", config.vapid_public_key, config.vapid_private_key);
  let delivered = 0;
  await Promise.allSettled(subs.map(async (sub: any) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify(payload), { TTL: ttl, urgency: "high" });
      delivered += 1;
      await db.from("vacleaner_push_subscriptions").update({ active: true, last_success_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", sub.id);
    } catch (error) {
      const code = Number((error as any)?.statusCode || 0);
      await db.from("vacleaner_push_subscriptions").update({ active: code !== 404 && code !== 410, last_failure_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", sub.id);
    }
  }));
  return { delivered, attempted: subs.length };
}
async function sendClaimedToManagers(db: any, eventKey: string, bookingId: string, eventType: string, payload: Record<string, unknown>, ttl = 3600) {
  const { data: claimed, error: claimError } = await db.rpc("vacleaner_claim_notification_dispatch", { p_event_key: eventKey, p_booking_id: bookingId, p_event_type: eventType, p_lease_seconds: 120 });
  if (claimError) throw claimError;
  if (claimed !== true) {
    const { data: prior } = await db.from("vacleaner_notification_dispatch_claims").select("delivered_at").eq("event_key", eventKey).maybeSingle();
    return { delivered: 0, attempted: 0, alreadyDelivered: Boolean(prior?.delivered_at) };
  }
  let result = { delivered: 0, attempted: 0 };
  try { result = await sendToManagers(db, payload, ttl); }
  finally { await db.rpc("vacleaner_finish_notification_dispatch", { p_event_key: eventKey, p_delivered: result.delivered > 0 }); }
  return { ...result, alreadyDelivered: false };
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "service_unavailable" }, 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: cronSecret } = await db.from("vacleaner_settings").select("value").eq("key", "push_reminder_cron_secret").maybeSingle();
    const expectedCronKey = String(cronSecret?.value?.token || ""), suppliedCronKey = request.headers.get("x-vacleaner-cron") || "";
    if (!expectedCronKey || suppliedCronKey !== expectedCronKey) return json({ error: "unauthorized" }, 401);
    const body = await request.json().catch(() => ({}));
    if (body?.action !== "process") return json({ error: "invalid_action" }, 400);
    const now = DateTime.now().setZone(ZONE), today = now.toISODate();
    const [{ data: settingsRows }, { data: bookings, error: bookingError }, { data: stateRow }] = await Promise.all([
      db.from("vacleaner_settings").select("key,value").in("key", ["booking_slots"]),
      db.from("vacleaner_bookings").select("id,status,product_code,product_label,customer_name,start_date,return_date,pickup_window,return_window,start_at,end_at,created_at,extras,total_amount,prepayment_amount,prepayment_paid,deposit_amount,fulfillment").in("status", ["pending", "confirmed", "issued"]).order("start_date", { ascending: true }).limit(250),
      db.from("vacleaner_settings").select("value").eq("key", "push_reminder_state").maybeSingle(),
    ]);
    if (bookingError) throw bookingError;
    const settings = Object.fromEntries((settingsRows || []).map((row: any) => [row.key, row.value])), slots = settings.booking_slots || {};
    const state = stateRow?.value && typeof stateRow.value === "object" ? structuredClone(stateRow.value) : { bookings: {} };
    if (!state.bookings || typeof state.bookings !== "object") state.bookings = {};
    const sent: any[] = [];
    for (const booking of bookings || []) {
      const entry = state.bookings[booking.id] && typeof state.bookings[booking.id] === "object" ? state.bookings[booking.id] : {};
      if (booking.status === "pending" && !entry.newBooking) {
        const created = DateTime.fromISO(String((booking as any).created_at || ""), { zone: "utc" }).setZone(ZONE);
        if (created.isValid && now.diff(created, "minutes").minutes >= 0 && now.diff(created, "minutes").minutes <= 120) {
          const pickupTime = exactTime(booking, "pickup", slots), returnTime = exactTime(booking, "return", slots);
          const result = await sendClaimedToManagers(db, `public:new:${booking.id}`, booking.id, "new_booking", { title: `Нове бронювання · ${adminProductLabel(booking.product_code, booking.product_label)}`, body: `${booking.customer_name || "Клієнт"}\n${shortDate(booking.start_date)} ${pickupTime} → ${shortDate(booking.return_date)} ${returnTime} · ${money(booking.total_amount)} грн\nПотрібне підтвердження`, tag: `new-${booking.id}`, data: { url: `/admin/bronuvannia/?booking=${booking.id}`, bookingId: booking.id, event: "new_booking" } }, 7200);
          if (result.delivered > 0 || result.alreadyDelivered) { entry.newBooking = (booking as any).created_at || now.toISO(); if (result.delivered > 0) sent.push({ bookingId: booking.id, type: "new", delivered: result.delivered }); }
        }
      }
      if (booking.status === "confirmed") {
        const pickupTime = exactTime(booking, "pickup", slots), pickup = DateTime.fromISO(`${booking.start_date}T${pickupTime}`, { zone: ZONE }), reminderAt = pickup.minus({ hours: 1 });
        if (pickup.isValid && now >= reminderAt && now < pickup && entry.issue !== booking.start_date) {
          const deposit = Math.max(0, Number(booking.deposit_amount || 0));
          const delivery = booking.fulfillment === "delivery" ? "Доставка" : "Самовивіз";
          const depositText = deposit > 0 ? `Залоговий платіж ${money(deposit)} грн` : "Перевірити залоговий платіж";
          const result = await sendClaimedToManagers(db, `reminder:issue:${booking.id}:${booking.start_date}`, booking.id, "pickup_reminder", { title: `Видача через 1 год · ${adminProductLabel(booking.product_code, booking.product_label)}`, body: `${booking.customer_name || "Клієнт"} · ${shortDate(booking.start_date)} ${pickupTime}\n${delivery} · ${depositText}`, tag: `issue-${booking.id}-${booking.start_date}`, data: { url: `/admin/bronuvannia/?booking=${booking.id}`, bookingId: booking.id, event: "pickup_reminder" } }, 5400);
          if (result.delivered > 0 || result.alreadyDelivered) { entry.issue = booking.start_date; if (result.delivered > 0) sent.push({ bookingId: booking.id, type: "issue", delivered: result.delivered }); }
        }
      }
      if (booking.status === "issued" && booking.return_date === today && now.hour >= 7 && entry.returnDay !== booking.return_date) {
        const returnTime = exactTime(booking, "return", slots);
        const result = await sendClaimedToManagers(db, `reminder:return:${booking.id}:${booking.return_date}`, booking.id, "return_today", { title: `Повернення сьогодні · ${adminProductLabel(booking.product_code, booking.product_label)}`, body: `${booking.customer_name || "Клієнт"} · ${shortDate(booking.return_date)} ${returnTime}\nПеревірити хімію та фінальний розрахунок`, tag: `return-${booking.id}-${booking.return_date}`, data: { url: `/admin/bronuvannia/?booking=${booking.id}`, bookingId: booking.id, event: "return_today" } }, 21600);
        if (result.delivered > 0 || result.alreadyDelivered) { entry.returnDay = booking.return_date; if (result.delivered > 0) sent.push({ bookingId: booking.id, type: "return", delivered: result.delivered }); }
      }
      state.bookings[booking.id] = entry;
    }
    const activeBookingIds = new Set((bookings || []).map((row: any) => String(row.id)));
    for (const bookingId of Object.keys(state.bookings)) if (!activeBookingIds.has(bookingId)) delete state.bookings[bookingId];
    state.lastRunAt = now.toISO();
    const { error: stateError } = await db.from("vacleaner_settings").upsert({ key: "push_reminder_state", value: state, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (stateError) throw stateError;
    return json({ ok: true, now: now.toISO(), sent });
  } catch (error) {
    console.error("vacleaner-reminders-v1", error instanceof Error ? error.message : error);
    return json({ error: "service_error" }, 500);
  }
});
