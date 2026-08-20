import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import webpush from "npm:web-push@3.6.7";
import { DEFAULT_CATALOG, DEFAULT_DELIVERY_FEE, DEFAULT_DEPOSIT_RULES, DEFAULT_SLOTS, rentalDays, isWeekendDeposit, rentalBase, paidDayMoments, slotIndex } from "./config.deploy.js";
const ADMIN_PRODUCT_LABELS = {
    puzzi: "Kärcher Puzzi",
    puzzi_jimmy: "Puzzi + Jimmy",
    puzzi_abir: "Puzzi + робот",
    sc2: "Kärcher SC 2",
    abir: "Робот ABIR",
    combo: "Puzzi + SC 2",
    general: "Puzzi + SC 2 + Jimmy",
    ideal_windows: "SC 2 + робот",
    elite: "HOME RESET"
};
const adminProductLabel = (code, fallback)=>ADMIN_PRODUCT_LABELS[String(code ?? "")] || String(fallback ?? "Техніка").trim() || "Техніка";
const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (body, status = 200)=>new Response(JSON.stringify(body), {
        status,
        headers: {
            ...cors,
            "Content-Type": "application/json; charset=utf-8"
        }
    });
const defaults = structuredClone(DEFAULT_CATALOG);
const defaultDepositRules = structuredClone(DEFAULT_DEPOSIT_RULES);
const defaultSlots = structuredClone(DEFAULT_SLOTS);
const defaultDeliveryFee = Number(DEFAULT_DELIVERY_FEE) || 250;
const cleanText = (value, max)=>typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
const normalizePhone = (value)=>{
    const digits = String(value ?? "").replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
    if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
    return "";
};
const isDate = (value)=>typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const requestIp = (req)=>String(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
const sha256 = async (value)=>{
    const bytes = new TextEncoder().encode(`vacleaner-public-v1:${value}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte)=>byte.toString(16).padStart(2, "0")).join("");
};
async function consumeRateLimit(db, scope, identity, limit, windowSeconds) {
    const { data, error } = await db.rpc("consume_public_endpoint_rate_limit", {
        p_scope: scope,
        p_ip_hash: await sha256(identity),
        p_limit: limit,
        p_window_seconds: windowSeconds
    });
    if (error) throw error;
    return data === true;
}
function mergeCatalog(value) {
    const out = structuredClone(defaults);
    if (!value || typeof value !== "object") return out;
    const pp = Number(value.puzziPacketPrice);
    if (Number.isFinite(pp) && pp >= 0) out.puzziPacketPrice = pp;
    for (const [code, item] of Object.entries(value.products || {}))if (item && typeof item === "object") out.products[code] = {
        ...out.products[code] || {},
        ...item
    };
    for (const [code, item] of Object.entries(value.extras || {}))if (item && typeof item === "object") out.extras[code] = {
        ...out.extras[code] || {},
        ...item
    };
    return out;
}
function normalizeSlots(value) {
    const out = {
        ...defaultSlots
    };
    if (!value || typeof value !== "object") return out;
    for (const key of [
        "morningStart",
        "morningEnd",
        "eveningStart",
        "eveningEnd"
    ])if (/^\d{2}:\d{2}$/.test(String(value[key] || ""))) out[key] = String(value[key]);
    return out.morningStart < out.morningEnd && out.morningEnd < out.eveningStart && out.eveningStart < out.eveningEnd ? out : {
        ...defaultSlots
    };
}
function normalizeDepositRules(value) {
    const out = structuredClone(defaultDepositRules);
    if (!value || typeof value !== "object") return out;
    for (const key of Object.keys(out)){
        const day = Number(value?.[key]?.day), weekend = Number(value?.[key]?.weekend);
        if (Number.isFinite(day) && day > 0) out[key].day = Math.round(day);
        if (Number.isFinite(weekend) && weekend > 0) out[key].weekend = Math.round(weekend);
    }
    return out;
}
function normalizeDeliveryFee(value) {
    const raw = value && typeof value === "object" ? value.amount : value;
    const fee = Number(raw);
    return Number.isFinite(fee) && fee >= 0 && fee <= 100000 ? Math.round(fee) : defaultDeliveryFee;
}
function depositAmount(code, startDate, returnDate, pickupWindow, returnWindow, rules, catalog) {
    const group = catalog?.products?.[code]?.depositGroup || defaults.products?.[code]?.depositGroup || "oneUnit";
    const source = rules?.[group] || defaultDepositRules[group];
    return Math.max(0, Number(isWeekendDeposit(startDate, returnDate, pickupWindow, returnWindow) ? source.weekend : source.day) || 0);
}
function selectedExtras(value, productCode, catalog) {
    const rows = Array.isArray(value) ? value : [];
    const items = [];
    for (const raw of rows){
        if (!raw || typeof raw !== "object") continue;
        const rawCode = String(raw.code || ""), code = rawCode === "premium_sc2" ? "premium_nozzles" : rawCode;
        const quantity = Math.max(0, Math.min(3, Math.floor(Number(raw.quantity) || 0)));
        const item = catalog?.extras?.[code] || defaults.extras?.[code];
        if (!item || quantity < 1) continue;
        const requires = Array.isArray(item.requires) ? item.requires.map(String) : [];
        if (requires.length && !requires.includes(productCode)) continue;
        const unitPrice = Math.max(0, Number(item.price || 0));
        items.push({
            code,
            label: String(item.label || code),
            quantity,
            unitPrice,
            amount: unitPrice * quantity
        });
    }
    return {
        items,
        amount: items.reduce((sum, item)=>sum + item.amount, 0)
    };
}
const loyaltyFor = (completed)=>completed >= 6 ? {
        level: "VIP",
        percent: 10
    } : completed >= 3 ? {
        level: "Regular",
        percent: 5
    } : {
        level: "Start",
        percent: 0
    };
const normalizePromoCode = (value)=>cleanText(value, 32).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
function promoDiscountAmount(campaign, rawBase) {
    if (!campaign) return 0;
    const value = Math.max(0, Number(campaign.discount_value || 0));
    return campaign.discount_type === "percent" ? Math.min(rawBase, Math.round(rawBase * Math.min(100, value) / 100)) : Math.min(rawBase, Math.round(value));
}
async function validatePromo(db, args) {
    const code = normalizePromoCode(args.code);
    if (!code) return null;
    const { data: promoCode, error: codeError } = await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit").ilike("code", code).maybeSingle();
    if (codeError) throw codeError;
    if (!promoCode || !promoCode.active) return {
        valid: false,
        code,
        reason: "invalid_code"
    };
    const { data: campaign, error: campaignError } = await db.from("vacleaner_campaigns").select("*").eq("id", promoCode.campaign_id).maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign || campaign.status !== "active") return {
        valid: false,
        code,
        reason: "campaign_inactive"
    };
    const now = Date.now(), starts = new Date(campaign.starts_at).getTime(), ends = campaign.ends_at ? new Date(campaign.ends_at).getTime() : 0, codeEnds = promoCode.expires_at ? new Date(promoCode.expires_at).getTime() : 0;
    if (Number.isFinite(starts) && starts > now || ends && ends <= now || codeEnds && codeEnds <= now) return {
        valid: false,
        code,
        reason: "expired"
    };
    if (promoCode.customer_phone && !args.phone) return {
        valid: false,
        code,
        reason: "phone_required"
    };
    if (promoCode.customer_phone && promoCode.customer_phone !== args.phone) return {
        valid: false,
        code,
        reason: "customer_mismatch"
    };
    if (Number(args.completed || 0) < Number(campaign.min_completed_orders || 0)) return {
        valid: false,
        code,
        reason: "not_eligible"
    };
    const products = Array.isArray(campaign.allowed_product_codes) ? campaign.allowed_product_codes.map(String) : [];
    if (products.length && !products.includes(args.productCode)) return {
        valid: false,
        code,
        reason: "product_not_eligible"
    };
    const weekdays = Array.isArray(campaign.allowed_weekdays) ? campaign.allowed_weekdays.map(Number) : [];
    if (weekdays.length) {
        const moments = paidDayMoments(args.startDate, args.returnDate, args.pickupWindow, args.returnWindow);
        if (!moments.length || moments.some((item)=>!weekdays.includes(new Date(item.date + "T12:00:00Z").getUTCDay()))) return {
            valid: false,
            code,
            reason: "weekday_not_eligible"
        };
    }
    if (campaign.campaign_type === "return") {
        if (!args.phone || !args.lastCompleted) return {
            valid: false,
            code,
            reason: "not_eligible"
        };
        const dormantDays = Math.max(1, Number(campaign.dormant_days || 180)), cutoff = now - dormantDays * 86400000;
        if (new Date(args.lastCompleted + "T12:00:00Z").getTime() > cutoff) return {
            valid: false,
            code,
            reason: "not_dormant_long_enough"
        };
        const { count: activeCount, error: activeError } = await db.from("vacleaner_bookings").select("id", {
            count: "exact",
            head: true
        }).eq("customer_phone", args.phone).in("status", [
            "waiting_payment",
            "confirmed",
            "issued"
        ]);
        if (activeError) throw activeError;
        if ((activeCount || 0) > 0) return {
            valid: false,
            code,
            reason: "active_booking"
        };
    }
    if (campaign.campaign_type === "personal" && !promoCode.customer_phone) return {
        valid: false,
        code,
        reason: "invalid_personal_code"
    };
    const [{ count: codeUses, error: codeUsesError }, { count: customerUses, error: customerUsesError }, { count: campaignUses, error: campaignUsesError }] = await Promise.all([
        db.from("vacleaner_promo_redemptions").select("id", {
            count: "exact",
            head: true
        }).eq("promo_code_id", promoCode.id),
        args.phone ? db.from("vacleaner_promo_redemptions").select("id", {
            count: "exact",
            head: true
        }).eq("campaign_id", campaign.id).eq("customer_phone", args.phone) : Promise.resolve({
            count: 0,
            error: null
        }),
        db.from("vacleaner_promo_redemptions").select("id", {
            count: "exact",
            head: true
        }).eq("campaign_id", campaign.id)
    ]);
    if (codeUsesError || customerUsesError || campaignUsesError) throw codeUsesError || customerUsesError || campaignUsesError;
    if ((codeUses || 0) >= Number(promoCode.usage_limit || 1)) return {
        valid: false,
        code,
        reason: "used"
    };
    if (args.phone && (customerUses || 0) >= Number(campaign.usage_limit_per_customer || 1)) return {
        valid: false,
        code,
        reason: "used"
    };
    if (campaign.usage_limit_total && (campaignUses || 0) >= Number(campaign.usage_limit_total)) return {
        valid: false,
        code,
        reason: "campaign_limit"
    };
    return {
        valid: true,
        code,
        promoCodeId: promoCode.id,
        campaignId: campaign.id,
        campaignType: campaign.campaign_type,
        campaignName: campaign.name,
        discountType: campaign.discount_type,
        discountValue: Number(campaign.discount_value || 0)
    };
}
function activeBooking(row) {
    if ([
        "confirmed",
        "issued"
    ].includes(String(row.status))) return true;
    return row.status === "waiting_payment" && row.hold_expires_at && new Date(row.hold_expires_at).getTime() > Date.now();
}
function slotMoment(slot) {
    const day = Math.floor(slot / 2);
    return {
        date: new Date(day * 86400000 + 12 * 3600000).toISOString().slice(0, 10),
        window: slot % 2 === 0 ? "morning" : "evening"
    };
}
async function availability(db, product, startDate, returnDate, pickupWindow, returnWindow) {
    const codes = Object.keys(product?.resources || {}), requestStart = slotIndex(startDate, pickupWindow), requestEnd = slotIndex(returnDate, returnWindow);
    if (!codes.length || !Number.isFinite(requestStart) || !Number.isFinite(requestEnd) || requestEnd <= requestStart) return {
        available: false,
        remaining: {},
        nextAvailable: null
    };
    const [{ data: inventory, error: ie }, { data: bookings, error: be }] = await Promise.all([
        db.from("vacleaner_inventory").select("resource_code,capacity").in("resource_code", codes).eq("active", true),
        db.from("vacleaner_bookings").select("id,status,hold_expires_at,start_date,return_date,pickup_window,return_window,vacleaner_booking_resources(resource_code,quantity)").in("status", [
            "waiting_payment",
            "confirmed",
            "issued"
        ])
    ]);
    if (ie || be) throw ie ?? be;
    const active = (bookings || []).filter(activeBooking);
    const measure = (startSlot, endSlot)=>{
        const remaining = {};
        let available = true;
        for (const code of codes){
            const capacity = Number(inventory?.find((row)=>row.resource_code === code)?.capacity || 0);
            let minimum = capacity;
            for(let slot = startSlot; slot < endSlot; slot += 1){
                let reserved = 0;
                for (const row of active){
                    const start = slotIndex(row.start_date, row.pickup_window || "morning"), end = slotIndex(row.return_date, row.return_window || "evening");
                    if (!(start <= slot && slot < end)) continue;
                    const resource = row.vacleaner_booking_resources?.find((item)=>item.resource_code === code);
                    reserved += Number(resource?.quantity || 0);
                }
                minimum = Math.min(minimum, Math.max(0, capacity - reserved));
            }
            remaining[code] = minimum;
            if (minimum < Number(product.resources?.[code] || 0)) available = false;
        }
        return {
            available,
            remaining
        };
    };
    const current = measure(requestStart, requestEnd);
    if (current.available) return {
        ...current,
        nextAvailable: null
    };
    const durationSlots = requestEnd - requestStart;
    let nextAvailable = null;
    for(let candidateStart = requestStart + 1; candidateStart <= requestStart + 62; candidateStart += 1){
        const candidateEnd = candidateStart + durationSlots, candidate = measure(candidateStart, candidateEnd);
        if (!candidate.available) continue;
        const start = slotMoment(candidateStart), finish = slotMoment(candidateEnd);
        nextAvailable = {
            startDate: start.date,
            pickupWindow: start.window,
            returnDate: finish.date,
            returnWindow: finish.window
        };
        break;
    }
    return {
        ...current,
        nextAvailable
    };
}
async function notifyTelegram(booking) {
    const token = Deno.env.get("VACLEANER_TELEGRAM_BOT_TOKEN"), chatId = Deno.env.get("VACLEANER_TELEGRAM_CHAT_ID");
    if (!token || !chatId) return;
    const text = [
        `Нова заявка ${booking.booking_code}`,
        adminProductLabel(booking.product_code, booking.product_label),
        `${booking.start_date} → ${booking.return_date}`,
        `${booking.customer_name} · ${booking.customer_phone}`,
        `Орієнтовно: ${booking.total_amount} грн`
    ].join("\n");
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            chat_id: chatId,
            text
        })
    });
}
async function notifyWebPush(db, booking) {
    const [{ data: config }, { data: subs }] = await Promise.all([
        db.from("vacleaner_push_config").select("vapid_public_key,vapid_private_key").eq("singleton", true).maybeSingle(),
        db.from("vacleaner_push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("active", true)
    ]);
    if (!config || !subs?.length) return;
    webpush.setVapidDetails("https://vacleaner.pp.ua", config.vapid_public_key, config.vapid_private_key);
    const payload = JSON.stringify({
        title: "Нове бронювання VAcleaner",
        body: `${adminProductLabel(booking.product_code, booking.product_label)} · ${booking.start_date} · ${booking.total_amount} грн`,
        tag: String(booking.booking_code),
        data: {
            url: `/admin/bronuvannia/?booking=${booking.id}`,
            bookingId: booking.id
        }
    });
    await Promise.allSettled(subs.map(async (sub)=>{
        try {
            await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth_key
                }
            }, payload, {
                TTL: 3600,
                urgency: "high"
            });
            await db.from("vacleaner_push_subscriptions").update({
                active: true,
                last_success_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq("id", sub.id);
        } catch (error) {
            const code = Number(error.statusCode || 0);
            await db.from("vacleaner_push_subscriptions").update({
                active: code !== 404 && code !== 410,
                last_failure_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq("id", sub.id);
        }
    }));
}
Deno.serve(async (req)=>{
    if (req.method === "OPTIONS") return new Response("ok", {
        headers: cors
    });
    if (req.method !== "POST") return json({
        error: "method_not_allowed"
    }, 405);
    try {
        const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !key) return json({
            error: "service_unavailable"
        }, 503);
        const db = createClient(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
        const body = await req.json();
        const ip = requestIp(req);
        const publicAction = String(body.action || "");
        const actionAllowed = await consumeRateLimit(db, `vacleaner-booking-v5:${publicAction || "unknown"}:ip`, ip, publicAction === "create" ? 5 : publicAction === "loyalty_lookup" ? 20 : 120, publicAction === "create" ? 3600 : 900);
        if (!actionAllowed) return json({
            error: "rate_limited"
        }, 429);
        const { data: settings } = await db.from("vacleaner_settings").select("key,value").in("key", [
            "catalog",
            "deposit_rules",
            "booking_slots",
            "delivery_fee"
        ]);
        const map = Object.fromEntries((settings || []).map((row)=>[
                row.key,
                row.value
            ]));
        const catalog = mergeCatalog(map.catalog), rules = normalizeDepositRules(map.deposit_rules), slots = normalizeSlots(map.booking_slots), deliveryFee = normalizeDeliveryFee(map.delivery_fee);
        const phone = normalizePhone(body.customerPhone);
        let completed = 0, lastCompleted = null;
        if ((publicAction === "create" || publicAction === "loyalty_lookup") && phone) {
            const phoneAllowed = await consumeRateLimit(db, `vacleaner-booking-v5:${publicAction}:phone`, phone, publicAction === "create" ? 5 : 10, publicAction === "create" ? 3600 : 900);
            if (!phoneAllowed) return json({
                error: "rate_limited"
            }, 429);
        }
        if (phone) {
            const { data: completedRows, count, error } = await db.from("vacleaner_bookings").select("return_date", {
                count: "exact"
            }).eq("customer_phone", phone).eq("status", "completed").order("return_date", {
                ascending: false
            }).limit(1);
            if (error) throw error;
            completed = count || 0;
            lastCompleted = completedRows?.[0]?.return_date || null;
        }
        const loyalty = loyaltyFor(completed);
        if (body.action === "loyalty_lookup") return json({
            loyalty: {
                ...loyalty,
                completedOrders: completed
            }
        });
        const productCode = cleanText(body.productCode, 40), product = catalog.products?.[productCode];
        if (!product) return json({
            error: "invalid_product"
        }, 400);
        const startDate = body.startDate, returnDate = body.returnDate, pickupWindow = body.pickupWindow === "evening" ? "evening" : "morning", returnWindow = body.returnWindow === "evening" ? "evening" : "morning";
        if (!isDate(startDate) || !isDate(returnDate)) return json({
            error: "invalid_rental_period"
        }, 400);
        const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
        if (days < 1 || days > 14) return json({
            error: "invalid_rental_period"
        }, 400);
        const av = await availability(db, product, startDate, returnDate, pickupWindow, returnWindow);
        const selected = selectedExtras(body.extras, productCode, catalog), rawBase = rentalBase(product, startDate, returnDate, pickupWindow, returnWindow);
        const promo = await validatePromo(db, {
            code: String(body.promoCode || ""),
            phone,
            productCode,
            startDate,
            returnDate,
            pickupWindow,
            returnWindow,
            completed,
            lastCompleted
        });
        const loyaltyDiscount = Math.round(rawBase * loyalty.percent / 100), promoDiscount = promo?.valid ? promoDiscountAmount({
            discount_type: promo.discountType,
            discount_value: promo.discountValue
        }, rawBase) : 0;
        const promoApplied = Boolean(promo?.valid && promoDiscount > loyaltyDiscount), discount = promoApplied ? promoDiscount : loyaltyDiscount, discountSource = promoApplied ? "promo" : loyalty.percent ? "loyalty" : "none";
        const baseAmount = Math.max(0, rawBase - discount), deliveryAmount = body.fulfillment === "delivery" ? deliveryFee : 0, totalAmount = baseAmount + selected.amount + deliveryAmount;
        const securityDeposit = depositAmount(productCode, startDate, returnDate, pickupWindow, returnWindow, rules, catalog);
        const estimate = {
            rentalDays: days,
            baseBeforeDiscount: rawBase,
            baseAmount,
            extrasAmount: selected.amount,
            deliveryAmount,
            totalAmount,
            prepaymentAmount: 200,
            loyaltyDiscountAmount: loyaltyDiscount,
            promoDiscountAmount: promoDiscount,
            discountAmount: discount,
            discountSource,
            promo: promo ? {
                ...promo,
                applied: promoApplied
            } : null,
            depositAmount: securityDeposit,
            loyalty: {
                ...loyalty,
                completedOrders: completed
            }
        };
        if (body.action === "availability" || body.action === "promo_lookup") return json({
            ...av,
            estimate
        });
        if (body.action !== "create") return json({
            error: "invalid_action"
        }, 400);
        if (body.promoCode && !promo?.valid) return json({
            error: "invalid_promo",
            promo: promo || {
                valid: false,
                reason: "invalid_code"
            },
            estimate
        }, 400);
        if (!av.available) return json({
            error: "not_available",
            ...av,
            estimate
        }, 409);
        const customerName = cleanText(body.customerName, 80), fulfillment = body.fulfillment === "delivery" ? "delivery" : body.fulfillment === "pickup" ? "pickup" : "", address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 180) : fulfillment === "pickup" ? "Полтава, вул. Європейська, 146Е" : "";
        if (customerName.length < 2 || !phone || !fulfillment || body.privacyAccepted !== true || fulfillment === "delivery" && address.length < 8) return json({
            error: "invalid_customer_data"
        }, 400);
        const chemistry = product.resources?.puzzi ? [
            {
                code: "carpet_chemistry_kit",
                label: "Хімія для Puzzi · видано 8 порцій, оплата після повернення за використані",
                quantity: 8,
                unitPrice: 0,
                amount: 0
            },
            ...body.storyMention === true ? [
                {
                    code: "story_mention_bonus",
                    label: "Відмітка у сторіс · 2 використані порції безкоштовно",
                    quantity: 1,
                    unitPrice: 0,
                    amount: 0
                }
            ] : []
        ] : [];
        const discountPercent = discountSource === "promo" && promo?.discountType === "percent" ? Number(promo.discountValue || 0) : discountSource === "loyalty" ? loyalty.percent : 0;
        const extras = {
            items: [
                ...selected.items,
                ...chemistry
            ],
            selected_items: selected.items.map((item)=>({
                    code: item.code,
                    label: item.label,
                    price: item.unitPrice * item.quantity,
                    payment_mode: "upfront"
                })),
            selected_items_amount: selected.amount,
            loyalty: {
                ...loyalty,
                completed_orders: completed
            },
            discount: {
                source: discountSource,
                percent: discountPercent,
                amount: discount
            },
            promo: promo?.valid ? {
                code: promo.code,
                campaign_id: promo.campaignId,
                campaign_name: promo.campaignName,
                campaign_type: promo.campaignType,
                discount_type: promo.discountType,
                discount_value: promo.discountValue,
                applied: promoApplied
            } : null,
            base_before_discount: rawBase
        };
        const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase(), bookingCode = `VAC-${startDate.replaceAll("-", "").slice(2)}-${suffix}`;
        const pickupTime = pickupWindow === "morning" ? slots.morningStart : slots.eveningStart, returnTime = returnWindow === "morning" ? slots.morningEnd : slots.eveningEnd;
        const { data: booking, error } = await db.from("vacleaner_bookings").insert({
            booking_code: bookingCode,
            product_code: productCode,
            product_label: product.label || productCode,
            start_date: startDate,
            return_date: returnDate,
            start_at: `${startDate}T${pickupTime}:00.000Z`,
            end_at: `${returnDate}T${returnTime}:00.000Z`,
            pickup_window: pickupWindow,
            return_window: returnWindow,
            rental_days: days,
            fulfillment,
            fulfillment_address: address,
            customer_name: customerName,
            customer_phone: phone,
            customer_telegram: cleanText(body.customerTelegram, 80) || null,
            customer_comment: cleanText(body.customerComment, 800) || null,
            extras,
            base_amount: baseAmount,
            extras_amount: selected.amount,
            delivery_amount: deliveryAmount,
            total_amount: totalAmount,
            prepayment_amount: 200,
            prepayment_paid: false,
            deposit_amount: securityDeposit,
            deposit_paid: false,
            deposit_returned: false,
            status: "pending",
            source: "vacleaner_website"
        }).select("*").single();
        if (error || !booking) throw error || new Error("insert_failed");
        const resources = Object.entries(product.resources || {}).map(([resource_code, quantity])=>({
                booking_id: booking.id,
                resource_code,
                quantity: Number(quantity || 0)
            })).filter((row)=>row.quantity > 0);
        const { error: resourceError } = await db.from("vacleaner_booking_resources").insert(resources);
        if (resourceError) {
            await db.from("vacleaner_bookings").delete().eq("id", booking.id);
            throw resourceError;
        }
        const now = new Date().toISOString();
        const telegram = cleanText(body.customerTelegram, 80);
        const profilePatch = {
            name: customerName,
            updated_at: now
        };
        if (telegram) profilePatch.telegram = telegram;
        if (fulfillment === "delivery" && address) profilePatch.address = address;
        const { data: existingCustomer, error: customerReadError } = await db.from("vacleaner_customers").select("phone").eq("phone", phone).maybeSingle();
        if (customerReadError) {
            await db.from("vacleaner_bookings").delete().eq("id", booking.id);
            throw customerReadError;
        }
        const customerWrite = existingCustomer ? db.from("vacleaner_customers").update(profilePatch).eq("phone", phone) : db.from("vacleaner_customers").insert({
            phone,
            ...profilePatch,
            telegram: telegram || null,
            address: fulfillment === "delivery" ? address || null : null,
            created_at: now
        });
        const { error: customerError } = await customerWrite;
        if (customerError) {
            await db.from("vacleaner_bookings").delete().eq("id", booking.id);
            throw customerError;
        }
        if (promoApplied && promo?.promoCodeId && promo?.campaignId) {
            const { error: promoError } = await db.rpc("vacleaner_redeem_promo", {
                p_promo_code_id: promo.promoCodeId,
                p_campaign_id: promo.campaignId,
                p_booking_id: booking.id,
                p_customer_phone: phone,
                p_discount_amount: discount,
                p_base_before_discount: rawBase
            });
            if (promoError) {
                await db.from("vacleaner_booking_resources").delete().eq("booking_id", booking.id);
                await db.from("vacleaner_bookings").delete().eq("id", booking.id);
                return json({
                    error: "promo_unavailable",
                    promo: {
                        ...promo,
                        valid: false,
                        reason: "used_or_expired"
                    }
                }, 409);
            }
        }
        await Promise.allSettled([
            notifyTelegram(booking),
            notifyWebPush(db, booking)
        ]);
        return json({
            success: true,
            bookingCode,
            status: "pending",
            estimate,
            loyalty: {
                ...loyalty,
                completedOrders: completed
            },
            promo: estimate.promo,
            telegramText: `Вітаю! Створив(ла) заявку ${bookingCode} на ${product.label}. Прошу підтвердити дату.`
        }, 201);
    } catch (error) {
        console.error("vacleaner-booking-v5", error instanceof Error ? error.message : error);
        return json({
            error: "service_error"
        }, 500);
    }
});
