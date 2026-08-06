import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});

const defaultSlots = { morningStart: "07:00", morningEnd: "09:30", eveningStart: "17:30", eveningEnd: "20:00" };
const defaultDepositRules = {
  oneUnit: { day: 1000, weekend: 2000 },
  twoUnits: { day: 1500, weekend: 3000 },
  general: { day: 2000, weekend: 3000 },
  elite: { day: 3000, weekend: 4000 },
};
const defaultCatalog = {
  products: {
    puzzi: { label: "Kärcher Puzzi 8/1", weekday: 700, weekend: 800 },
    puzzi_jimmy: { label: "Puzzi + Jimmy", weekday: 1050, weekend: 1150 },
    puzzi_abir: { label: "Puzzi + робот для вікон", weekday: 1500, weekend: 1700 },
    sc2: { label: "Kärcher SC 2 Deluxe", weekday: 500, weekend: 600 },
    abir: { label: "Робот для вікон", weekday: 800, weekend: 900 },
    combo: { label: "Комбо · Puzzi + SC 2", weekday: 1000, weekend: 1200, saturdaySunday: 1800 },
    general: { label: "Генеральне прибирання", weekday: 1300, weekend: 1400, saturdaySunday: 2200 },
    ideal_windows: { label: "Ідеальні вікна", weekday: 1200, weekend: 1300, saturdaySunday: 1900 },
    elite: { label: "HOME RESET", weekday: 2300, weekend: 2500, saturdaySunday: 3500 },
  },
  extras: {
    premium_nozzles: { label: "Насадки «Преміум» до SC 2", price: 200 },
    odour_zero: { label: "Odour Zero", price: 250 },
    neutralix: { label: "Neutralix · концентрат", price: 250 },
    shower_care: { label: "Shower Care", price: 250 },
    soft_degreaser: { label: "Soft Degreaser", price: 250 },
    grill_force: { label: "Grill Force", price: 250 },
    scalex_pro: { label: "Scalex Pro", price: 250 },
    eco_clean: { label: "Eco Clean", price: 250 },
    glass_perfect: { label: "Glass Perfect Care", price: 150 },
  },
  puzziPacketPrice: 50,
};

const validTime = (v: unknown) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n) : null;
};
function normSlots(v: any) {
  if (!v || typeof v !== "object") return defaultSlots;
  const s = {
    morningStart: String(v.morningStart ?? defaultSlots.morningStart),
    morningEnd: String(v.morningEnd ?? defaultSlots.morningEnd),
    eveningStart: String(v.eveningStart ?? defaultSlots.eveningStart),
    eveningEnd: String(v.eveningEnd ?? defaultSlots.eveningEnd),
  };
  if (!Object.values(s).every(validTime) || !(s.morningStart < s.morningEnd && s.morningEnd < s.eveningStart && s.eveningStart < s.eveningEnd)) return null;
  return s;
}
function normDepositRules(v: any) {
  if (!v || typeof v !== "object") return defaultDepositRules;
  const out = structuredClone(defaultDepositRules);
  for (const group of Object.keys(out) as Array<keyof typeof out>) {
    const day = num(v?.[group]?.day);
    const weekend = num(v?.[group]?.weekend);
    if (day === null || weekend === null) return null;
    out[group] = { day, weekend };
  }
  return out;
}
function normCatalog(v: any) {
  if (!v || typeof v !== "object") return defaultCatalog;
  const out = structuredClone(defaultCatalog);
  for (const k of Object.keys(out.products)) {
    const src = v.products?.[k];
    if (!src) continue;
    const wd = num(src.weekday), we = num(src.weekend), ss = src.saturdaySunday === undefined ? undefined : num(src.saturdaySunday);
    if (wd === null || we === null || (src.saturdaySunday !== undefined && ss === null)) return null;
    out.products[k] = { ...out.products[k], weekday: wd, weekend: we, ...(ss !== undefined ? { saturdaySunday: ss } : {}) };
  }
  for (const k of Object.keys(out.extras)) {
    const p = num(v.extras?.[k]?.price);
    if (p !== null) out.extras[k].price = p;
  }
  const pp = num(v.puzziPacketPrice);
  if (pp !== null) out.puzziPacketPrice = pp;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "service_unavailable" }, 503);
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  if (req.method === "GET") {
    const { data } = await db.from("vacleaner_settings").select("key,value").in("key", ["booking_slots", "catalog", "deposit_rules"]);
    const map = Object.fromEntries((data ?? []).map((x: any) => [x.key, x.value]));
    return json({
      slots: normSlots(map.booking_slots) ?? defaultSlots,
      catalog: normCatalog(map.catalog) ?? defaultCatalog,
      depositRules: normDepositRules(map.deposit_rules) ?? defaultDepositRules,
    });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  const { data: admin } = await db.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!admin) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const rows: any[] = [];
  const response: any = {};
  if (body.slots !== undefined) {
    const slots = normSlots(body.slots);
    if (!slots) return json({ error: "invalid_slots" }, 400);
    rows.push({ key: "booking_slots", value: slots, updated_at: new Date().toISOString() });
    response.slots = slots;
  }
  if (body.catalog !== undefined) {
    const catalog = normCatalog(body.catalog);
    if (!catalog) return json({ error: "invalid_catalog" }, 400);
    rows.push({ key: "catalog", value: catalog, updated_at: new Date().toISOString() });
    response.catalog = catalog;
  }
  if (body.depositRules !== undefined) {
    const depositRules = normDepositRules(body.depositRules);
    if (!depositRules) return json({ error: "invalid_deposit_rules" }, 400);
    rows.push({ key: "deposit_rules", value: depositRules, updated_at: new Date().toISOString() });
    response.depositRules = depositRules;
  }
  if (!rows.length) return json({ error: "nothing_to_save" }, 400);
  const { error } = await db.from("vacleaner_settings").upsert(rows);
  if (error) return json({ error: "save_failed" }, 500);
  return json(response);
});
