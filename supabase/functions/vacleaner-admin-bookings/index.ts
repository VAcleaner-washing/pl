import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

type ResourceCode = "puzzi" | "sc2" | "jimmy" | "abir";
type WindowCode = "morning" | "evening";
type Product = {
  label: string;
  resources: Partial<Record<ResourceCode, number>>;
  weekday: number;
  weekend: number;
  saturdaySunday?: number;
};

const products: Record<string, Product> = {
  puzzi: { label: "Kärcher Puzzi 8/1", resources: { puzzi: 1 }, weekday: 700, weekend: 800 },
  puzzi_jimmy: { label: "Puzzi + Jimmy", resources: { puzzi: 1, jimmy: 1 }, weekday: 1050, weekend: 1150 },
  sc2: { label: "Kärcher SC 2 Deluxe", resources: { sc2: 1 }, weekday: 500, weekend: 600 },
  abir: { label: "Робот для вікон ABIR", resources: { abir: 1 }, weekday: 800, weekend: 900 },
  combo: { label: "Комбо · Puzzi + SC 2", resources: { puzzi: 1, sc2: 1 }, weekday: 1000, weekend: 1200, saturdaySunday: 1800 },
  general: { label: "Генеральне прибирання", resources: { puzzi: 1, sc2: 1, jimmy: 1 }, weekday: 1300, weekend: 1400, saturdaySunday: 2200 },
  ideal_windows: { label: "Ідеальні вікна · SC 2 + ABIR", resources: { sc2: 1, abir: 1 }, weekday: 1200, weekend: 1300, saturdaySunday: 1900 },
  elite: { label: "HOME RESET · повний комплект", resources: { puzzi: 1, sc2: 1, jimmy: 1, abir: 1 }, weekday: 2300, weekend: 2500, saturdaySunday: 3500 },
};

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
};

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const asDate = (date: string) => new Date(`${date}T12:00:00.000Z`);
const dateInput = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

const rentalDays = (startDate: string, returnDate: string, pickupWindow: WindowCode, returnWindow: WindowCode) => {
  const calendarDays = Math.round((asDate(returnDate).getTime() - asDate(startDate).getTime()) / 86_400_000);
  if (calendarDays < 0) return 0;
  const pickupOrder = pickupWindow === "morning" ? 0 : 1;
  const returnOrder = returnWindow === "morning" ? 0 : 1;
  if (calendarDays === 0) return returnOrder > pickupOrder ? 1 : 0;
  return calendarDays + (returnOrder > pickupOrder ? 1 : 0);
};

const slotTime = (date: string, window: WindowCode, isReturn = false) => {
  const hour = window === "morning" ? (isReturn ? "09" : "07") : (isReturn ? "20" : "18");
  return `${date}T${hour}:00:00.000Z`;
};

const calculateBaseAmount = (product: Product, startDate: string, days: number) => {
  const start = asDate(startDate);
  if (days === 2 && start.getUTCDay() === 6 && product.saturdaySunday) return product.saturdaySunday;
  let total = 0;
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start.getTime() + index * 86_400_000).getUTCDay();
    total += day === 0 || day === 6 ? product.weekend : product.weekday;
  }
  return total;
};

const getPeriod = (body: Record<string, unknown>) => {
  const startDate = body.startDate;
  const returnDate = body.returnDate;
  const pickupWindow = body.pickupWindow;
  const returnWindow = body.returnWindow;
  if (!isDate(startDate) || !isDate(returnDate)) throw new Error("invalid_dates");
  if (pickupWindow !== "morning" && pickupWindow !== "evening") throw new Error("invalid_pickup_window");
  if (returnWindow !== "morning" && returnWindow !== "evening") throw new Error("invalid_return_window");
  const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
  if (days < 1 || days > 14) throw new Error("invalid_rental_period");
  return {
    startDate,
    returnDate,
    pickupWindow,
    returnWindow,
    days,
    startAt: slotTime(startDate, pickupWindow),
    endAt: slotTime(returnDate, returnWindow, true),
  };
};

const safeBooking = (booking: Record<string, unknown>) => {
  const safe = { ...booking };
  delete safe.ip_hash;
  return safe;
};

const isActiveBooking = (booking: Record<string, unknown>) => {
  if (booking.status === "confirmed" || booking.status === "issued") return true;
  return booking.status === "waiting_payment" && typeof booking.hold_expires_at === "string" && new Date(booking.hold_expires_at).getTime() > Date.now();
};

const getAvailability = async (
  supabase: ReturnType<typeof createClient>,
  product: Product,
  startAt: string,
  endAt: string,
  excludeBookingId = "",
) => {
  const resourceCodes = Object.keys(product.resources) as ResourceCode[];
  const [{ data: inventory, error: inventoryError }, { data: bookings, error: bookingsError }] = await Promise.all([
    supabase.from("vacleaner_inventory").select("resource_code,capacity").in("resource_code", resourceCodes).eq("active", true),
    supabase
      .from("vacleaner_bookings")
      .select("id,status,hold_expires_at,vacleaner_booking_resources(resource_code,quantity)")
      .in("status", ["waiting_payment", "confirmed", "issued"])
      .lt("start_at", endAt)
      .gt("end_at", startAt),
  ]);
  if (inventoryError || bookingsError) throw inventoryError ?? bookingsError;

  const reserved = new Map<ResourceCode, number>();
  for (const raw of bookings ?? []) {
    const booking = raw as unknown as Record<string, unknown>;
    if (booking.id === excludeBookingId || !isActiveBooking(booking)) continue;
    for (const row of (raw.vacleaner_booking_resources ?? [])) {
      const code = row.resource_code as ResourceCode;
      reserved.set(code, (reserved.get(code) ?? 0) + Number(row.quantity));
    }
  }

  const remaining: Record<string, number> = {};
  let available = true;
  for (const code of resourceCodes) {
    const capacity = Number(inventory?.find((row) => row.resource_code === code)?.capacity ?? 0);
    remaining[code] = Math.max(0, capacity - (reserved.get(code) ?? 0));
    if (remaining[code] < Number(product.resources[code] ?? 0)) available = false;
  }
  return { available, remaining };
};

const bookingText = (booking: Record<string, unknown>) => {
  const windowLabel = (value: unknown) => value === "morning" ? "7:00–9:00" : "18:00–20:00";
  const fulfillment = booking.fulfillment === "delivery"
    ? `доставка: ${booking.fulfillment_address ?? "адреса не вказана"}`
    : "самовивіз: Полтава, вул. Європейська, 146Е";
  return [
    `Бронювання VAcleaner ${booking.booking_code}`,
    String(booking.product_label),
    `${booking.start_date} · ${windowLabel(booking.pickup_window)} → ${booking.return_date} · ${windowLabel(booking.return_window)}`,
    fulfillment,
    `Орієнтовна сума: ${booking.total_amount} грн`,
    "Передплата для фіксації дати — 200 грн і входить у загальну суму.",
  ].join("\n");
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !token) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (!admin) return json({ error: "forbidden" }, 403);

    await supabase
      .from("vacleaner_bookings")
      .update({ status: "cancelled", admin_note: "Тимчасова бронь автоматично звільнена", updated_at: new Date().toISOString() })
      .eq("status", "waiting_payment")
      .lt("hold_expires_at", new Date().toISOString());

    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanText(body.action, 30);

    if (action === "list") {
      const requestedStatus = cleanText(body.status, 30);
      let query = supabase
        .from("vacleaner_bookings")
        .select("*,vacleaner_booking_resources(resource_code,quantity)")
        .order("start_at", { ascending: true })
        .limit(200);
      if (["pending", "waiting_payment", "confirmed", "issued", "declined", "cancelled", "completed"].includes(requestedStatus)) query = query.eq("status", requestedStatus);
      const { data, error } = await query;
      if (error) throw error;
      return json({ bookings: (data ?? []).map((item) => ({ ...safeBooking(item as Record<string, unknown>), confirmation_text: bookingText(item as Record<string, unknown>) })) });
    }

    if (action === "calendar") {
      const from = isDate(body.from) ? body.from : dateInput(new Date());
      const requestedDays = Math.max(7, Math.min(31, Number(body.days) || 14));
      const until = dateInput(addDays(asDate(from), requestedDays));
      const [{ data: inventory, error: inventoryError }, { data: bookings, error: bookingsError }] = await Promise.all([
        supabase.from("vacleaner_inventory").select("resource_code,label,capacity").eq("active", true).order("resource_code"),
        supabase
          .from("vacleaner_bookings")
          .select("id,status,hold_expires_at,start_at,end_at,vacleaner_booking_resources(resource_code,quantity)")
          .in("status", ["waiting_payment", "confirmed", "issued"])
          .lt("start_at", `${until}T20:00:00.000Z`)
          .gt("end_at", `${from}T07:00:00.000Z`),
      ]);
      if (inventoryError || bookingsError) throw inventoryError ?? bookingsError;
      const activeBookings = (bookings ?? []).filter((item) => isActiveBooking(item as unknown as Record<string, unknown>));
      const days = Array.from({ length: requestedDays }, (_, index) => {
        const date = dateInput(addDays(asDate(from), index));
        const points = { morning: new Date(`${date}T08:00:00.000Z`).getTime(), evening: new Date(`${date}T19:00:00.000Z`).getTime() };
        const resources: Record<string, { morning: number; evening: number; capacity: number; label: string }> = {};
        for (const item of inventory ?? []) {
          const capacity = Number(item.capacity);
          const reserved = { morning: 0, evening: 0 };
          for (const booking of activeBookings) {
            const start = new Date(booking.start_at).getTime();
            const end = new Date(booking.end_at).getTime();
            for (const window of ["morning", "evening"] as const) {
              if (start <= points[window] && end > points[window]) {
                const resource = booking.vacleaner_booking_resources?.find((row) => row.resource_code === item.resource_code);
                reserved[window] += Number(resource?.quantity ?? 0);
              }
            }
          }
          resources[item.resource_code] = {
            morning: Math.max(0, capacity - reserved.morning),
            evening: Math.max(0, capacity - reserved.evening),
            capacity,
            label: item.label,
          };
        }
        return { date, resources };
      });
      return json({ days });
    }

    if (action === "create") {
      const productCode = cleanText(body.productCode, 40);
      const product = products[productCode];
      if (!product) return json({ error: "invalid_product" }, 400);
      const period = getPeriod(body);
      const availability = await getAvailability(supabase, product, period.startAt, period.endAt);
      if (!availability.available) return json({ error: "inventory_conflict", availability }, 409);

      const customerName = cleanText(body.customerName, 80);
      const customerPhone = normalizePhone(body.customerPhone);
      const customerTelegram = cleanText(body.customerTelegram, 80);
      const customerComment = cleanText(body.customerComment, 800);
      const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
      const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 180) : "Полтава, вул. Європейська, 146Е";
      const source = ["instagram", "phone", "website", "other"].includes(cleanText(body.source, 30)) ? cleanText(body.source, 30) : "instagram";
      const prepaymentPaid = body.prepaymentPaid === true;
      const depositAmount = Math.max(0, Math.min(100_000, Number(body.depositAmount) || 0));
      if (customerName.length < 5 || !customerPhone || (fulfillment === "delivery" && address.length < 8)) return json({ error: "invalid_customer_data" }, 400);

      const baseAmount = calculateBaseAmount(product, period.startDate, period.days);
      const deliveryAmount = fulfillment === "delivery" ? 250 : 0;
      const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
      const bookingCode = `VAC-${period.startDate.replaceAll("-", "").slice(2)}-${suffix}`;
      const now = new Date();
      const { data: booking, error: insertError } = await supabase.from("vacleaner_bookings").insert({
        booking_code: bookingCode,
        product_code: productCode,
        product_label: product.label,
        start_date: period.startDate,
        return_date: period.returnDate,
        start_at: period.startAt,
        end_at: period.endAt,
        pickup_window: period.pickupWindow,
        return_window: period.returnWindow,
        rental_days: period.days,
        fulfillment,
        fulfillment_address: address,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_telegram: customerTelegram || null,
        customer_comment: customerComment || null,
        base_amount: baseAmount,
        extras_amount: 0,
        delivery_amount: deliveryAmount,
        total_amount: baseAmount + deliveryAmount,
        prepayment_amount: 200,
        prepayment_paid: false,
        deposit_amount: depositAmount,
        deposit_paid: false,
        status: "pending",
        source,
        admin_note: cleanText(body.adminNote, 800) || null,
      }).select("*").single();
      if (insertError || !booking) throw insertError ?? new Error("booking_insert_failed");

      const resources = Object.entries(product.resources).map(([resourceCode, quantity]) => ({ booking_id: booking.id, resource_code: resourceCode, quantity }));
      const { error: resourceError } = await supabase.from("vacleaner_booking_resources").insert(resources);
      if (resourceError) {
        await supabase.from("vacleaner_bookings").delete().eq("id", booking.id);
        throw resourceError;
      }

      let saved = booking;
      if (prepaymentPaid) {
        const { data, error } = await supabase.rpc("vacleaner_confirm_booking", { p_booking_id: booking.id });
        if (error) throw error;
        saved = Array.isArray(data) ? data[0] : data;
      } else {
        const { data, error } = await supabase.from("vacleaner_bookings").update({
          status: "waiting_payment",
          hold_expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", booking.id).select("*").single();
        if (error) throw error;
        saved = data;
      }
      return json({ booking: { ...safeBooking(saved as Record<string, unknown>), confirmation_text: bookingText(saved as Record<string, unknown>) } }, 201);
    }

    if (action === "update") {
      const bookingId = cleanText(body.bookingId, 50);
      const status = cleanText(body.status, 30);
      const adminNote = cleanText(body.adminNote, 800);
      if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ error: "invalid_booking" }, 400);

      if (status === "confirmed") {
        const { data, error } = await supabase.rpc("vacleaner_confirm_booking", { p_booking_id: bookingId });
        if (error) {
          if (error.message.includes("inventory_conflict")) return json({ error: "inventory_conflict" }, 409);
          return json({ error: "invalid_transition" }, 409);
        }
        const booking = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
        if (adminNote) await supabase.from("vacleaner_bookings").update({ admin_note: adminNote }).eq("id", bookingId);
        return json({ booking: { ...safeBooking(booking), confirmation_text: bookingText(booking) } });
      }

      if (status === "waiting_payment") {
        const { data: current, error: currentError } = await supabase.from("vacleaner_bookings").select("*").eq("id", bookingId).single();
        if (currentError || !current) return json({ error: "invalid_booking" }, 404);
        const product = products[current.product_code];
        if (!product) return json({ error: "invalid_product" }, 400);
        const availability = await getAvailability(supabase, product, current.start_at, current.end_at, bookingId);
        if (!availability.available) return json({ error: "inventory_conflict" }, 409);
        const { data, error } = await supabase.from("vacleaner_bookings").update({
          status: "waiting_payment",
          hold_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          admin_note: adminNote || current.admin_note,
          updated_at: new Date().toISOString(),
        }).eq("id", bookingId).in("status", ["pending", "waiting_payment"]).select("*").single();
        if (error) return json({ error: "invalid_transition" }, 409);
        return json({ booking: { ...safeBooking(data as Record<string, unknown>), confirmation_text: bookingText(data as Record<string, unknown>) } });
      }

      if (!["issued", "completed", "declined", "cancelled"].includes(status)) return json({ error: "invalid_status" }, 400);
      const allowedCurrent = status === "issued" ? ["confirmed"] : status === "completed" ? ["confirmed", "issued"] : ["pending", "waiting_payment", "confirmed", "issued"];
      const update: Record<string, unknown> = { status, admin_note: adminNote || null, updated_at: new Date().toISOString(), hold_expires_at: null };
      if (status === "issued") update.issued_at = new Date().toISOString();
      if (status === "completed") update.completed_at = new Date().toISOString();
      const { data, error } = await supabase.from("vacleaner_bookings").update(update).eq("id", bookingId).in("status", allowedCurrent).select("*").single();
      if (error) return json({ error: "invalid_transition" }, 409);
      return json({ booking: { ...safeBooking(data as Record<string, unknown>), confirmation_text: bookingText(data as Record<string, unknown>) } });
    }

    if (action === "edit") {
      const bookingId = cleanText(body.bookingId, 50);
      const productCode = cleanText(body.productCode, 40);
      const product = products[productCode];
      if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !product) return json({ error: "invalid_booking" }, 400);
      const period = getPeriod(body);
      const availability = await getAvailability(supabase, product, period.startAt, period.endAt, bookingId);
      if (!availability.available) return json({ error: "inventory_conflict", availability }, 409);
      const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
      const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 180) : "Полтава, вул. Європейська, 146Е";
      const baseAmount = calculateBaseAmount(product, period.startDate, period.days);
      const deliveryAmount = fulfillment === "delivery" ? 250 : 0;
      const depositAmount = Math.max(0, Math.min(100_000, Number(body.depositAmount) || 0));
      const { data, error } = await supabase.from("vacleaner_bookings").update({
        product_code: productCode,
        product_label: product.label,
        start_date: period.startDate,
        return_date: period.returnDate,
        start_at: period.startAt,
        end_at: period.endAt,
        pickup_window: period.pickupWindow,
        return_window: period.returnWindow,
        rental_days: period.days,
        fulfillment,
        fulfillment_address: address,
        customer_name: cleanText(body.customerName, 80),
        customer_phone: normalizePhone(body.customerPhone),
        customer_telegram: cleanText(body.customerTelegram, 80) || null,
        customer_comment: cleanText(body.customerComment, 800) || null,
        source: cleanText(body.source, 30) || "instagram",
        base_amount: baseAmount,
        delivery_amount: deliveryAmount,
        total_amount: baseAmount + deliveryAmount,
        deposit_amount: depositAmount,
        deposit_paid: body.depositPaid === true,
        admin_note: cleanText(body.adminNote, 800) || null,
        updated_at: new Date().toISOString(),
      }).eq("id", bookingId).select("*").single();
      if (error) throw error;
      await supabase.from("vacleaner_booking_resources").delete().eq("booking_id", bookingId);
      const resources = Object.entries(product.resources).map(([resourceCode, quantity]) => ({ booking_id: bookingId, resource_code: resourceCode, quantity }));
      const { error: resourceError } = await supabase.from("vacleaner_booking_resources").insert(resources);
      if (resourceError) throw resourceError;
      return json({ booking: { ...safeBooking(data as Record<string, unknown>), confirmation_text: bookingText(data as Record<string, unknown>) } });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (["invalid_dates", "invalid_pickup_window", "invalid_return_window", "invalid_rental_period"].includes(message)) return json({ error: message }, 400);
    console.error("vacleaner-admin-bookings", message);
    return json({ error: "service_error" }, 500);
  }
});
