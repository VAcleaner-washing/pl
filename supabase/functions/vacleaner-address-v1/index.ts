import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://vacleaner.pp.ua",
  "https://www.vacleaner.pp.ua",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const POLTAVA_BBOX = "34.43,49.50,34.72,49.69";
const PHOTON_URL = "https://photon.komoot.io/api/";

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://vacleaner.pp.ua",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function cleanQuery(value: unknown) {
  return String(value || "").replace(/[<>\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

function text(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isPoltava(props: Record<string, unknown>) {
  const haystack = [props.city, props.locality, props.district, props.county, props.state, props.name]
    .map(text).join(" ").toLocaleLowerCase("uk-UA");
  return haystack.includes("полтав") || haystack.includes("poltav");
}

function formatFeature(feature: any) {
  const p = feature?.properties || {};
  const coords = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
  const street = text(p.street) || (p.osm_key === "highway" ? text(p.name) : "") || (p.type === "street" ? text(p.name) : "");
  const houseNumber = text(p.housenumber);
  const placeName = text(p.name);
  const main = street || placeName;
  if (!main) return null;
  const base = houseNumber && !main.includes(houseNumber) ? `${main}, ${houseNumber}` : main;
  const district = text(p.district || p.locality);
  const address = `Полтава, ${base}`;
  const meta = [district && !/полтав/i.test(district) ? district : "", houseNumber ? "точний будинок" : "вулиця"].filter(Boolean).join(" · ");
  return {
    label: base,
    address,
    meta,
    street: street || main,
    houseNumber,
    lat: Number(coords[1]) || null,
    lon: Number(coords[0]) || null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "origin_not_allowed", suggestions: [] }, 403);
  if (!["GET", "POST"].includes(req.method)) return json(req, { error: "method_not_allowed", suggestions: [] }, 405);

  let q = "";
  if (req.method === "GET") q = cleanQuery(new URL(req.url).searchParams.get("q"));
  else {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    q = cleanQuery(body?.q);
  }
  if (q.length < 3) return json(req, { suggestions: [], minChars: 3 });

  const search = /полтав/i.test(q) ? q : `${q}, Полтава`;
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", search);
  url.searchParams.set("bbox", POLTAVA_BBOX);
  url.searchParams.set("countrycode", "UA");
  url.searchParams.set("lang", "uk");
  url.searchParams.set("limit", "8");
  url.searchParams.set("lat", "49.5883");
  url.searchParams.set("lon", "34.5514");
  url.searchParams.set("zoom", "13");
  url.searchParams.set("location_bias_scale", "0.1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "Accept-Language": "uk,en;q=0.7" },
    });
    if (!response.ok) return json(req, { suggestions: [], providerUnavailable: true });
    const payload = await response.json();
    const seen = new Set<string>();
    const suggestions = (Array.isArray(payload?.features) ? payload.features : [])
      .filter((feature: any) => isPoltava(feature?.properties || {}))
      .map(formatFeature)
      .filter(Boolean)
      .filter((item: any) => {
        const key = String(item.address).toLocaleLowerCase("uk-UA");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
    return json(req, { suggestions, provider: "OpenStreetMap / Photon" });
  } catch {
    return json(req, { suggestions: [], providerUnavailable: true });
  } finally {
    clearTimeout(timer);
  }
});
