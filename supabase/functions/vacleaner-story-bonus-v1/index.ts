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
const cleanText = (value: unknown, max: number) => typeof value === "string"
  ? value.trim().replace(/[<>]/g, "").slice(0, max)
  : "";
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};
const requestIp = (req: Request) => String(
  req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
).trim();
const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(`vacleaner-story-bonus-v1:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
};
async function consumeRateLimit(db: any, identity: string, limit: number, windowSeconds: number) {
  const { data, error } = await db.rpc("consume_public_endpoint_rate_limit", {
    p_scope: "vacleaner-story-bonus-v1:apply",
    p_ip_hash: await sha256(identity),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

const PUZZI_PRODUCTS = new Set(["puzzi", "puzzi_jimmy", "puzzi_abir", "combo", "general", "elite"]);
const STORY_ITEM_CODES = new Set(["story_mention_bonus", "story_mention_bonus_diffuser_50"]);

function resolveChoice(productCode: string, baseBeforeDiscount: number, requested: string) {
  const hasPuzzi = PUZZI_PRODUCTS.has(productCode);
  if (productCode === "elite") return "chemistry2";
  if (hasPuzzi && baseBeforeDiscount < 1000) return "chemistry2";
  if (hasPuzzi && baseBeforeDiscount >= 1000) {
    return requested === "chemistry2" || requested === "diffuser50" ? requested : "";
  }
  if (!hasPuzzi && baseBeforeDiscount >= 1000) return "diffuser50";
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "service_unavailable" }, 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const body = await req.json() as Record<string, unknown>;
    const bookingCode = cleanText(body.bookingCode, 32).toUpperCase();
    const phone = normalizePhone(body.customerPhone);
    const requested = cleanText(body.giftChoice, 24);
    if (!/^VAC-\d{6}-[A-Z0-9]{5}$/.test(bookingCode) || !phone) {
      return json({ error: "invalid_request" }, 400);
    }

    const ip = requestIp(req);
    const allowed = await consumeRateLimit(db, `${ip}:${phone}`, 12, 3600);
    if (!allowed) return json({ error: "rate_limited" }, 429);

    const { data: booking, error: readError } = await db
      .from("vacleaner_bookings")
      .select("id,booking_code,product_code,customer_phone,status,source,extras")
      .eq("booking_code", bookingCode)
      .eq("customer_phone", phone)
      .maybeSingle();
    if (readError) throw readError;
    if (!booking) return json({ error: "booking_not_found" }, 404);
    if (String(booking.source || "") !== "vacleaner_website") return json({ error: "not_public_booking" }, 403);
    if (!["pending", "waiting_payment", "confirmed"].includes(String(booking.status || ""))) {
      return json({ error: "booking_locked" }, 409);
    }

    const productCode = String(booking.product_code || "");
    const extras = booking.extras && typeof booking.extras === "object"
      ? structuredClone(booking.extras as Record<string, any>)
      : {} as Record<string, any>;
    const baseBeforeDiscount = Math.max(0, Number(extras.base_before_discount || 0));
    const choice = resolveChoice(productCode, baseBeforeDiscount, requested);
    if (!choice) return json({ error: "story_bonus_not_eligible" }, 400);

    const items = (Array.isArray(extras.items) ? extras.items : [])
      .filter((item: any) => !STORY_ITEM_CODES.has(String(item?.code || "")));
    if (choice === "chemistry2") {
      items.push({
        code: "story_mention_bonus",
        label: "Сторіс-бонус · 2 використані порції Puzzi безкоштовно",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      });
    } else {
      items.push({
        code: "story_mention_bonus_diffuser_50",
        label: "Сторіс-бонус · аромадифузор VA HOME · 50 мл",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      });
    }

    extras.items = items;
    extras.gifts = extras.gifts && typeof extras.gifts === "object" ? extras.gifts : {};
    extras.gifts.story = { mention: true, eligible: true, choice, scent: null };

    const { error: updateError } = await db
      .from("vacleaner_bookings")
      .update({ extras })
      .eq("id", booking.id);
    if (updateError) throw updateError;

    return json({ success: true, bookingCode, giftChoice: choice });
  } catch (error) {
    console.error("vacleaner-story-bonus-v1", error instanceof Error ? error.message : error);
    return json({ error: "service_error" }, 500);
  }
});
