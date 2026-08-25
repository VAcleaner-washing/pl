import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const BUCKET = "vacleaner-client-documents";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-phone, x-file-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};
const safeName = (value: unknown) => {
  const decoded = (() => { try { return decodeURIComponent(String(value ?? "")); } catch { return String(value ?? ""); } })();
  return decoded.trim().replace(/[<>\\/\r\n\t]/g, "_").slice(0, 120) || "document";
};
const extensionFor = (mime: string, filename: string) => {
  const fromName = filename.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1] || "";
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
  if (allowed.has(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" } as Record<string, string>)[mime] || "jpg";
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), auth = request.headers.get("Authorization") ?? "", token = auth.replace(/^Bearer\s+/i, "");
    if (!url || !service || !token) return json({ error: "unauthorized" }, 401);
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: admin, error: adminError } = await db.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (adminError) throw adminError;
    if (!admin) return json({ error: "forbidden" }, 403);

    const { data: bucket } = await db.storage.getBucket(BUCKET);
    if (!bucket) {
      const { error: bucketError } = await db.storage.createBucket(BUCKET, {
        public: false,
        allowedMimeTypes: [...ALLOWED_MIME],
        fileSizeLimit: MAX_FILE_SIZE,
      });
      if (bucketError && !String(bucketError.message || "").toLowerCase().includes("already exists")) throw bucketError;
    }

    const action = new URL(request.url).searchParams.get("action") || "";
    if (action === "upload") {
      const phone = normalizePhone(request.headers.get("x-client-phone"));
      if (!phone) return json({ error: "invalid_customer" }, 400);
      const mime = String(request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_MIME.has(mime)) return json({ error: "invalid_file_type" }, 415);
      const filename = safeName(request.headers.get("x-file-name"));
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > MAX_FILE_SIZE) return json({ error: "file_too_large", maxBytes: MAX_FILE_SIZE }, 413);
      const { data: customer, error: customerError } = await db.from("vacleaner_customers")
        .select("phone,document_photo_path")
        .eq("phone", phone).maybeSingle();
      if (customerError) throw customerError;
      if (!customer) return json({ error: "customer_not_found" }, 404);
      const ext = extensionFor(mime, filename), path = `${phone.replace(/\D/g, "")}/${crypto.randomUUID()}.${ext}`;
      const blob = new Blob([bytes], { type: mime });
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, blob, { contentType: mime, cacheControl: "0", upsert: false });
      if (uploadError) throw uploadError;
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("vacleaner_customers").update({
        document_photo_path: path,
        document_photo_name: filename,
        document_photo_mime: mime,
        document_photo_uploaded_at: now,
        updated_at: now,
      }).eq("phone", phone);
      if (updateError) {
        await db.storage.from(BUCKET).remove([path]);
        throw updateError;
      }
      const previous = String(customer.document_photo_path || "");
      if (previous && previous !== path) await db.storage.from(BUCKET).remove([previous]);
      return json({ ok: true, path, name: filename, mime, uploadedAt: now });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const phone = normalizePhone(body.phone);
    if (!phone) return json({ error: "invalid_customer" }, 400);
    const { data: customer, error: customerError } = await db.from("vacleaner_customers")
      .select("phone,document_photo_path,document_photo_name,document_photo_mime,document_photo_uploaded_at")
      .eq("phone", phone).maybeSingle();
    if (customerError) throw customerError;
    if (!customer) return json({ error: "customer_not_found" }, 404);
    const path = String(customer.document_photo_path || "");

    if (action === "view") {
      if (!path) return json({ document: null });
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 120);
      if (error) throw error;
      return json({ document: { url: data.signedUrl, name: customer.document_photo_name || "document", mime: customer.document_photo_mime || "", uploadedAt: customer.document_photo_uploaded_at || null } });
    }

    if (action === "delete") {
      if (path) {
        const { error } = await db.storage.from(BUCKET).remove([path]);
        if (error) throw error;
      }
      const now = new Date().toISOString();
      const { error } = await db.from("vacleaner_customers").update({ document_photo_path: null, document_photo_name: null, document_photo_mime: null, document_photo_uploaded_at: null, updated_at: now }).eq("phone", phone);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error("vacleaner_customer_documents_error", error);
    return json({ error: "service_error" }, 500);
  }
});
