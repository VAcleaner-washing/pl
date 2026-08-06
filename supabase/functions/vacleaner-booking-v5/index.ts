import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), {
  status: s,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});
const defaults = {
  products: {
    puzzi: { weekday: 700, weekend: 800 },
    puzzi_jimmy: { weekday: 1050, weekend: 1150 },
    puzzi_abir: { weekday: 1500, weekend: 1700 },
    sc2: { weekday: 500, weekend: 600 },
    abir: { weekday: 800, weekend: 900 },
    combo: { weekday: 1000, weekend: 1200, saturdaySunday: 1800 },
    general: { weekday: 1300, weekend: 1400, saturdaySunday: 2200 },
    ideal_windows: { weekday: 1200, weekend: 1300, saturdaySunday: 1900 },
    elite: { weekday: 2300, weekend: 2500, saturdaySunday: 3500 },
  },
  extras: {
    premium_nozzles: { price: 200 }, odour_zero: { price: 250 }, neutralix: { price: 250 }, shower_care: { price: 250 },
    soft_degreaser: { price: 250 }, grill_force: { price: 250 }, scalex_pro: { price: 250 }, eco_clean: { price: 250 }, glass_perfect: { price: 150 },
  },
};
const defaultDepositRules = {
  oneUnit: { day: 1000, weekend: 2000 },
  twoUnits: { day: 1500, weekend: 3000 },
  general: { day: 2000, weekend: 3000 },
  elite: { day: 3000, weekend: 4000 },
};
const day = (d: string) => new Date(d + "T12:00:00Z").getUTCDay();
function days(sd: string, rd: string, pw: string, rw: string) {
  const a = Date.parse(sd + "T12:00:00Z"), b = Date.parse(rd + "T12:00:00Z"), diff = Math.round((b - a) / 86400000), p = pw === "evening" ? 1 : 0, r = rw === "evening" ? 1 : 0;
  return diff === 0 ? (r > p ? 1 : 0) : diff + (r > p ? 1 : 0);
}
function base(product: any, sd: string, n: number) {
  if (n === 2 && day(sd) === 6 && product.saturdaySunday) return product.saturdaySunday;
  let t = 0;
  for (let i = 0; i < n; i += 1) {
    const d = new Date(Date.parse(sd + "T12:00:00Z") + i * 86400000).getUTCDay();
    t += d === 0 || d === 6 ? product.weekend : product.weekday;
  }
  return t;
}
function fullWeekend(sd: string, rd: string) {
  let d = new Date(sd + "T12:00:00Z"), end = new Date(rd + "T12:00:00Z"), sat = false, sun = false;
  for (let guard = 0; d <= end && guard < 32; guard += 1) {
    if (d.getUTCDay() === 6) sat = true;
    if (d.getUTCDay() === 0) sun = true;
    d = new Date(d.getTime() + 86400000);
  }
  return sat && sun;
}
function depositGroup(code: string) {
  if (code === "elite") return "elite";
  if (code === "general") return "general";
  if (["puzzi_jimmy", "puzzi_abir", "combo", "ideal_windows"].includes(code)) return "twoUnits";
  return "oneUnit";
}
function depositAmount(code: string, sd: string, rd: string, rules: any) {
  const group = depositGroup(code);
  const source = rules?.[group] || defaultDepositRules[group as keyof typeof defaultDepositRules];
  return Math.max(0, Number(fullWeekend(sd, rd) ? source.weekend : source.day) || 0);
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();
    const { data: settings } = await db.from("vacleaner_settings").select("key,value").in("key", ["catalog", "deposit_rules"]);
    const map = Object.fromEntries((settings || []).map((x: any) => [x.key, x.value]));
    const cat = map.catalog || defaults;
    const rules = map.deposit_rules || defaultDepositRules;
    const upstream = await fetch(url + "/functions/v1/vacleaner-booking-v4", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || "",
        "apikey": req.headers.get("apikey") || "",
      },
      body: JSON.stringify(body),
    });
    const payload = await upstream.json().catch(() => ({ error: "invalid_upstream" }));
    if (!upstream.ok) return json(payload, upstream.status);
    if (body.action === "loyalty_lookup") return json(payload, upstream.status);
    const product = cat.products?.[body.productCode] || defaults.products[body.productCode as keyof typeof defaults.products];
    if (!product) return json(payload, upstream.status);
    const n = days(body.startDate, body.returnDate, body.pickupWindow, body.returnWindow);
    const rawBase = base(product, body.startDate, n);
    let extrasAmount = 0;
    if (Array.isArray(body.extras)) {
      for (const x of body.extras) {
        const q = Math.max(0, Number(x?.quantity || 0));
        extrasAmount += (cat.extras?.[x?.code]?.price ?? defaults.extras[x?.code as keyof typeof defaults.extras]?.price ?? 0) * q;
      }
    }
    const deliveryAmount = body.fulfillment === "delivery" ? 250 : 0;
    const percent = Number(payload.loyalty?.percent || payload.estimate?.loyalty?.percent || 0);
    const discount = Math.round(rawBase * percent / 100);
    const baseAmount = rawBase - discount;
    const totalAmount = baseAmount + extrasAmount + deliveryAmount;
    const securityDeposit = depositAmount(String(body.productCode || ""), body.startDate, body.returnDate, rules);
    payload.estimate = {
      ...(payload.estimate || {}),
      rentalDays: n,
      baseBeforeDiscount: rawBase,
      baseAmount,
      extrasAmount,
      deliveryAmount,
      totalAmount,
      loyaltyDiscountAmount: discount,
      depositAmount: securityDeposit,
    };
    if (body.action === "create" && payload.success && payload.bookingCode) {
      const { data: booking } = await db.from("vacleaner_bookings").select("id").eq("booking_code", payload.bookingCode).maybeSingle();
      if (booking) {
        await db.from("vacleaner_bookings").update({
          base_amount: baseAmount,
          extras_amount: extrasAmount,
          delivery_amount: deliveryAmount,
          total_amount: totalAmount,
          deposit_amount: securityDeposit,
          deposit_paid: false,
          deposit_returned: false,
          updated_at: new Date().toISOString(),
        }).eq("id", booking.id);
      }
    }
    return json(payload, upstream.status);
  } catch (e) {
    console.error(e);
    return json({ error: "service_error" }, 500);
  }
});
