import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import webpush from "npm:web-push@3.6.7";

const MAX_ACTIVE_DEVICES = 2;
const ADMIN_PRODUCT_LABELS: Record<string,string> = {
  puzzi: "Kärcher Puzzi", puzzi_jimmy: "Puzzi + Jimmy", puzzi_abir: "Puzzi + робот", sc2: "Kärcher SC 2", abir: "Робот ABIR", combo: "Puzzi + SC 2", general: "Puzzi + SC 2 + Jimmy", ideal_windows: "SC 2 + робот", elite: "HOME RESET",
};
const adminProductLabel = (code: unknown, fallback: unknown) => ADMIN_PRODUCT_LABELS[String(code ?? "")] || String(fallback ?? "Техніка").trim() || "Техніка";
const ADMIN_ALIASES = new Set(["vacleaner", "annanevidoma"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
const cleanAdminAlias = (value: unknown) => {
  const alias = cleanText(value, 40).toLowerCase();
  return ADMIN_ALIASES.has(alias) ? alias : "";
};
const validBookingId = (value: unknown) => /^[0-9a-f-]{36}$/i.test(String(value ?? ""));
const adminName = (alias: string) => alias === "annanevidoma" ? "Анна" : alias === "vacleaner" ? "Вадим" : "Адміністратор";
const shortDate = (value: unknown) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}` : "дату не вказано";
};
const bookingTime = (booking: Record<string, any>, kind: "pickup" | "return") => {
  const extras = booking.extras && typeof booking.extras === "object" ? booking.extras : {};
  const direct = cleanText(extras[kind === "pickup" ? "pickup_time" : "return_time"], 5);
  if (/^\d{2}:\d{2}$/.test(direct)) return direct;
  const window = String(booking[kind === "pickup" ? "pickup_window" : "return_window"] || "");
  return window === "morning" ? (kind === "pickup" ? "08:00" : "10:00") : (kind === "pickup" ? "17:30" : "20:00");
};

const ensureConfig = async (supabase: ReturnType<typeof createClient>) => {
  const { data: existing, error } = await supabase.from("vacleaner_push_config")
    .select("vapid_public_key,vapid_private_key").eq("singleton", true).maybeSingle();
  if (error) throw error;
  if (existing) return existing;
  const generated = webpush.generateVAPIDKeys();
  const { data, error: insertError } = await supabase.from("vacleaner_push_config")
    .insert({ singleton: true, vapid_public_key: generated.publicKey, vapid_private_key: generated.privateKey })
    .select("vapid_public_key,vapid_private_key").single();
  if (insertError) {
    const { data: concurrent, error: concurrentError } = await supabase.from("vacleaner_push_config")
      .select("vapid_public_key,vapid_private_key").eq("singleton", true).single();
    if (concurrentError) throw insertError;
    return concurrent;
  }
  return data;
};

const deviceList = async (supabase: ReturnType<typeof createClient>, userId: string, currentEndpoint = "") => {
  const { data, error } = await supabase.from("vacleaner_push_subscriptions")
    .select("id,endpoint,device_id,device_label,admin_alias,user_agent,last_success_at,last_failure_at,created_at,updated_at")
    .eq("user_id", userId).eq("active", true).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    label: row.device_label || "iPhone",
    adminAlias: cleanAdminAlias(row.admin_alias) || null,
    current: Boolean(currentEndpoint && row.endpoint === currentEndpoint),
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    updatedAt: row.updated_at,
    platform: /iPhone|iPad|iPod/i.test(String(row.user_agent || "")) ? "iPhone" : "Пристрій",
  }));
};

const capActiveDevices = async (supabase: ReturnType<typeof createClient>, userId: string, currentEndpoint: string) => {
  const { data: rows, error } = await supabase.from("vacleaner_push_subscriptions")
    .select("id,endpoint,updated_at,created_at").eq("user_id", userId).eq("active", true)
    .order("updated_at", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  const keep = new Set<string>();
  if (currentEndpoint) keep.add(currentEndpoint);
  for (const row of rows || []) {
    if (keep.size >= MAX_ACTIVE_DEVICES) break;
    keep.add(row.endpoint);
  }
  const drop = (rows || []).filter((row: any) => !keep.has(row.endpoint)).map((row: any) => row.id);
  if (drop.length) {
    const { error: dropError } = await supabase.from("vacleaner_push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() }).in("id", drop);
    if (dropError) throw dropError;
  }
};

const sendNotification = async (
  supabase: ReturnType<typeof createClient>,
  subscription: { id: string; endpoint: string; p256dh: string; auth_key: string },
  config: { vapid_public_key: string; vapid_private_key: string },
  payload: Record<string, unknown>,
) => {
  webpush.setVapidDetails("https://vacleaner.pp.ua", config.vapid_public_key, config.vapid_private_key);
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
      JSON.stringify(payload), { TTL: 3600, urgency: "high" },
    );
    await supabase.from("vacleaner_push_subscriptions").update({
      active: true, last_success_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
    return true;
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0);
    await supabase.from("vacleaner_push_subscriptions").update({
      active: statusCode !== 404 && statusCode !== 410,
      last_failure_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
    return false;
  }
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    if (!admin) return json({ error: "forbidden" }, 403);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = cleanText(body.action, 30);
    const currentEndpoint = cleanText(body.endpoint, 2048);
    const actorAlias = cleanAdminAlias(body.adminAlias);
    const actorDeviceId = cleanText(body.actorDeviceId, 128);
    const config = await ensureConfig(supabase);

    if (action === "config") {
      const devices = await deviceList(supabase, userId, currentEndpoint);
      return json({ publicKey: config.vapid_public_key, subscribedDevices: devices.length, maxDevices: MAX_ACTIVE_DEVICES, devices });
    }
    if (action === "devices") {
      return json({ devices: await deviceList(supabase, userId, currentEndpoint), maxDevices: MAX_ACTIVE_DEVICES });
    }
    if (action === "subscribe") {
      const raw = body.subscription && typeof body.subscription === "object" ? body.subscription as Record<string, unknown> : {};
      const keys = raw.keys && typeof raw.keys === "object" ? raw.keys as Record<string, unknown> : {};
      const endpoint = cleanText(raw.endpoint, 2048);
      const p256dh = cleanText(keys.p256dh, 256);
      const authKey = cleanText(keys.auth, 128);
      const deviceId = cleanText(body.deviceId, 128);
      const deviceLabel = cleanText(body.deviceLabel, 120) || "iPhone";
      if (!endpoint.startsWith("https://") || p256dh.length < 24 || authKey.length < 8 || deviceId.length < 8) return json({ error: "invalid_subscription" }, 400);

      const { error: deactivateError } = await supabase.from("vacleaner_push_subscriptions")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("device_id", deviceId).neq("endpoint", endpoint);
      if (deactivateError) throw deactivateError;

      const { error } = await supabase.from("vacleaner_push_subscriptions").upsert({
        user_id: userId, endpoint, p256dh, auth_key: authKey, device_id: deviceId,
        device_label: deviceLabel, admin_alias: actorAlias || null, user_agent: cleanText(body.userAgent, 500) || null,
        active: true, updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      await capActiveDevices(supabase, userId, endpoint);
      return json({ subscribed: true, devices: await deviceList(supabase, userId, endpoint), maxDevices: MAX_ACTIVE_DEVICES });
    }
    if (action === "rename") {
      const label = cleanText(body.deviceLabel, 120);
      if (!currentEndpoint || !label) return json({ error: "invalid_device" }, 400);
      const { error } = await supabase.from("vacleaner_push_subscriptions")
        .update({ device_label: label, updated_at: new Date().toISOString() })
        .eq("endpoint", currentEndpoint).eq("user_id", userId);
      if (error) throw error;
      return json({ renamed: true, devices: await deviceList(supabase, userId, currentEndpoint) });
    }
    if (action === "unsubscribe") {
      if (currentEndpoint) await supabase.from("vacleaner_push_subscriptions")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("endpoint", currentEndpoint).eq("user_id", userId);
      return json({ subscribed: false, devices: await deviceList(supabase, userId, currentEndpoint) });
    }
    if (action === "test") {
      const { data: subscriptions, error } = await supabase.from("vacleaner_push_subscriptions")
        .select("id,endpoint,p256dh,auth_key").eq("user_id", userId).eq("active", true).eq("endpoint", currentEndpoint).limit(1);
      if (error) throw error;
      if (!subscriptions?.length) return json({ error: "subscription_not_found" }, 404);
      const delivered = await sendNotification(supabase, subscriptions[0], config, {
        title: "VAcleaner · тест сповіщень",
        body: "Цей телефон підключений. Видачі, повернення та нові заявки приходитимуть сюди.",
        tag: `vacleaner-push-test-${subscriptions[0].id}`,
        data: { url: "/admin/bronuvannia/", event: "push_test" },
      });
      return json({ delivered });
    }
    if (action === "notify_admin_event") {
      const bookingId = cleanText(body.bookingId, 40);
      const eventType = cleanText(body.eventType, 20);
      if (!validBookingId(bookingId) || !["new", "issued", "completed"].includes(eventType)) return json({ error: "invalid_event" }, 400);
      if (!actorAlias && actorDeviceId.length < 8) return json({ error: "invalid_actor" }, 400);

      const { data: booking, error: bookingError } = await supabase.from("vacleaner_bookings")
        .select("id,status,product_code,product_label,customer_name,start_date,return_date,pickup_window,return_window,extras,created_at")
        .eq("id", bookingId).single();
      if (bookingError || !booking) return json({ error: "booking_not_found" }, 404);
      const expectedStatus = eventType === "issued" ? "issued" : eventType === "completed" ? "completed" : "";
      if (expectedStatus && booking.status !== expectedStatus) return json({ error: "event_state_mismatch" }, 409);
      if (eventType === "new") {
        const age = Date.now() - new Date(booking.created_at || 0).getTime();
        if (!Number.isFinite(age) || age < -60000 || age > 10 * 60 * 1000) return json({ error: "event_expired" }, 409);
      }

      const eventKey = `peer:${eventType}:${booking.id}`;
      const { data: claimed, error: claimError } = await supabase.rpc("vacleaner_claim_notification_dispatch", { p_event_key: eventKey, p_booking_id: booking.id, p_event_type: `peer_${eventType}`, p_lease_seconds: 120 });
      if (claimError) throw claimError;
      if (claimed !== true) return json({ delivered: 0, recipients: 0, deduplicated: true });

      const { data: subscriptions, error: subscriptionsError } = await supabase.from("vacleaner_push_subscriptions")
        .select("id,endpoint,p256dh,auth_key,device_id,admin_alias")
        .eq("user_id", userId).eq("active", true);
      if (subscriptionsError) throw subscriptionsError;
      const recipients = (subscriptions || []).filter((row: any) => {
        const recipientAlias = cleanAdminAlias(row.admin_alias);
        if (actorAlias && recipientAlias) return recipientAlias !== actorAlias;
        return !actorDeviceId || row.device_id !== actorDeviceId;
      });
      const product = cleanText(adminProductLabel(booking.product_code, booking.product_label), 80) || "техніка";
      const customer = cleanText(booking.customer_name, 100) || "Клієнт";
      const actor = adminName(actorAlias);
      const title = eventType === "new" ? `Нове бронювання · ${product}` : eventType === "issued" ? `Техніку видано · ${product}` : `Оренду повернено · ${product}`;
      const details = eventType === "new"
        ? `${customer}\n${shortDate(booking.start_date)} ${bookingTime(booking, "pickup")} → ${shortDate(booking.return_date)} ${bookingTime(booking, "return")}\nДодав: ${actor}`
        : eventType === "issued"
        ? `${customer}\nПовернення ${shortDate(booking.return_date)} о ${bookingTime(booking, "return")}\nЗмінив: ${actor}`
        : `${customer}\nБронювання завершено\nЗмінив: ${actor}`;
      let delivered = 0;
      try {
        const results = await Promise.all(recipients.map((subscription: any) => sendNotification(supabase, subscription, config, {
          title,
          body: details,
          tag: `vacleaner-admin-${booking.id}-${eventType}`,
          data: { url: "/admin/bronuvannia/", bookingId: booking.id, event: `admin_${eventType}` },
        })));
        delivered = results.filter(Boolean).length;
      } finally {
        await supabase.rpc("vacleaner_finish_notification_dispatch", { p_event_key: eventKey, p_delivered: recipients.length === 0 || delivered > 0 });
      }
      return json({ delivered, recipients: recipients.length });
    }
    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    console.error("vacleaner-push", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "service_error" }, 500);
  }
});
