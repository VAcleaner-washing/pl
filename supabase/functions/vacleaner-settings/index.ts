import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import { DEFAULT_CATALOG, DEFAULT_DELIVERY_FEE, DEFAULT_DELIVERY_PRICING, DEFAULT_DEPOSIT_RULES, DEFAULT_SLOTS, VACLEANER_RELEASE_VERSION } from "./config.ts";

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

const defaultSlots = structuredClone(DEFAULT_SLOTS);
const defaultDeliveryFee = Number(DEFAULT_DELIVERY_FEE) || 250;
const defaultDeliveryPricing: any = structuredClone(DEFAULT_DELIVERY_PRICING);
const defaultDepositRules = structuredClone(DEFAULT_DEPOSIT_RULES);
const defaultCatalog: any = structuredClone(DEFAULT_CATALOG);

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
function normDeliveryPricing(v: unknown) {
  const source: any = v && typeof v === "object" ? v : { local: v };
  const local = num(source?.local ?? source?.amount ?? source);
  if (local === null) return null;
  const defaultZones = Array.isArray(defaultDeliveryPricing.zones) && defaultDeliveryPricing.zones.length ? defaultDeliveryPricing.zones : [{maxKm:15,amount:350},{maxKm:20,amount:500},{maxKm:30,amount:700},{maxKm:40,amount:900}];
  const rawZones = Array.isArray(source?.zones) && source.zones.length ? source.zones : defaultZones;
  const zones = rawZones.map((row:any)=>({maxKm:num(row?.maxKm),amount:num(row?.amount)})).filter((row:any)=>row.maxKm!==null&&row.amount!==null&&row.maxKm>0&&row.amount>0).sort((a:any,b:any)=>a.maxKm-b.maxKm);
  if (!zones.length) return null;
  for (let i=1;i<zones.length;i++) if (zones[i].maxKm<=zones[i-1].maxKm) return null;
  const maxRouteKm = num(source?.maxRouteKm ?? zones[zones.length-1].maxKm);
  if (maxRouteKm === null || maxRouteKm < zones[zones.length-1].maxKm) return null;
  const fuelSource = source?.fuel && typeof source.fuel === "object" ? source.fuel : {};
  const fuel = {
    petrolPerL: Number(fuelSource.petrolPerL ?? defaultDeliveryPricing.fuel?.petrolPerL ?? 80),
    lpgPerL: Number(fuelSource.lpgPerL ?? defaultDeliveryPricing.fuel?.lpgPerL ?? 45),
    consumptionL100: Number(fuelSource.consumptionL100 ?? defaultDeliveryPricing.fuel?.consumptionL100 ?? 7),
    tripMultiplier: 4,
  };
  if (![fuel.petrolPerL,fuel.lpgPerL,fuel.consumptionL100].every(x=>Number.isFinite(x)&&x>0&&x<=1000)) return null;
  return {
    local, zones, maxRouteKm, distanceBasis: "route_one_way",
    localSettlements: Array.isArray(defaultDeliveryPricing.localSettlements) ? [...defaultDeliveryPricing.localSettlements] : ["Полтава","Розсошенці","Щербані","Горбанівка"],
    outsideZone: "agreement", fuel,
  };
}
function normDeliveryFee(v: unknown) {
  return normDeliveryPricing(v)?.local ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "service_unavailable" }, 503);
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  if (req.method === "GET") {
    const { data } = await db.from("vacleaner_settings").select("key,value").in("key", ["booking_slots", "catalog", "deposit_rules", "delivery_fee"]);
    const map = Object.fromEntries((data ?? []).map((x: any) => [x.key, x.value]));
    return json({
      slots: normSlots(map.booking_slots) ?? defaultSlots,
      catalog: normCatalog(map.catalog) ?? defaultCatalog,
      depositRules: normDepositRules(map.deposit_rules) ?? defaultDepositRules,
      deliveryPricing: normDeliveryPricing(map.delivery_fee) ?? defaultDeliveryPricing,
      deliveryFee: (normDeliveryPricing(map.delivery_fee) ?? defaultDeliveryPricing).local ?? defaultDeliveryFee,
      version: VACLEANER_RELEASE_VERSION,
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
  if (body.deliveryPricing !== undefined || body.deliveryFee !== undefined) {
    const deliveryPricing = normDeliveryPricing(body.deliveryPricing ?? body.deliveryFee);
    if (!deliveryPricing) return json({ error: "invalid_delivery_fee" }, 400);
    rows.push({ key: "delivery_fee", value: deliveryPricing, updated_at: new Date().toISOString() });
    response.deliveryPricing = deliveryPricing;
    response.deliveryFee = deliveryPricing.local;
  }
  if (!rows.length) return json({ error: "nothing_to_save" }, 400);
  const { error } = await db.from("vacleaner_settings").upsert(rows);
  if (error) return json({ error: "save_failed" }, 500);
  return json(response);
});
