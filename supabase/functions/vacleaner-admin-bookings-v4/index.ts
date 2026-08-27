import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return json({ error: "service_unavailable" }, 503);
  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }


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
