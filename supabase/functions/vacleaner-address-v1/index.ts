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
// Internal service origin. Only coordinates are used; the public response never exposes it.
const SERVICE_ORIGIN = { lat: 49.5590151, lon: 34.5220309 };
const CITY_BOUNDARY_RADIUS_KM = 7;
const ADDRESS_SEARCH_RADIUS_KM = 42;
const SERVICE_BBOX = "33.96,49.20,35.15,49.98";
const PHOTON_URL = "https://photon.komoot.io/api/";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

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
  return String(value || "").replace(/[<>\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}
function text(value: unknown) { return String(value || "").replace(/\s+/g, " ").trim(); }
function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function coordinates(feature: any) {
  const coords = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
  const lon = Number(coords[0]), lat = Number(coords[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}
function inSearchArea(feature: any) {
  const point = coordinates(feature);
  return Boolean(point && distanceKm(CENTER.lat, CENTER.lon, point.lat, point.lon) <= ADDRESS_SEARCH_RADIUS_KM);
}
function settlementOf(p: Record<string, unknown>) {
  for (const candidate of [p.city, p.locality, p.town, p.village, p.hamlet, p.municipality]) {
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
  const p = feature?.properties || {}, point = coordinates(feature);
  if (!point) return null;
  const street = text(p.street) || (p.osm_key === "highway" ? text(p.name) : "") || (p.type === "street" ? text(p.name) : "");
  const houseNumber = text(p.housenumber), placeName = text(p.name);
  const centerDistance = distanceKm(CENTER.lat, CENTER.lon, point.lat, point.lon);
  const settlement = settlementOf(p) || (centerDistance < CITY_BOUNDARY_RADIUS_KM ? "Полтава" : "Населений пункт біля Полтави");
  const main = street || placeName;
  if (!main) return null;
  const base = houseNumber && !main.includes(houseNumber) ? `${main}, ${houseNumber}` : main;
  const address = `${settlement}, ${base}`;
  const areaType = isPoltavaSettlement(settlement) ? "city" : "outside";
  const meta = [settlement, areaType === "outside" ? "за межами Полтави" : "Полтава", houseNumber ? "точний будинок" : "вулиця"]
    .filter((v, i, a) => v && a.indexOf(v) === i).join(" · ");
  return {
    label: base, address, meta, street: street || main, houseNumber, settlement, areaType,
    distanceKm: Math.round(centerDistance * 10) / 10,
    lat: point.lat, lon: point.lon,
  };
}

function roadGeometryDistanceKm(coords: any[], startIndex = 0) {
  let total = 0;
  for (let i = Math.max(1, startIndex + 1); i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    total += distanceKm(Number(a[1]), Number(a[0]), Number(b[1]), Number(b[0]));
  }
  return total;
}
async function pricingDistance(targetLat: number, targetLon: number) {
  const directFromCenter = distanceKm(CENTER.lat, CENTER.lon, targetLat, targetLon);
  if (directFromCenter <= CITY_BOUNDARY_RADIUS_KM) {
    return { outsideKm: 0, routeKm: distanceKm(SERVICE_ORIGIN.lat, SERVICE_ORIGIN.lon, targetLat, targetLon), source: "city" };
  }

  const url = `${OSRM_URL}/${SERVICE_ORIGIN.lon},${SERVICE_ORIGIN.lat};${targetLon},${targetLat}?overview=full&geometries=geojson&steps=false`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3800);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error("route_failed");
    const payload = await response.json();
    const route = payload?.routes?.[0];
    const coords = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates : [];
    if (coords.length < 2) throw new Error("route_missing");

    let exitIndex = 0;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      const d = distanceKm(CENTER.lat, CENTER.lon, Number(c[1]), Number(c[0]));
      if (d > CITY_BOUNDARY_RADIUS_KM) { exitIndex = Math.max(0, i - 1); break; }
    }
    const routeKm = Math.max(0, Number(route.distance || 0) / 1000);
    const outsideKm = Math.max(0, roadGeometryDistanceKm(coords, exitIndex));
    return { outsideKm, routeKm, source: "road" };
  } catch {
    // Fallback is intentionally conservative: straight-line distance beyond the
    // city edge is inflated to approximate a road route rather than underprice it.
    const outsideKm = Math.max(0, directFromCenter - CITY_BOUNDARY_RADIUS_KM) * 1.18;
    const routeKm = distanceKm(SERVICE_ORIGIN.lat, SERVICE_ORIGIN.lon, targetLat, targetLon) * 1.18;
    return { outsideKm, routeKm, source: "estimate" };
  } finally {
    clearTimeout(timer);
  }
}


function parseHouseQuery(value: string) {
  const q = cleanQuery(value).replace(/^(?:м\.?\s*)?полтава\s*[,;-]?\s*/i, "").replace(/^(?:вул\.?|вулиця|ул\.?|улица)\s+/i, "").trim();
  const m = q.match(/^(.*?)[,\s]+(\d+[\p{L}\p{N}/-]*)$/u);
  return m ? { street: m[1].trim(), houseNumber: m[2].trim() } : { street: q, houseNumber: "" };
}
function searchVariants(value: string) {
  const raw = cleanQuery(value);
  const parsed = parseHouseQuery(raw);
  const out = [raw, `${raw}, Полтава`, parsed.houseNumber ? `${parsed.street}, ${parsed.houseNumber}, Полтава` : "", parsed.street ? `${parsed.street}, Полтава` : ""];
  return [...new Set(out.map(cleanQuery).filter((v) => v.length >= 3))].slice(0, 4);
}
async function photonSearch(query: string, signal: AbortSignal) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", `${query}, Полтавська область`);
  url.searchParams.set("bbox", SERVICE_BBOX);
  url.searchParams.set("countrycode", "UA");
  url.searchParams.set("lang", "uk");
  url.searchParams.set("limit", "16");
  url.searchParams.set("lat", String(CENTER.lat));
  url.searchParams.set("lon", String(CENTER.lon));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("location_bias_scale", "0.15");
  const response = await fetch(url, { signal, headers: { "Accept": "application/json", "Accept-Language": "uk,en;q=0.7" } });
  if (!response.ok) throw new Error("photon_failed");
  const payload = await response.json();
  return Array.isArray(payload?.features) ? payload.features : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "origin_not_allowed", suggestions: [] }, 403);
  if (!["GET", "POST"].includes(req.method)) return json(req, { error: "method_not_allowed", suggestions: [] }, 405);

  let body: any = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { body = {}; } }
  const action = String(body?.action || "search");

  if (action === "quote") {
    const lat = num(body?.lat), lon = num(body?.lon);
    if (lat === null || lon === null || lat < 48.8 || lat > 50.4 || lon < 33.2 || lon > 36.0) return json(req, { error: "invalid_coordinates" }, 400);
    const quote = await pricingDistance(lat, lon);
    return json(req, {
      pricingDistanceKm: Math.round(quote.outsideKm * 10) / 10,
      routeKm: Math.round(quote.routeKm * 10) / 10,
      distanceSource: quote.source,
      cityBoundaryModelKm: CITY_BOUNDARY_RADIUS_KM,
    });
  }

  const q = req.method === "GET" ? cleanQuery(new URL(req.url).searchParams.get("q")) : cleanQuery(body?.q);
  if (q.length < 3) return json(req, { suggestions: [], minChars: 3 });

  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5200);
  try {
    const seenFeatures = new Set<string>();
    const features: any[] = [];
    let providerFailed = false;
    for (const candidate of searchVariants(q)) {
      try {
        const batch = await photonSearch(candidate, controller.signal);
        for (const feature of batch) {
          const point = coordinates(feature);
          const p = feature?.properties || {};
          const key = `${p.osm_type || ""}:${p.osm_id || ""}:${point?.lat || ""}:${point?.lon || ""}`;
          if (seenFeatures.has(key)) continue;
          seenFeatures.add(key);
          features.push(feature);
        }
      } catch (err) {
        if ((err as any)?.name === "AbortError") throw err;
        providerFailed = true;
      }
      if (features.some((feature) => Boolean(text(feature?.properties?.housenumber)))) break;
    }

    const seen = new Set<string>();
    let suggestions: any[] = features.filter(inSearchArea).map(formatFeature).filter(Boolean)
      .sort((a: any, b: any) => Number(Boolean(b.houseNumber)) - Number(Boolean(a.houseNumber)) || a.distanceKm - b.distanceKm)
      .filter((item: any) => { const key = String(item.address).toLocaleLowerCase("uk-UA"); if (seen.has(key)) return false; seen.add(key); return true; });

    // Photon can know a Poltava street but not every building number. For a typed
    // house in the fixed 250 UAH city zone, keep the street result usable instead
    // of failing the whole autocomplete. Coordinates are marked approximate and
    // are never used for distance pricing outside the local zone.
    const parsed = parseHouseQuery(q);
    if (parsed.houseNumber && !suggestions.some((item: any) => Boolean(item.houseNumber))) {
      const streetItem = suggestions.find((item: any) => isPoltavaSettlement(item.settlement) && !item.houseNumber);
      if (streetItem) suggestions.unshift({ ...streetItem, label: `${streetItem.street || streetItem.label}, ${parsed.houseNumber}`, address: `Полтава, ${streetItem.street || streetItem.label}, ${parsed.houseNumber}`, houseNumber: parsed.houseNumber, approximateCoordinates: true, meta: `Полтава · точний номер введено · координати вулиці` });
    }

    suggestions = suggestions.slice(0, 8);
    return json(req, { suggestions, provider: "OpenStreetMap / Photon", quoteProvider: "OSRM", addressSearchRadiusKm: ADDRESS_SEARCH_RADIUS_KM, retried: true, providerDegraded: providerFailed && !suggestions.length });
  } catch {
    return json(req, { suggestions: [], providerUnavailable: true });
  } finally {
    clearTimeout(timer);
  }
});
