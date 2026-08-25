import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://vacleaner.pp.ua",
  "https://www.vacleaner.pp.ua",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const CENTER = { lat: 49.5883, lon: 34.5514 };
const SERVICE_RADIUS_KM = 30;
const SERVICE_BBOX = "34.16,49.34,34.96,49.84";
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
  return String(value || "").replace(/[<>\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function text(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordinates(feature: any) {
  const coords = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function inServiceArea(feature: any) {
  const point = coordinates(feature);
  return Boolean(point && distanceKm(CENTER.lat, CENTER.lon, point.lat, point.lon) <= SERVICE_RADIUS_KM);
}

function settlementOf(p: Record<string, unknown>) {
  const candidates = [p.city, p.locality, p.town, p.village, p.hamlet, p.municipality];
  for (const candidate of candidates) {
    const value = text(candidate);
    if (value) return value;
  }
  const district = text(p.district);
  if (/полтав/i.test(district)) return "Полтава";
  return "";
}

function isPoltavaSettlement(value: string) {
  const v = value.toLocaleLowerCase("uk-UA");
  return v === "полтава" || v === "poltava" || v.includes("м. полтава");
}

function formatFeature(feature: any) {
  const p = feature?.properties || {};
  const point = coordinates(feature);
  if (!point) return null;
  const street = text(p.street) || (p.osm_key === "highway" ? text(p.name) : "") || (p.type === "street" ? text(p.name) : "");
  const houseNumber = text(p.housenumber);
  const placeName = text(p.name);
  const settlement = settlementOf(p) || (distanceKm(CENTER.lat, CENTER.lon, point.lat, point.lon) < 8 ? "Полтава" : "Передмістя Полтави");
  const main = street || placeName;
  if (!main) return null;
  const base = houseNumber && !main.includes(houseNumber) ? `${main}, ${houseNumber}` : main;
  const address = `${settlement}, ${base}`;
  const areaType = isPoltavaSettlement(settlement) ? "city" : "suburb";
  const meta = [settlement, areaType === "suburb" ? "передмістя" : "Полтава", houseNumber ? "точний будинок" : "вулиця"].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ");
  return {
    label: base,
    address,
    meta,
    street: street || main,
    houseNumber,
    settlement,
    areaType,
    distanceKm: Math.round(distanceKm(CENTER.lat, CENTER.lon, point.lat, point.lon) * 10) / 10,
    lat: point.lat,
    lon: point.lon,
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

  const search = `${q}, Полтавська область`;
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", search);
  url.searchParams.set("bbox", SERVICE_BBOX);
  url.searchParams.set("countrycode", "UA");
  url.searchParams.set("lang", "uk");
  url.searchParams.set("limit", "12");
  url.searchParams.set("lat", String(CENTER.lat));
  url.searchParams.set("lon", String(CENTER.lon));
  url.searchParams.set("zoom", "11");
  url.searchParams.set("location_bias_scale", "0.15");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "Accept-Language": "uk,en;q=0.7" },
    });
    if (!response.ok) return json(req, { suggestions: [], providerUnavailable: true });
    const payload = await response.json();
    const seen = new Set<string>();
    const suggestions = (Array.isArray(payload?.features) ? payload.features : [])
      .filter(inServiceArea)
      .map(formatFeature)
      .filter(Boolean)
      .sort((a: any, b: any) => Number(Boolean(b.houseNumber)) - Number(Boolean(a.houseNumber)) || a.distanceKm - b.distanceKm)
      .filter((item: any) => {
        const key = String(item.address).toLocaleLowerCase("uk-UA");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
    return json(req, { suggestions, provider: "OpenStreetMap / Photon", serviceRadiusKm: SERVICE_RADIUS_KM });
  } catch {
    return json(req, { suggestions: [], providerUnavailable: true });
  } finally {
    clearTimeout(timer);
  }
});
