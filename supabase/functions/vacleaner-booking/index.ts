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

type Product = {
  label: string;
  resources: Partial<Record<ResourceCode, number>>;
  weekday: number;
  weekend: number;
  saturdaySunday?: number;
};

const products: Record<string, Product> = {
  puzzi: {
    label: "Kärcher Puzzi 8/1",
    resources: { puzzi: 1 },
    weekday: 700,
    weekend: 800,
  },
  puzzi_jimmy: {
    label: "Puzzi + Jimmy",
    resources: { puzzi: 1, jimmy: 1 },
    weekday: 1050,
    weekend: 1150,
  },
  sc2: {
    label: "Kärcher SC 2 Deluxe",
    resources: { sc2: 1 },
    weekday: 500,
    weekend: 600,
  },
  abir: {
    label: "Робот для вікон ABIR",
    resources: { abir: 1 },
    weekday: 800,
    weekend: 900,
  },
  combo: {
    label: "Комбо · Puzzi + SC 2",
    resources: { puzzi: 1, sc2: 1 },
    weekday: 1000,
    weekend: 1200,
    saturdaySunday: 1800,
  },
  general: {
    label: "Генеральне прибирання",
    resources: { puzzi: 1, sc2: 1, jimmy: 1 },
    weekday: 1300,
    weekend: 1400,
    saturdaySunday: 2200,
  },
  ideal_windows: {
    label: "Ідеальні вікна · SC 2 + ABIR",
    resources: { sc2: 1, abir: 1 },
    weekday: 1200,
    weekend: 1300,
    saturdaySunday: 1900,
  },
  elite: {
    label: "HOME RESET · повний комплект",
    resources: { puzzi: 1, sc2: 1, jimmy: 1, abir: 1 },
    weekday: 2300,
    weekend: 2500,
    saturdaySunday: 3500,
  },
};

const extrasCatalog: Record<string, { label: string; price: number }> = {
  premium_nozzles: { label: "Насадки «Преміум» до SC 2", price: 200 },
  odour_zero: { label: "Odour Zero · 250 мл", price: 250 },
  neutralix: { label: "Neutralix концентрат", price: 250 },
  shower_care: { label: "Shower Care · 250 мл", price: 250 },
  soft_degreaser: { label: "Soft Degreaser · 250 мл", price: 250 },
  grill_force: { label: "Grill Force · 250 мл", price: 250 },
  scalex_pro: { label: "Scalex Pro · 250 мл", price: 250 },
  eco_clean: { label: "Eco Clean · 250 мл", price: 250 },
  glass_perfect: { label: "Glass Perfect Care · 250 мл", price: 150 },
};

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const asDate = (date: string) => new Date(`${date}T12:00:00.000Z`);

const rentalDays = (
  startDate: string,
  returnDate: string,
  pickupWindow: "morning" | "evening",
  returnWindow: "morning" | "evening",
) => {
  const calendarDays = Math.round(
    (asDate(returnDate).getTime() - asDate(startDate).getTime()) / 86_400_000,
  );
  const pickupOrder = pickupWindow === "morning" ? 0 : 1;
  const returnOrder = returnWindow === "morning" ? 0 : 1;
  if (calendarDays === 0) return returnOrder > pickupOrder ? 1 : 0;
  return calendarDays + (returnOrder > pickupOrder ? 1 : 0);
};

const slotTime = (date: string, window: "morning" | "evening", isReturn = false) => {
  const hour = window === "morning" ? (isReturn ? "09" : "07") : (isReturn ? "20" : "18");
  return `${date}T${hour}:00:00.000Z`;
};

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return "";
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
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startUtc = Date.UTC(asDate(startDate).getUTCFullYear(), asDate(startDate).getUTCMonth(), asDate(startDate).getUTCDate());

  if (days < 1 || days > 14 || startUtc < todayUtc || startUtc > todayUtc + 180 * 86_400_000) {
    throw new Error("invalid_rental_period");
  }

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

const calculateBaseAmount = (product: Product, startDate: string, days: number) => {
  const start = asDate(startDate);
  const firstDay = start.getUTCDay();
  if (days === 2 && firstDay === 6 && product.saturdaySunday) return product.saturdaySunday;

  let total = 0;
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start.getTime() + index * 86_400_000);
    const day = date.getUTCDay();
    total += day === 0 || day === 6 ? product.weekend : product.weekday;
  }
  return total;
};

const parseExtras = (value: unknown, product: Product) => {
  if (!Array.isArray(value)) return { extras: [], amount: 0 };

  const extras: Array<{ code: string; label: string; quantity: number; unitPrice: number; amount: number }> = [];
  let amount = 0;
  let totalQuantity = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const code = cleanText((item as Record<string, unknown>).code, 40);
    const definition = extrasCatalog[code];
    const maxQuantity = 3;
    const quantity = Math.min(maxQuantity, Math.max(0, Number((item as Record<string, unknown>).quantity) || 0));
    if (!definition || quantity < 1 || totalQuantity + quantity > 10) continue;
    if (code === "premium_nozzles" && !product.resources.sc2) continue;

    const lineAmount = definition.price * quantity;
    extras.push({ code, label: definition.label, quantity, unitPrice: definition.price, amount: lineAmount });
    amount += lineAmount;
    totalQuantity += quantity;
  }

  return { extras, amount };
};

const getAvailability = async (
  supabase: ReturnType<typeof createClient>,
  product: Product,
  startAt: string,
  endAt: string,
) => {
  const resourceCodes = Object.keys(product.resources) as ResourceCode[];
  const [{ data: inventory, error: inventoryError }, { data: bookings, error: bookingsError }] = await Promise.all([
    supabase.from("vacleaner_inventory").select("resource_code,capacity").in("resource_code", resourceCodes).eq("active", true),
    supabase
      .from("vacleaner_bookings")
      .select("id,vacleaner_booking_resources(resource_code,quantity)")
      .or(`status.in.(confirmed,issued),and(status.eq.waiting_payment,hold_expires_at.gt.${new Date().toISOString()})`)
      .lt("start_at", endAt)
      .gt("end_at", startAt),
  ]);

  if (inventoryError || bookingsError) throw inventoryError ?? bookingsError;

  const reserved = new Map<ResourceCode, number>();
  for (const booking of bookings ?? []) {
    for (const row of booking.vacleaner_booking_resources ?? []) {
      const code = row.resource_code as ResourceCode;
      reserved.set(code, (reserved.get(code) ?? 0) + Number(row.quantity));
    }
  }

  const remaining: Record<string, number> = {};
  let available = true;
  for (const code of resourceCodes) {
    const capacity = Number(inventory?.find((row) => row.resource_code === code)?.capacity ?? 0);
    const requested = Number(product.resources[code] ?? 0);
    remaining[code] = Math.max(0, capacity - (reserved.get(code) ?? 0));
    if (remaining[code] < requested) available = false;
  }

  return { available, remaining };
};

const hashIp = async (ip: string) => {
  const encoded = new TextEncoder().encode(`vacleaner-booking-v1:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const notifyTelegram = async (booking: Record<string, unknown>) => {
  const token = Deno.env.get("VACLEANER_TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("VACLEANER_TELEGRAM_CHAT_ID");
  if (!token || !chatId) return;

  const text = [
    `Нова заявка ${booking.booking_code}`,
    String(booking.product_label),
    `${booking.start_date} → ${booking.return_date}`,
    `${booking.customer_name} · ${booking.customer_phone}`,
    `Орієнтовно: ${booking.total_amount} грн`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "service_unavailable" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanText(body.action, 30);
    const productCode = cleanText(body.productCode, 40);
    const product = products[productCode];
    if (!product) return json({ error: "invalid_product" }, 400);

    const period = getPeriod(body);
    const availability = await getAvailability(supabase, product, period.startAt, period.endAt);
    const baseAmount = calculateBaseAmount(product, period.startDate, period.days);
    const parsedExtras = parseExtras(body.extras, product);
    const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
    const deliveryAddress = cleanText(body.deliveryAddress, 180);
    const deliveryAmount = fulfillment === "delivery" ? 250 : 0;
    const hasPuzzi = !!product.resources.puzzi;
    const storyMention = body.storyMention === true && hasPuzzi;
    const estimate = {
      rentalDays: period.days,
      baseAmount,
      extrasAmount: parsedExtras.amount,
      deliveryAmount,
      totalAmount: baseAmount + parsedExtras.amount + deliveryAmount,
      prepaymentAmount: 200,
    };

    if (action === "availability") return json({ ...availability, estimate });
    if (action !== "create") return json({ error: "invalid_action" }, 400);
    if (!availability.available) return json({ error: "not_available", availability, estimate }, 409);

    const customerName = cleanText(body.customerName, 80);
    const customerPhone = normalizePhone(body.customerPhone);
    const customerTelegram = cleanText(body.customerTelegram, 80);
    const customerComment = cleanText(body.customerComment, 800);
    const privacyAccepted = body.privacyAccepted === true;
    if (customerName.length < 5 || !customerPhone || !privacyAccepted || (fulfillment === "delivery" && deliveryAddress.length < 8)) {
      return json({ error: "invalid_customer_data" }, 400);
    }

    const chemistryDetails = hasPuzzi
      ? [
          { code: "carpet_chemistry_kit", label: "Хімія для Puzzi · видано 8 порцій, оплата після повернення за використані", quantity: 8, unitPrice: 0, amount: 0 },
          ...(storyMention
            ? [{ code: "story_mention_bonus", label: "Відмітка у сторіс · 2 використані порції безкоштовно", quantity: 1, unitPrice: 0, amount: 0 }]
            : []),
        ]
      : [];
    const bookingExtras = [...parsedExtras.extras, ...chemistryDetails];

    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const ipHash = await hashIp(ip);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await supabase
      .from("vacleaner_bookings")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);
    if (rateError) throw rateError;
    if ((count ?? 0) >= 5) return json({ error: "rate_limited" }, 429);

    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
    const bookingCode = `VAC-${period.startDate.replaceAll("-", "").slice(2)}-${suffix}`;
    const { data: booking, error: insertError } = await supabase
      .from("vacleaner_bookings")
      .insert({
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
        fulfillment_address: fulfillment === "delivery" ? deliveryAddress : "Полтава, вул. Європейська, 146Е",
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_telegram: customerTelegram || null,
        customer_comment: customerComment || null,
        extras: bookingExtras,
        base_amount: estimate.baseAmount,
        extras_amount: estimate.extrasAmount,
        delivery_amount: estimate.deliveryAmount,
        total_amount: estimate.totalAmount,
        prepayment_amount: estimate.prepaymentAmount,
        status: "pending",
        ip_hash: ipHash,
      })
      .select("*")
      .single();
    if (insertError || !booking) throw insertError ?? new Error("booking_insert_failed");

    const resources = Object.entries(product.resources).map(([resourceCode, quantity]) => ({
      booking_id: booking.id,
      resource_code: resourceCode,
      quantity,
    }));
    const { error: resourcesError } = await supabase.from("vacleaner_booking_resources").insert(resources);
    if (resourcesError) {
      await supabase.from("vacleaner_bookings").delete().eq("id", booking.id);
      throw resourcesError;
    }

    await notifyTelegram(booking).catch(() => undefined);

    return json({
      success: true,
      bookingCode,
      status: "pending",
      estimate,
      telegramText: `Вітаю! Створив(ла) заявку ${bookingCode} на ${product.label}. Прошу підтвердити дату.`,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const publicErrors = ["invalid_dates", "invalid_pickup_window", "invalid_return_window", "invalid_rental_period"];
    if (publicErrors.includes(message)) return json({ error: message }, 400);
    console.error("vacleaner-booking", message);
    return json({ error: "service_error" }, 500);
  }
});
