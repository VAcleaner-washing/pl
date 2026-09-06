from pathlib import Path
import json

ROOT = Path('.')

def replace_exact(path, old, new, count=1):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrences, got {actual}: {old[:140]!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')

# Functional release/cache generation: canonical admin runtime changes, so bump build.
release_path = ROOT / 'release.json'
release = json.loads(release_path.read_text(encoding='utf-8'))
release.update({
    'version': '4.3.12',
    'build': 4312,
    'releasedAt': '2026-09-06',
    'label': 'VAcleaner v4.3.12 — ADMIN FLEX TIME + TWO-LEG LOGISTICS',
})
release_path.write_text(json.dumps(release, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

admin = 'assets/admin-v250.js'
old_time = '''function timeChipPicker(name,value){return `<div class="time-chip-picker" data-time-picker="${name}"><input type="hidden" name="${name}" value="${value}"><div class="time-chip-list"></div></div>`}
function bindTimeWindows(form){['pickup','return'].forEach(kind=>{const windowName=kind+'Window',timeName=kind+'Time',picker=form.querySelector(`[data-time-picker="${timeName}"]`),hidden=picker?.querySelector('input');if(!picker||!hidden)return;const draw=()=>{const code=form.querySelector(`input[name="${windowName}"]:checked`)?.value||'morning',s=getSlots(),start=code==='morning'?s.morningStart:s.eveningStart,end=code==='morning'?s.morningEnd:s.eveningEnd,vals=timesBetween(start,end),selected=vals.includes(hidden.value)?hidden.value:start;hidden.value=selected;picker.querySelector('.time-chip-list').innerHTML=vals.map(v=>`<button type="button" class="time-chip ${v===selected?'active':''}" data-time="${v}">${v}</button>`).join('');picker.querySelectorAll('.time-chip').forEach(btn=>btn.onclick=()=>{hidden.value=btn.dataset.time;picker.querySelectorAll('.time-chip').forEach(x=>x.classList.toggle('active',x===btn))})};form.querySelectorAll(`input[name="${windowName}"]`).forEach(r=>r.onchange=draw);draw()})}'''
new_time = '''function timeChipPicker(name,value){return `<div class="time-chip-picker admin-exact-time-picker" data-time-picker="${name}"><input type="time" name="${name}" value="${value}" step="60" aria-label="Точний час"><small class="admin-time-tariff-hint"></small></div>`}
function bindTimeWindows(form){['pickup','return'].forEach(kind=>{const windowName=kind+'Window',timeName=kind+'Time',picker=form.querySelector(`[data-time-picker="${timeName}"]`),timeInput=picker?.querySelector(`input[name="${timeName}"]`);if(!picker||!timeInput)return;const choice=form.querySelector(`input[name="${windowName}"]`)?.closest('.window-choice');if(choice){choice.hidden=true;choice.setAttribute('aria-hidden','true')}const sync=()=>{const s=getSlots(),time=String(timeInput.value||s.morningStart),code=slotForTime(time),radio=form.querySelector(`input[name="${windowName}"][value="${code}"]`);if(radio&&!radio.checked)radio.checked=true;if(radio)radio.dispatchEvent(new Event('change',{bubbles:true}));const dateInput=form.querySelector(`[name="${kind==='pickup'?'startDate':'returnDate'}"]`),hint=picker.querySelector('.admin-time-tariff-hint'),weekend=dateInput?.value?CORE.isWeekendTariffMoment(dateInput.value,code):false;if(hint)hint.textContent=`Будь-який час · тарифний момент: ${weekend?'вихідний':'будній'} · межа вечора ${s.eveningStart}`};timeInput.addEventListener('input',sync);timeInput.addEventListener('change',sync);form.querySelector(`[name="${kind==='pickup'?'startDate':'returnDate'}"]`)?.addEventListener('change',sync);sync()})}'''
replace_exact(admin, old_time, new_time)

old_fulfillment = '''<label class="field fulfillment-field"><span>Спосіб видачі</span><select name="fulfillment"><option value="pickup" ${v.fulfillment==='pickup'?'selected':''}>Самовивіз</option><option value="delivery" ${v.fulfillment==='delivery'?'selected':''}>Доставка · тариф за адресою</option></select></label>'''
new_fulfillment = '''<div class="admin-logistics-grid wide" data-admin-logistics><input type="hidden" name="fulfillment" value="${v.fulfillment}"><input type="hidden" name="deliveryOutboundMethod" value="${h(b?.extras?.delivery?.outbound_method||(v.fulfillment==='delivery'?'delivery':'pickup'))}"><input type="hidden" name="deliveryReturnMethod" value="${h(b?.extras?.delivery?.return_method||(v.fulfillment==='delivery'?'pickup':'return_to_location'))}"><article class="admin-logistics-card"><div><strong>На початку</strong><small>Передача клієнту</small></div><div class="admin-logistics-toggle"><button type="button" data-logistics-kind="outbound" data-logistics-value="pickup">Клієнт забирає</button><button type="button" data-logistics-kind="outbound" data-logistics-value="delivery">Доставляємо</button></div></article><article class="admin-logistics-card"><div><strong>Повернення</strong><small>Як техніка повертається</small></div><div class="admin-logistics-toggle"><button type="button" data-logistics-kind="return" data-logistics-value="return_to_location">Клієнт повертає</button><button type="button" data-logistics-kind="return" data-logistics-value="pickup">Забираємо</button></div></article><p class="admin-logistics-note" id="adminLogisticsNote"></p></div>'''
replace_exact(admin, old_fulfillment, new_fulfillment)

old_delivery_decl = '''const deliveryRouteLink=form.querySelector('#bookingDeliveryRoute'),deliveryPricingField=form.querySelector('.delivery-pricing-field'),deliveryAddressSummary=form.querySelector('#bookingDeliveryAddressSummary'),deliveryAmountInput=form.querySelector('[name="deliveryAmountOverride"]'),deliveryQuoteHint=form.querySelector('#bookingDeliveryQuoteHint');'''
new_delivery_decl = '''const deliveryRouteLink=form.querySelector('#bookingDeliveryRoute'),deliveryPricingField=form.querySelector('.delivery-pricing-field'),deliveryAddressSummary=form.querySelector('#bookingDeliveryAddressSummary'),deliveryAmountInput=form.querySelector('[name="deliveryAmountOverride"]'),deliveryQuoteHint=form.querySelector('#bookingDeliveryQuoteHint'),deliveryOutboundInput=form.querySelector('[name="deliveryOutboundMethod"]'),deliveryReturnInput=form.querySelector('[name="deliveryReturnMethod"]'),deliveryLogisticsNote=form.querySelector('#adminLogisticsNote');
const deliveryLegCount=()=>Number(deliveryOutboundInput?.value==='delivery')+Number(deliveryReturnInput?.value==='pickup');
const deliveryTripMultiplierForBooking=booking=>{const stored=Number(booking?.extras?.delivery?.trip_multiplier);if([0,2,4].includes(stored))return stored;const legs=Number(booking?.extras?.delivery?.legs);return legs===1?2:legs===0?0:4};
const syncLogisticsButtons=()=>{const legs=deliveryLegCount();form.fulfillment.value=legs?'delivery':'pickup';form.querySelectorAll('[data-logistics-kind]').forEach(btn=>{const active=btn.dataset.logisticsKind==='outbound'?btn.dataset.logisticsValue===deliveryOutboundInput?.value:btn.dataset.logisticsValue===deliveryReturnInput?.value;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false')});if(deliveryLogisticsNote)deliveryLogisticsNote.textContent=legs===0?'Без доставки · клієнт сам забирає і повертає':legs===1?'1 напрямок VAcleaner · тариф доставки 50%':'2 напрямки VAcleaner · повний тариф доставки'};'''
replace_exact(admin, old_delivery_decl, new_delivery_decl)

old_quote = '''const syncAdminDeliveryQuote=({force=false}={})=>{if(!deliveryAmountInput)return;const delivery=form.fulfillment?.value==='delivery';if(!delivery)return;const meta=window.__VAC_ADMIN_DELIVERY_META__?.()||{},quote=adminDeliveryQuote(addressInput?.value||'',meta.verified===true,meta.routeKm);if(force||deliveryAmountInput.dataset.manual!=='1'){deliveryAmountInput.value=quote.quoteRequired?'':String(quote.amount||getDeliveryFee())}if(deliveryQuoteHint){const pricing=getDeliveryPricing();deliveryQuoteHint.textContent=quote.quoteRequired?`Тариф не розраховано автоматично${Number.isFinite(Number(quote.distanceKm))?` · ${Number(quote.distanceKm).toFixed(1).replace('.',',')} км за межами Полтави`:''}. Вкажіть узгоджену суму вручну до збереження.`:quote.zone==='route_zone'?`${quote.amount} грн · ${quote.distanceKm.toFixed(1).replace('.',',')} км маршрутом від бази · зона до ${quote.maxKm} км.`:quote.zone==='local'?`${pricing.local} грн · локальна зона${Number.isFinite(Number(meta.routeKm))&&Number(meta.routeKm)>0?` · ${Number(meta.routeKm).toFixed(1).replace('.',',')} км від бази`:''}.`:'Тариф визначиться після введення адреси.'}};
const syncFulfillmentUi=()=>{const delivery=form.fulfillment?.value==='delivery';if(deliveryPricingField){deliveryPricingField.hidden=!delivery;deliveryPricingField.setAttribute('aria-hidden',delivery?'false':'true')}if(addressInput){addressInput.disabled=false;addressInput.required=delivery}if(deliveryAmountInput)deliveryAmountInput.disabled=!delivery;syncDeliveryRoute();if(delivery)syncAdminDeliveryQuote()};
addressInput?.addEventListener('input',()=>{syncDeliveryRoute();deliveryAmountInput?.removeAttribute('data-manual');syncAdminDeliveryQuote()});deliveryAmountInput?.addEventListener('input',()=>{deliveryAmountInput.dataset.manual='1'});document.addEventListener('vacleaner:address-selected',event=>{if(event.detail?.mode==='admin'){deliveryAmountInput?.removeAttribute('data-manual');syncAdminDeliveryQuote({force:true})}});form.fulfillment?.addEventListener('change',syncFulfillmentUi);syncFulfillmentUi();'''
new_quote = '''const syncAdminDeliveryQuote=({force=false}={})=>{if(!deliveryAmountInput)return;const legs=deliveryLegCount(),delivery=legs>0;if(!delivery)return;const meta=window.__VAC_ADMIN_DELIVERY_META__?.()||{},quote=adminDeliveryQuote(addressInput?.value||'',meta.verified===true,meta.routeKm),roundTrip=quote.quoteRequired?0:Number(quote.amount||getDeliveryFee()),adjusted=Math.round(roundTrip*legs/2);if(force||deliveryAmountInput.dataset.manual!=='1'){deliveryAmountInput.value=quote.quoteRequired?'':String(adjusted)}if(deliveryQuoteHint){const direction=legs===1?`1 напрямок із 2 · 50% від повного тарифу ${roundTrip} грн`:'доставка + забір · повний тариф';deliveryQuoteHint.textContent=quote.quoteRequired?`Тариф не розраховано автоматично${Number.isFinite(Number(quote.distanceKm))?` · ${Number(quote.distanceKm).toFixed(1).replace('.',',')} км за межами Полтави`:''}. Вкажіть узгоджену суму вручну до збереження.`:quote.zone==='route_zone'?`${adjusted} грн · ${direction} · ${quote.distanceKm.toFixed(1).replace('.',',')} км до клієнта.`:quote.zone==='local'?`${adjusted} грн · ${direction} · локальна зона.`:'Тариф визначиться після введення адреси.'}};
const syncFulfillmentUi=()=>{syncLogisticsButtons();const delivery=deliveryLegCount()>0;if(deliveryPricingField){deliveryPricingField.hidden=!delivery;deliveryPricingField.setAttribute('aria-hidden',delivery?'false':'true')}if(addressInput){addressInput.disabled=false;addressInput.required=delivery}if(deliveryAmountInput)deliveryAmountInput.disabled=!delivery;syncDeliveryRoute();if(delivery)syncAdminDeliveryQuote()};
form.querySelectorAll('[data-logistics-kind]').forEach(btn=>btn.addEventListener('click',()=>{const target=btn.dataset.logisticsKind==='outbound'?deliveryOutboundInput:deliveryReturnInput;if(!target)return;target.value=btn.dataset.logisticsValue||'';deliveryAmountInput?.removeAttribute('data-manual');syncLogisticsButtons();form.fulfillment.dispatchEvent(new Event('change',{bubbles:true}))}));addressInput?.addEventListener('input',()=>{syncDeliveryRoute();deliveryAmountInput?.removeAttribute('data-manual');syncAdminDeliveryQuote()});deliveryAmountInput?.addEventListener('input',()=>{deliveryAmountInput.dataset.manual='1'});document.addEventListener('vacleaner:address-selected',event=>{if(event.detail?.mode==='admin'){deliveryAmountInput?.removeAttribute('data-manual');syncAdminDeliveryQuote({force:true})}});form.fulfillment?.addEventListener('change',syncFulfillmentUi);syncFulfillmentUi();'''
replace_exact(admin, old_quote, new_quote)

replace_exact(
    admin,
    '''form.querySelector('[data-time-picker="pickupTime"]')?.addEventListener('click',e=>{if(e.target.closest('[data-time]'))setTimeout(syncReturn,0)});''',
    '''form.querySelector('[name="pickupTime"]')?.addEventListener('change',()=>setTimeout(syncReturn,0));'''
)

replace_exact(
    admin,
    '''customerAddress:deliveryParts.address,customerAddressDetail:deliveryParts.detail,fulfillment:fd.get('fulfillment'),deliveryAddress:deliveryParts.address''',
    '''customerAddress:deliveryParts.address,customerAddressDetail:deliveryParts.detail,fulfillment:fd.get('fulfillment'),deliveryOutboundMethod:fd.get('deliveryOutboundMethod'),deliveryReturnMethod:fd.get('deliveryReturnMethod'),deliveryAddress:deliveryParts.address'''
)

old_sample = '''function recentDeliverySample(limit=30,pricing=getDeliveryPricing()){
  return state.bookings.filter(b=>b.status==='completed'&&b.fulfillment==='delivery').slice().sort((a,b)=>String(bookingCompletionDateIso(b)||'').localeCompare(String(bookingCompletionDateIso(a)||''))||String(b.completed_at||b.updated_at||'').localeCompare(String(a.completed_at||a.updated_at||''))).slice(0,Math.max(1,Number(limit)||30)).map(b=>{const meta=bookingDeliveryTypeMeta(b,pricing),deliveryMeta=b?.extras?.delivery&&typeof b.extras.delivery==='object'?b.extras.delivery:{},paid=Math.max(0,Number(b.delivery_amount)||Number(deliveryMeta.amount)||0),distanceSource=String(deliveryMeta.distance_source||deliveryMeta.distanceSource||'');return{booking:b,routeKm:Math.max(0,Number(meta.routeKm)||0),paid,priceKnown:paid>0,isLocal:meta.isLocal,distanceSource,routeNeedsRefresh:!meta.routeKm||['city','local','estimate','estimate_city','admin_backfill'].includes(distanceSource)}})
}
function fuelPriceForCar(car,fuel){return car?.fuelType==='lpg'?Number(fuel.lpgPerL)||0:Number(fuel.petrolPerL)||0}
function sampleFuelCost(row,car,pricing=getDeliveryPricing()){const fuel=pricing.fuel||DEFAULT_DELIVERY_PRICING.fuel,consumption=row?.isLocal?Number(car?.consumptionL100)||0:Number(fuel.consumptionL100)||0;return deliveryFuelCost(Math.max(0,Number(row?.routeKm)||0),fuelPriceForCar(car,fuel),consumption,4)}
function bookingEstimatedFuelProfiles(b,pricing=getDeliveryPricing()){
  if(b.fulfillment!=='delivery'||bookingRouteNeedsRefresh(b))return[];
  const meta=bookingDeliveryTypeMeta(b,pricing),routeKm=Math.max(0,Number(meta.routeKm)||0),fuel=pricing.fuel||DEFAULT_DELIVERY_PRICING.fuel;
  if(!routeKm)return[];
  if(meta.isLocal)return(fuel.cityCars||DEFAULT_CITY_CARS).map(car=>({label:car.label,fuelType:car.fuelType==='lpg'?'lpg':'petrol',cost:deliveryFuelCost(routeKm,fuelPriceForCar(car,fuel),car.consumptionL100,4),consumptionL100:Number(car.consumptionL100)||0,kind:'local'}));
  return[{label:'Маршрут',cost:deliveryFuelCost(routeKm,fuel.petrolPerL,fuel.consumptionL100,4),consumptionL100:Number(fuel.consumptionL100)||0,kind:'route'}]
}'''
new_sample = '''function recentDeliverySample(limit=30,pricing=getDeliveryPricing()){
  return state.bookings.filter(b=>b.status==='completed'&&b.fulfillment==='delivery').slice().sort((a,b)=>String(bookingCompletionDateIso(b)||'').localeCompare(String(bookingCompletionDateIso(a)||''))||String(b.completed_at||b.updated_at||'').localeCompare(String(a.completed_at||a.updated_at||''))).slice(0,Math.max(1,Number(limit)||30)).map(b=>{const meta=bookingDeliveryTypeMeta(b,pricing),deliveryMeta=b?.extras?.delivery&&typeof b.extras.delivery==='object'?b.extras.delivery:{},paid=Math.max(0,Number(b.delivery_amount)||Number(deliveryMeta.amount)||0),distanceSource=String(deliveryMeta.distance_source||deliveryMeta.distanceSource||''),tripMultiplier=deliveryTripMultiplierForBooking(b);return{booking:b,routeKm:Math.max(0,Number(meta.routeKm)||0),paid,priceKnown:paid>0,isLocal:meta.isLocal,distanceSource,tripMultiplier,routeNeedsRefresh:!meta.routeKm||['city','local','estimate','estimate_city','admin_backfill'].includes(distanceSource)}})
}
function fuelPriceForCar(car,fuel){return car?.fuelType==='lpg'?Number(fuel.lpgPerL)||0:Number(fuel.petrolPerL)||0}
function sampleFuelCost(row,car,pricing=getDeliveryPricing()){const fuel=pricing.fuel||DEFAULT_DELIVERY_PRICING.fuel,consumption=row?.isLocal?Number(car?.consumptionL100)||0:Number(fuel.consumptionL100)||0;return deliveryFuelCost(Math.max(0,Number(row?.routeKm)||0),fuelPriceForCar(car,fuel),consumption,Number(row?.tripMultiplier)||4)}
function bookingEstimatedFuelProfiles(b,pricing=getDeliveryPricing()){
  if(b.fulfillment!=='delivery'||bookingRouteNeedsRefresh(b))return[];
  const meta=bookingDeliveryTypeMeta(b,pricing),routeKm=Math.max(0,Number(meta.routeKm)||0),fuel=pricing.fuel||DEFAULT_DELIVERY_PRICING.fuel,tripMultiplier=deliveryTripMultiplierForBooking(b);
  if(!routeKm)return[];
  if(meta.isLocal)return(fuel.cityCars||DEFAULT_CITY_CARS).map(car=>({label:car.label,fuelType:car.fuelType==='lpg'?'lpg':'petrol',cost:deliveryFuelCost(routeKm,fuelPriceForCar(car,fuel),car.consumptionL100,tripMultiplier),consumptionL100:Number(car.consumptionL100)||0,kind:'local'}));
  return[{label:'Маршрут',cost:deliveryFuelCost(routeKm,fuel.petrolPerL,fuel.consumptionL100,tripMultiplier),consumptionL100:Number(fuel.consumptionL100)||0,kind:'route'}]
}'''
replace_exact(admin, old_sample, new_sample)
replace_exact(
    admin,
    '''const routeKm=bookingRouteNeedsRefresh(b)?null:Math.max(0,bookingRouteKm(b)||0)||null,fullTripKm=routeKm===null?null:routeKm*4;''',
    '''const routeKm=bookingRouteNeedsRefresh(b)?null:Math.max(0,bookingRouteKm(b)||0)||null,fullTripKm=routeKm===null?null:routeKm*deliveryTripMultiplierForBooking(b);'''
)

css_path = ROOT / 'assets/admin-v250.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* v4.3.12 — admin-only exact time + two-leg logistics */'
if marker not in css:
    css += '''\n\n/* v4.3.12 — admin-only exact time + two-leg logistics */
#bookingForm .rental-moment .window-choice[hidden]{display:none!important}
#bookingForm .admin-exact-time-picker{display:grid;gap:6px;margin-top:8px}
#bookingForm .admin-exact-time-picker input[type="time"]{width:100%;min-height:46px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.055);color:inherit;padding:0 12px;font:inherit;font-weight:700}
#bookingForm .admin-time-tariff-hint{font-size:12px;line-height:1.35;color:var(--muted,#9ca5ad)}
#bookingForm .admin-logistics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#bookingForm .admin-logistics-card{min-width:0;border:1px solid rgba(255,255,255,.11);border-radius:14px;padding:12px;background:rgba(255,255,255,.035);display:grid;gap:10px}
#bookingForm .admin-logistics-card>div:first-child{display:grid;gap:2px}
#bookingForm .admin-logistics-card strong{font-size:14px}
#bookingForm .admin-logistics-card small,#bookingForm .admin-logistics-note{font-size:12px;color:var(--muted,#9ca5ad)}
#bookingForm .admin-logistics-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#bookingForm .admin-logistics-toggle button{min-width:0;min-height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);color:inherit;padding:8px 9px;font:inherit;font-size:12px;font-weight:750;line-height:1.15}
#bookingForm .admin-logistics-toggle button.active{border-color:rgba(224,190,120,.72);background:rgba(224,190,120,.13);box-shadow:inset 0 0 0 1px rgba(224,190,120,.16)}
#bookingForm .admin-logistics-note{grid-column:1/-1;margin:0;padding:0 2px}
@media(max-width:680px){#bookingForm .admin-logistics-grid{grid-template-columns:1fr}#bookingForm .admin-logistics-note{grid-column:auto}}
'''
    css_path.write_text(css, encoding='utf-8')

edge = 'supabase/functions/vacleaner-admin-bookings-v4/index.ts'
replace_exact(
    edge,
    '''const validTime = (value: unknown) => typeof value === "string" && /^\\d{2}:\\d{2}$/.test(value);''',
    '''const validTime = (value: unknown) => typeof value === "string" && /^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(value);'''
)

old_period = '''function periodFromBody(body: Record<string, any>, slots: SlotConfig) {
  const startDate = dateValue(body.startDate), returnDate = dateValue(body.returnDate);
  const pickupWindow = body.pickupWindow === "evening" ? "evening" : "morning";
  const returnWindow = body.returnWindow === "evening" ? "evening" : "morning";
  const pickupTime = String(body.pickupTime || (pickupWindow === "morning" ? slots.morningStart : slots.eveningStart));
  const returnTime = String(body.returnTime || (returnWindow === "morning" ? slots.morningEnd : slots.eveningEnd));
  if (!startDate || !returnDate) throw new Error("invalid_dates");
  if (!validTime(pickupTime) || !validTime(returnTime) || !inWindow(pickupTime, pickupWindow, slots) || !inWindow(returnTime, returnWindow, slots)) throw new Error("invalid_exact_time");
  const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
  if (days < 1 || days > 14) throw new Error("invalid_rental_period");
  return { startDate, returnDate, pickupWindow, returnWindow, pickupTime, returnTime, days };
}'''
new_period = '''function periodFromBody(body: Record<string, any>, slots: SlotConfig) {
  const startDate = dateValue(body.startDate), returnDate = dateValue(body.returnDate);
  const requestedPickupWindow = body.pickupWindow === "evening" ? "evening" : "morning";
  const requestedReturnWindow = body.returnWindow === "evening" ? "evening" : "morning";
  const pickupTime = String(body.pickupTime || (requestedPickupWindow === "morning" ? slots.morningStart : slots.eveningStart));
  const returnTime = String(body.returnTime || (requestedReturnWindow === "morning" ? slots.morningEnd : slots.eveningEnd));
  if (!startDate || !returnDate) throw new Error("invalid_dates");
  if (!validTime(pickupTime) || !validTime(returnTime)) throw new Error("invalid_exact_time");
  // Admin accepts any exact clock time. Existing tariff/inventory semantics remain half-day based:
  // from eveningStart (currently 17:30) onward = evening; earlier = morning.
  const pickupWindow: WindowCode = pickupTime >= slots.eveningStart ? "evening" : "morning";
  const returnWindow: WindowCode = returnTime >= slots.eveningStart ? "evening" : "morning";
  const days = rentalDays(startDate, returnDate, pickupWindow, returnWindow);
  if (days < 1 || days > 14) throw new Error("invalid_rental_period");
  return { startDate, returnDate, pickupWindow, returnWindow, pickupTime, returnTime, days };
}'''
replace_exact(edge, old_period, new_period)

old_customer = '''const customerName = cleanText(body.customerName, 120), customerPhone = normalizePhone(body.customerPhone), fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
      const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 220) : "Полтава, вул. Європейська, 146Е", addressDetail = fulfillment === "delivery" ? cleanText(body.deliveryAddressDetail, 180) : "";'''
new_customer = '''const customerName = cleanText(body.customerName, 120), customerPhone = normalizePhone(body.customerPhone);
      const requestedFulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
      const outboundMethod = body.deliveryOutboundMethod === "pickup" ? "pickup" : body.deliveryOutboundMethod === "delivery" ? "delivery" : requestedFulfillment === "delivery" ? "delivery" : "pickup";
      const returnMethod = body.deliveryReturnMethod === "return_to_location" ? "return_to_location" : body.deliveryReturnMethod === "pickup" ? "pickup" : requestedFulfillment === "delivery" ? "pickup" : "return_to_location";
      const deliveryLegs = Number(outboundMethod === "delivery") + Number(returnMethod === "pickup"), deliveryFactor = deliveryLegs / 2;
      const fulfillment = deliveryLegs > 0 ? "delivery" : "pickup";
      const address = fulfillment === "delivery" ? cleanText(body.deliveryAddress, 220) : "Полтава, вул. Європейська, 146Е", addressDetail = fulfillment === "delivery" ? cleanText(body.deliveryAddressDetail, 180) : "";'''
replace_exact(edge, old_customer, new_customer)

old_amount = '''const requestedDeliveryOverride = body.deliveryAmountOverride === undefined || body.deliveryAmountOverride === null || body.deliveryAmountOverride === "" ? null : cleanInt(body.deliveryAmountOverride, 100000);
      const autoDelivery = deliveryQuote(fulfillment, address, body.deliveryAddressVerified === true, body.deliveryRouteKm ?? body.deliveryDistanceKm, deliveryPricing);
      const preserveExistingDelivery = Boolean(existing?.fulfillment === "delivery" && Number(existing.delivery_amount) > 0 && requestedDeliveryOverride === null);
      const deliveryAmount = fulfillment === "delivery"
        ? requestedDeliveryOverride !== null ? requestedDeliveryOverride : preserveExistingDelivery ? Math.max(0, Number(existing.delivery_amount) || 0) : autoDelivery.amount
        : 0, prepaymentPaid = body.prepaymentPaid === true || existing?.prepayment_paid === true;'''
new_amount = '''const requestedDeliveryOverride = body.deliveryAmountOverride === undefined || body.deliveryAmountOverride === null || body.deliveryAmountOverride === "" ? null : cleanInt(body.deliveryAmountOverride, 100000);
      const autoDelivery = deliveryQuote(fulfillment, address, body.deliveryAddressVerified === true, body.deliveryRouteKm ?? body.deliveryDistanceKm, deliveryPricing);
      const deliveryModeExplicit = body.deliveryOutboundMethod !== undefined || body.deliveryReturnMethod !== undefined;
      const preserveExistingDelivery = Boolean(existing?.fulfillment === "delivery" && Number(existing.delivery_amount) > 0 && requestedDeliveryOverride === null && !deliveryModeExplicit);
      const automaticDeliveryAmount = Math.round((Number(autoDelivery.amount) || 0) * deliveryFactor);
      const deliveryAmount = fulfillment === "delivery"
        ? requestedDeliveryOverride !== null ? requestedDeliveryOverride : preserveExistingDelivery ? Math.max(0, Number(existing.delivery_amount) || 0) : automaticDeliveryAmount
        : 0, prepaymentPaid = body.prepaymentPaid === true || existing?.prepayment_paid === true;'''
replace_exact(edge, old_amount, new_amount)

old_delivery_extra = '''delivery: fulfillment === "delivery" ? { zone: requestedDeliveryOverride !== null ? "manual" : preserveExistingDelivery ? (currentExtras?.delivery?.zone || "snapshot") : autoDelivery.zone, quote_required: requestedDeliveryOverride !== null ? false : preserveExistingDelivery ? Boolean(currentExtras?.delivery?.quote_required) : autoDelivery.quoteRequired, verified: body.deliveryAddressVerified === true, settlement: autoDelivery.settlement, amount: deliveryAmount, pricing_distance_km: autoDelivery.distanceKm, extra_km: autoDelivery.extraKm, route_km: Number.isFinite(Number(body.deliveryRouteKm)) ? Number(body.deliveryRouteKm) : null, distance_source: cleanText(body.deliveryDistanceSource, 24) || null } : { zone: "pickup", quote_required: false, amount: 0 },'''
new_delivery_extra = '''delivery: fulfillment === "delivery" ? { zone: requestedDeliveryOverride !== null ? "manual" : preserveExistingDelivery ? (currentExtras?.delivery?.zone || "snapshot") : autoDelivery.zone, quote_required: requestedDeliveryOverride !== null ? false : preserveExistingDelivery ? Boolean(currentExtras?.delivery?.quote_required) : autoDelivery.quoteRequired, verified: body.deliveryAddressVerified === true, settlement: autoDelivery.settlement, amount: deliveryAmount, round_trip_amount: Number(autoDelivery.amount) || 0, outbound_method: outboundMethod, return_method: returnMethod, legs: deliveryLegs, factor: deliveryFactor, trip_multiplier: deliveryLegs * 2, pricing_distance_km: autoDelivery.distanceKm, extra_km: autoDelivery.extraKm, route_km: Number.isFinite(Number(body.deliveryRouteKm)) ? Number(body.deliveryRouteKm) : null, distance_source: cleanText(body.deliveryDistanceSource, 24) || null } : { zone: "pickup", quote_required: false, amount: 0, outbound_method: outboundMethod, return_method: returnMethod, legs: 0, factor: 0, trip_multiplier: 0 },'''
replace_exact(edge, old_delivery_extra, new_delivery_extra)

# Wire targeted regressions into canonical gates.
pkg_path = ROOT / 'package.json'
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
if 'test-v4-3-12-admin-time-logistics.mjs' not in pkg['scripts']['test:pwa-static']:
    pkg['scripts']['test:pwa-static'] += ' && node scripts/test-v4-3-12-admin-time-logistics.mjs'
pkg['scripts']['test:admin-booking-flex'] = 'python scripts/admin_booking_v4312_visual_qa.py'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

suites_path = ROOT / 'config/qa-suites.json'
suites = json.loads(suites_path.read_text(encoding='utf-8'))
if 'test:admin-booking-flex' not in suites['browser']:
    suites['browser'].append('test:admin-booking-flex')
suites_path.write_text(json.dumps(suites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

spec_path = ROOT / 'docs/VAcleaner-SYSTEM-SPEC.md'
spec = spec_path.read_text(encoding='utf-8')
if '# 70. Change record — v4.3.12 ADMIN FLEX TIME + TWO-LEG LOGISTICS' not in spec:
    spec += '''\n\n# 70. Change record — v4.3.12 ADMIN FLEX TIME + TWO-LEG LOGISTICS

### ADDED

- **BOOK-ADMIN-TIME-001** — менеджер в адмінці може вказати точний час видачі та повернення з точністю до хвилини, без обмеження публічними вікнами 08:00–10:00 / 17:30–20:00.
- **BOOK-ADMIN-LOGISTICS-001** — логістика адмін-бронювання має два незалежні напрямки: `На початку` (`Клієнт забирає` / `Доставляємо`) і `Повернення` (`Клієнт повертає` / `Забираємо`).
- `extras.delivery` зберігає `outbound_method`, `return_method`, `legs`, `factor`, `round_trip_amount` і `trip_multiplier`.

### CHANGED

- **Тільки адмінка:** точний час автоматично мапиться на існуючу тарифну/availability модель: час від поточної `eveningStart` (зараз 17:30) — `evening`, усе раніше — `morning`.
- Приклад: неділя 14:00 залишається вихідним тарифним моментом; будній день до 17:30 працює як поточний ранковий/будній момент, а чинна межа 17:30 зберігає існуючу логіку.
- Доставка рахується за кількістю напрямків VAcleaner: 0 напрямків = 0%, 1 напрямок = 50%, 2 напрямки = 100% поточного тарифу за адресою. Для локального тарифу 250 грн один напрямок = 125 грн.
- Паливна собівартість та повний пробіг використовують `×2` для одного напрямку VAcleaner і `×4` для двох.

### PRESERVED

- **Публічне бронювання на сайті не змінено:** клієнт і далі бачить і використовує поточні ранкові/вечірні слоти та чинну публічну delivery-модель.
- Каталог, базові weekday/weekend ціни, Friday/Saturday/Sunday tariff semantics, deposit groups, inventory half-day capacity model, SMS/RETURN, referral, VA HOME та public booking Edge function не змінені.
- Менеджер як і раніше може вручну скоригувати суму доставки, якщо автоматичний маршрут/тариф потребує погодження.

### TESTS

- `scripts/test-v4-3-12-admin-time-logistics.mjs` через canonical `test:pwa-static`.
- `scripts/admin_booking_v4312_visual_qa.py` через Browser QA перевіряє 390 / 430 px, exact-time control, дві логістичні картки та приклад 125 грн для одного локального напрямку.
- Full canonical Static/build + Browser/PWA QA remains release-blocking before merge; production Supabase Edge deployment is allowed only after the green PR gate.
'''
    spec_path.write_text(spec, encoding='utf-8')

print('v4.3.12 patch applied')
