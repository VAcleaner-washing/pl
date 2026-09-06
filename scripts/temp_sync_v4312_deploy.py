from pathlib import Path

p=Path('supabase/functions/vacleaner-admin-bookings-v4/index.deploy.js')
s=p.read_text(encoding='utf-8')

def rep(old,new):
    global s
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'expected exactly one match, got {n}: {old[:100]!r}')
    s=s.replace(old,new)

rep('const validTime = (value)=>typeof value === "string" && /^\\d{2}:\\d{2}$/.test(value);',
    'const validTime = (value)=>typeof value === "string" && /^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(value);')

rep('''function periodFromBody(body, slots) {
    const startDate = dateValue(body.startDate), returnDate = dateValue(body.returnDate);
    const pickupWindow = body.pickupWindow === "evening" ? "evening" : "morning";
    const returnWindow = body.returnWindow === "evening" ? "evening" : "morning";
    const pickupTime = String(body.pickupTime || (pickupWindow === "morning" ? slots.morningStart : slots.eveningStart));
    const returnTime = String(body.returnTime || (returnWindow === "morning" ? slots.morningEnd : slots.eveningEnd));
    if (!startDate || !returnDate) throw new Error("invalid_dates");
    if (!validTime(pickupTime) || !validTime(returnTime) || !inWindow(pickupTime, pickupWindow, slots) || !inWindow(returnTime, returnWindow, slots)) throw new Error("invalid_exact_time");
    const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
''','''function periodFromBody(body, slots) {
    const startDate = dateValue(body.startDate), returnDate = dateValue(body.returnDate);
    const requestedPickupWindow = body.pickupWindow === "evening" ? "evening" : "morning";
    const requestedReturnWindow = body.returnWindow === "evening" ? "evening" : "morning";
    const pickupTime = String(body.pickupTime || (requestedPickupWindow === "morning" ? slots.morningStart : slots.eveningStart));
    const returnTime = String(body.returnTime || (requestedReturnWindow === "morning" ? slots.morningEnd : slots.eveningEnd));
    if (!startDate || !returnDate) throw new Error("invalid_dates");
    if (!validTime(pickupTime) || !validTime(returnTime)) throw new Error("invalid_exact_time");
    const pickupWindow = pickupTime >= slots.eveningStart ? "evening" : "morning";
    const returnWindow = returnTime >= slots.eveningStart ? "evening" : "morning";
    const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
''')

rep('''            const customerName = cleanText(body.customerName, 120), customerPhone = normalizePhone(body.customerPhone), fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
            const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 220) : "Полтава, вул. Європейська, 146Е", addressDetail = fulfillment === "delivery" ? cleanText(body.deliveryAddressDetail, 180) : "";
''','''            const customerName = cleanText(body.customerName, 120), customerPhone = normalizePhone(body.customerPhone);
            const requestedFulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
            const outboundMethod = body.deliveryOutboundMethod === "pickup" ? "pickup" : body.deliveryOutboundMethod === "delivery" ? "delivery" : requestedFulfillment === "delivery" ? "delivery" : "pickup";
            const returnMethod = body.deliveryReturnMethod === "return_to_location" ? "return_to_location" : body.deliveryReturnMethod === "pickup" ? "pickup" : requestedFulfillment === "delivery" ? "pickup" : "return_to_location";
            const deliveryLegs = Number(outboundMethod === "delivery") + Number(returnMethod === "pickup"), deliveryFactor = deliveryLegs / 2;
            const fulfillment = deliveryLegs > 0 ? "delivery" : "pickup";
            const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 220) : "Полтава, вул. Європейська, 146Е", addressDetail = fulfillment === "delivery" ? cleanText(body.deliveryAddressDetail, 180) : "";
''')

rep('''            const autoDelivery = deliveryQuote(fulfillment, address, body.deliveryAddressVerified === true, body.deliveryRouteKm ?? body.deliveryDistanceKm, deliveryPricing);
            const preserveExistingDelivery = Boolean(existing?.fulfillment === "delivery" && Number(existing.delivery_amount) > 0 && requestedDeliveryOverride === null);
            const deliveryAmount = fulfillment === "delivery" ? requestedDeliveryOverride !== null ? requestedDeliveryOverride : preserveExistingDelivery ? Math.max(0, Number(existing.delivery_amount) || 0) : autoDelivery.amount : 0, prepaymentPaid = body.prepaymentPaid === true || existing?.prepayment_paid === true;
''','''            const autoDelivery = deliveryQuote(fulfillment, address, body.deliveryAddressVerified === true, body.deliveryRouteKm ?? body.deliveryDistanceKm, deliveryPricing);
            const deliveryModeExplicit = body.deliveryOutboundMethod !== undefined || body.deliveryReturnMethod !== undefined;
            const preserveExistingDelivery = Boolean(existing?.fulfillment === "delivery" && Number(existing.delivery_amount) > 0 && requestedDeliveryOverride === null && !deliveryModeExplicit);
            const automaticDeliveryAmount = Math.round((Number(autoDelivery.amount) || 0) * deliveryFactor);
            const deliveryAmount = fulfillment === "delivery" ? requestedDeliveryOverride !== null ? requestedDeliveryOverride : preserveExistingDelivery ? Math.max(0, Number(existing.delivery_amount) || 0) : automaticDeliveryAmount : 0, prepaymentPaid = body.prepaymentPaid === true || existing?.prepayment_paid === true;
''')

rep('''                delivery: fulfillment === "delivery" ? {
                    zone: requestedDeliveryOverride !== null ? "manual" : preserveExistingDelivery ? currentExtras?.delivery?.zone || "snapshot" : autoDelivery.zone,
                    quote_required: requestedDeliveryOverride !== null ? false : preserveExistingDelivery ? Boolean(currentExtras?.delivery?.quote_required) : autoDelivery.quoteRequired,
                    verified: body.deliveryAddressVerified === true,
                    settlement: autoDelivery.settlement,
                    amount: deliveryAmount,
                    pricing_distance_km: autoDelivery.distanceKm,
                    extra_km: autoDelivery.extraKm,
                    route_km: Number.isFinite(Number(body.deliveryRouteKm)) ? Number(body.deliveryRouteKm) : null,
                    distance_source: cleanText(body.deliveryDistanceSource, 24) || null
                } : {
                    zone: "pickup",
                    quote_required: false,
                    amount: 0
                },
''','''                delivery: fulfillment === "delivery" ? {
                    zone: requestedDeliveryOverride !== null ? "manual" : preserveExistingDelivery ? currentExtras?.delivery?.zone || "snapshot" : autoDelivery.zone,
                    quote_required: requestedDeliveryOverride !== null ? false : preserveExistingDelivery ? Boolean(currentExtras?.delivery?.quote_required) : autoDelivery.quoteRequired,
                    verified: body.deliveryAddressVerified === true,
                    settlement: autoDelivery.settlement,
                    amount: deliveryAmount,
                    round_trip_amount: Number(autoDelivery.amount) || 0,
                    outbound_method: outboundMethod,
                    return_method: returnMethod,
                    legs: deliveryLegs,
                    factor: deliveryFactor,
                    trip_multiplier: deliveryLegs * 2,
                    pricing_distance_km: autoDelivery.distanceKm,
                    extra_km: autoDelivery.extraKm,
                    route_km: Number.isFinite(Number(body.deliveryRouteKm)) ? Number(body.deliveryRouteKm) : null,
                    distance_source: cleanText(body.deliveryDistanceSource, 24) || null
                } : {
                    zone: "pickup",
                    quote_required: false,
                    amount: 0,
                    outbound_method: outboundMethod,
                    return_method: returnMethod,
                    legs: 0,
                    factor: 0,
                    trip_multiplier: 0
                },
''')

p.write_text(s,encoding='utf-8')
