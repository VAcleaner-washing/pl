import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOCAL_SETTLEMENTS = ["полтава", "розсошенці", "щербані", "горбанівка"];
const LOCAL_FEE = 250;
const BASE_OUTSIDE = 350;
const INCLUDED_KM = 10;
const PER_KM = 15;
const MAX_OUTSIDE_KM = 30;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});
const normalizeSettlement = (value: unknown) => String(value || "").toLocaleLowerCase("uk-UA").replace(/^[смт.\s]+/u, "").replace(/[’`]/g, "'").trim();
function settlementFromAddress(value: unknown) {
  return normalizeSettlement(String(value || "").split(" · ")[0].split(",")[0]);
}
function autoAmount(body: Record<string, any>) {
  if (body.fulfillment !== "delivery") return { mode: "pickup", amount: 0 };
  const settlement = settlementFromAddress(body.deliveryAddress || body.customerAddress);
  if (LOCAL_SETTLEMENTS.includes(settlement)) return { mode: "local", amount: LOCAL_FEE };
  const distance = Number(body.deliveryDistanceKm);
  if (body.deliveryAddressVerified === true && Number.isFinite(distance) && distance >= 0) {
    if (distance > MAX_OUTSIDE_KM) return { mode: "agreement", amount: null };
    const extraKm = Math.max(0, Math.ceil((distance - INCLUDED_KM) - 1e-9));
    return { mode: extraKm ? "distance" : "nearby", amount: BASE_OUTSIDE + extraKm * PER_KM };
  }
  return { mode: "manual", amount: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return json({ error: "service_unavailable" }, 503);
  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  if (["create", "edit"].includes(String(body.action || "")) && body.fulfillment === "delivery") {
    const quote = autoAmount(body);
    if (quote.amount !== null) body.deliveryAmountOverride = quote.amount;
    else if (!(Number(body.deliveryAmountOverride) > 0)) return json({ error: "delivery_quote_required" }, 400);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = req.headers.get("Authorization"); if (auth) headers.Authorization = auth;
  const apiKey = req.headers.get("apikey"); if (apiKey) headers.apikey = apiKey;
  try {
    const response = await fetch(`${url}/functions/v1/vacleaner-admin-bookings-v3`, {
      method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { ...cors, "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8" } });
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
});
