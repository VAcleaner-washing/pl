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
  const localCity = directFromCenter <= CITY_BOUNDARY_RADIUS_KM;
  const url = `${OSRM_URL}/${SERVICE_ORIGIN.lon},${SERVICE_ORIGIN.lat};${targetLon},${targetLat}?overview=full&geometries=geojson&steps=false`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4200);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error("route_failed");
    const payload = await response.json();
    const route = payload?.routes?.[0];
    const coords = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates : [];
    if (coords.length < 2) throw new Error("route_missing");

    const routeKm = Math.max(0, Number(route.distance || 0) / 1000);
    if (localCity) return { outsideKm: 0, routeKm, source: "road_city" };

    let exitIndex = 0;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      const d = distanceKm(CENTER.lat, CENTER.lon, Number(c[1]), Number(c[0]));
      if (d > CITY_BOUNDARY_RADIUS_KM) { exitIndex = Math.max(0, i - 1); break; }
    }
    const outsideKm = Math.max(0, roadGeometryDistanceKm(coords, exitIndex));
    return { outsideKm, routeKm, source: "road" };
  } catch {
    // If OSRM is temporarily unavailable, keep a clearly marked estimate so the
    // admin can refresh it later; never present straight-line city distance as a road route.
    const outsideKm = localCity ? 0 : Math.max(0, directFromCenter - CITY_BOUNDARY_RADIUS_KM) * 1.18;
    const routeKm = distanceKm(SERVICE_ORIGIN.lat, SERVICE_ORIGIN.lon, targetLat, targetLon) * 1.18;
    return { outsideKm, routeKm, source: localCity ? "estimate_city" : "estimate" };
  } finally {
    clearTimeout(timer);
  }
}


const STREET_TYPE_RE = /\b(?:вулиця|вул\.?|улица|ул\.?|провулок|пров\.?|переулок|пер\.?|проспект|просп\.?|бульвар|бул\.?|шосе|площа|майдан|набережна|узвіз|алея)\b/giu;
function normalizeStreet(value: unknown) {
  return text(value).toLocaleLowerCase("uk-UA").replace(/[’`]/g, "'").replace(STREET_TYPE_RE, " ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
function normalizeHouse(value: unknown) { return text(value).toLocaleLowerCase("uk-UA").replace(/\s+/g, ""); }
function streetMatchScore(queryStreet: unknown, itemStreet: unknown) {
  const q = normalizeStreet(queryStreet), item = normalizeStreet(itemStreet);
  if (!q || !item) return 0;
  if (q === item) return 4;
  if (q.includes(item) || item.includes(q)) return 3;
  const qTokens = q.split(" ").filter((v) => v.length >= 2), itemTokens = new Set(item.split(" ").filter((v) => v.length >= 2));
  if (!qTokens.length) return 0;
  const overlap = qTokens.filter((token) => itemTokens.has(token)).length / qTokens.length;
  return overlap >= 0.67 ? 2 : 0;
}
function parseHouseQuery(value: string) {
  const q = cleanQuery(value).replace(/^(?:м\.?\s*)?полтава\s*[,;-]?\s*/i, "").trim();
  const m = q.match(/^(.*?)[,\s]+(\d+[\p{L}\p{N}/-]*)$/u);
  return m ? { street: m[1].trim(), houseNumber: m[2].trim() } : { street: q, houseNumber: "" };
}
function searchVariants(value: string) {
  const raw = cleanQuery(value);
  const parsed = parseHouseQuery(raw);
  const typedStreet = parsed.street.replace(/^(?:вул\.?|вулиця|ул\.?|улица|провулок|пров\.?|переулок|пер\.?|проспект|просп\.?|бульвар|бул\.?)\s+/i, "").trim();
  const exact = parsed.houseNumber ? `${typedStreet}, ${parsed.houseNumber}, Полтава` : "";
  const out = [
    raw,
    exact,
    parsed.houseNumber ? `вулиця ${typedStreet}, ${parsed.houseNumber}, Полтава` : "",
    parsed.houseNumber ? `провулок ${typedStreet}, ${parsed.houseNumber}, Полтава` : "",
    parsed.street ? `${typedStreet}, Полтава` : "",
  ];
  return [...new Set(out.map(cleanQuery).filter((v) => v.length >= 3))].slice(0, 5);
}
async function photonSearch(query: string, signal: AbortSignal) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", `${query}, Полтавська область`);
  url.searchParams.set("bbox", SERVICE_BBOX);
  url.searchParams.set("countrycode", "UA");
  // Photon currently accepts only its documented language values. Passing
  // `lang=uk` makes the whole request fail with HTTP 400, even though the OSM
  // result itself contains the Ukrainian street name. Let Photon use the
  // native/default OSM names; forcing a fallback language can transliterate
  // Ukrainian settlements (for example, Rozsoshentsi instead of Розсошенці).
  url.searchParams.set("limit", "16");
  url.searchParams.set("lat", String(CENTER.lat));
  url.searchParams.set("lon", String(CENTER.lon));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("location_bias_scale", "0.15");
  const response = await fetch(url, { signal, headers: { "Accept": "application/json" } });
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
    const parsed = parseHouseQuery(q);
    const seenFeatures = new Set<string>();
    const features: any[] = [];
    let providerFailed = false, exactRelevantHouseFound = false;
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
          const featureStreet = text(p.street) || (p.osm_key === "highway" ? text(p.name) : "") || (p.type === "street" ? text(p.name) : "");
          if (parsed.houseNumber && streetMatchScore(parsed.street, featureStreet) >= 3 && normalizeHouse(parsed.houseNumber) === normalizeHouse(p.housenumber)) exactRelevantHouseFound = true;
        }
      } catch (err) {
        if ((err as any)?.name === "AbortError") throw err;
        providerFailed = true;
      }
      if (exactRelevantHouseFound) break;
    }

    const seen = new Set<string>();
    let suggestions: any[] = features.filter(inSearchArea).map(formatFeature).filter(Boolean)
      .map((item: any) => ({ ...item, streetScore: streetMatchScore(parsed.street, item.street || item.label), exactHouse: normalizeHouse(parsed.houseNumber) && normalizeHouse(parsed.houseNumber) === normalizeHouse(item.houseNumber) }))
      .filter((item: any) => !parsed.street || item.streetScore > 0)
      .sort((a: any, b: any) => Number(Boolean(b.exactHouse)) - Number(Boolean(a.exactHouse)) || b.streetScore - a.streetScore || Number(Boolean(b.houseNumber)) - Number(Boolean(a.houseNumber)) || a.distanceKm - b.distanceKm)
      .filter((item: any) => { const key = String(item.address).toLocaleLowerCase("uk-UA"); if (seen.has(key)) return false; seen.add(key); return true; })
      .map(({ streetScore, exactHouse, ...item }: any) => item);

    // Autocomplete is an assistant, not a gate. If OSM/Photon knows the street but
    // misses the typed building (or returns only neighbouring houses), put the
    // user's own Poltava address first as a manual option. It has no invented
    // coordinates and therefore can never pollute route/fuel analytics.
    const exactHouse = parsed.houseNumber && suggestions.some((item: any) => streetMatchScore(parsed.street, item.street || item.label) >= 3 && normalizeHouse(parsed.houseNumber) === normalizeHouse(item.houseNumber));
    if (parsed.houseNumber && !exactHouse) {
      const streetItem = suggestions.find((item: any) => streetMatchScore(parsed.street, item.street || item.label) >= 2);
      const canonicalStreet = text(streetItem?.street || streetItem?.label || parsed.street);
      const settlement = text(streetItem?.settlement) || "Полтава";
      suggestions.unshift({
        label: `${canonicalStreet}, ${parsed.houseNumber}`,
        address: `${settlement}, ${canonicalStreet}, ${parsed.houseNumber}`,
        meta: `${settlement} · точний номер введено · менеджер перевірить`,
        street: canonicalStreet, houseNumber: parsed.houseNumber, settlement,
        areaType: isPoltavaSettlement(settlement) ? "city" : "outside",
        distanceKm: null, lat: null, lon: null, manualAddress: true, approximateCoordinates: true,
      });
    }

    suggestions = suggestions.slice(0, 8);
    return json(req, { suggestions, provider: "OpenStreetMap / Photon", quoteProvider: "OSRM", addressSearchRadiusKm: ADDRESS_SEARCH_RADIUS_KM, retried: true, providerDegraded: providerFailed && !suggestions.length });
  } catch {
    return json(req, { suggestions: [], providerUnavailable: true });
  } finally {
    clearTimeout(timer);
  }
});
