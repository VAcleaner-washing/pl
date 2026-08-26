(()=>{
'use strict';
const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
const CORE_SLOTS=window.VACLEANER_CORE?.slots||{morningStart:'08:00',morningEnd:'10:00',eveningStart:'17:30',eveningEnd:'20:00'};
let slots={...CORE_SLOTS};
let depositRules={oneUnit:{day:1000,weekend:2000},twoUnits:{day:1500,weekend:3000},general:{day:2000,weekend:3000},elite:{day:3000,weekend:4000}};
const CORE_DELIVERY_PRICING=window.VACLEANER_CORE?.deliveryPricing||{};
let deliveryPricing={
  local:Number(CORE_DELIVERY_PRICING.local??window.VACLEANER_CORE?.deliveryFee)||250,
  suburb:Number(CORE_DELIVERY_PRICING.suburb)||350,
  baseOutside:Number(CORE_DELIVERY_PRICING.baseOutside??CORE_DELIVERY_PRICING.suburb)||350,
  includedKm:Number(CORE_DELIVERY_PRICING.includedKm)||10,
  perKm:Number(CORE_DELIVERY_PRICING.perKm)||15,
  maxOutsideKm:Number(CORE_DELIVERY_PRICING.maxOutsideKm)||30,
  localSettlements:Array.isArray(CORE_DELIVERY_PRICING.localSettlements)?[...CORE_DELIVERY_PRICING.localSettlements]:['Полтава','Розсошенці','Щербані','Горбанівка'],
  outsideZone:String(CORE_DELIVERY_PRICING.outsideZone||'agreement')
};
const label=(kind)=>kind==='morning'?`Ранок · ${slots.morningStart}–${slots.morningEnd}`:`Вечір · ${slots.eveningStart}–${slots.eveningEnd}`;
function validSlots(value){
  const keys=['morningStart','morningEnd','eveningStart','eveningEnd'];
  if(!value||!keys.every(key=>/^\d{2}:\d{2}$/.test(String(value[key]||''))))return null;
  const next=Object.fromEntries(keys.map(key=>[key,String(value[key])]));
  return next.morningStart<next.morningEnd&&next.morningEnd<next.eveningStart&&next.eveningStart<next.eveningEnd?next:null;
}
function apply(){
  document.querySelectorAll('select').forEach(sel=>{
    const options=[...sel.options];
    const morning=options.find(o=>/Ранок/.test(o.textContent||''));
    const evening=options.find(o=>/Вечір/.test(o.textContent||''));
    if(!morning||!evening)return;
    const morningLabel=label('morning');
    const eveningLabel=label('evening');
    if(morning.textContent!==morningLabel) morning.textContent=morningLabel;
    if(evening.textContent!==eveningLabel) evening.textContent=eveningLabel;
    const isMorning=sel.value==='morning';
    const field=sel.closest('label')?.nextElementSibling?.querySelector?.('input[type="time"]');
    if(field){field.min=isMorning?slots.morningStart:slots.eveningStart;field.max=isMorning?slots.morningEnd:slots.eveningEnd}
  });
  document.documentElement.dataset.bookingSlots=`${slots.morningStart}-${slots.morningEnd}|${slots.eveningStart}-${slots.eveningEnd}`;
  window.dispatchEvent(new CustomEvent('vacleaner:slots-updated'));
}


const productCodes=[
  [/HOME RESET|Весь дім/i,'elite'],[/Генеральне прибирання|Генеральне/i,'general'],[/Вікна та гладкі поверхні|Ідеальні вікна/i,'ideal_windows'],[/Дивани \+ кухня та ванна|Текстиль \+ кухня та ванна|Тариф «Комбо»|Комбо/i,'combo'],[/Глибоке очищення диванів і матраців|Глибоке очищення текстилю|Puzzi \+ Jimmy/i,'puzzi_jimmy'],[/Дивани \+ вікна|Текстиль \+ вікна|Puzzi \+ робот/i,'puzzi_abir'],[/Kärcher SC 2/i,'sc2'],[/Робот для вікон/i,'abir'],[/Kärcher Puzzi/i,'puzzi']
];
function selectedProductCode(){
  const selected=document.querySelector('.booking-products button.is-selected,.booking-products button[aria-pressed="true"],.booking-products button.selected');
  const stableCode=String(selected?.dataset?.productCode||'').trim();
  if(stableCode)return stableCode;
  const text=selected?.textContent||'';
  return productCodes.find(([re])=>re.test(text))?.[1]||'';
}
function fullWeekend(start,finish,pickupWindow='morning',returnWindow='evening'){
  return Boolean(window.VACLEANER_CORE?.isWeekendDeposit?.(start,finish,pickupWindow,returnWindow));
}
function depositAmount(){
  const code=selectedProductCode(),dates=[...document.querySelectorAll('.booking-date-grid input[type="date"]')],windows=[...document.querySelectorAll('.booking-date-grid select')];
  if(!code||!dates[0]?.value||!dates[1]?.value)return 0;
  const group=window.VACLEANER_CORE?.depositGroup?.(code)||'oneUnit',row=depositRules[group]||depositRules.oneUnit,pickupWindow=windows[0]?.value||'morning',returnWindow=windows[1]?.value||'evening';
  return Number(fullWeekend(dates[0].value,dates[1].value,pickupWindow,returnWindow)?row.weekend:row.day)||0;
}
function formatMoney(v){return new Intl.NumberFormat('uk-UA').format(Number(v)||0)+' грн'}
function setTextIfChanged(el,text){if(el&&el.textContent!==text)el.textContent=text}
function ensureSummaryFinanceRow(summary,total,className,title,subtitle){
  let row=summary.querySelector('.'+className);
  if(!row){row=document.createElement('div');row.className=`${className} vx-summary-finance-row${className==='vx-summary-deposit'?' vx-booking-deposit':''}`;row.innerHTML='<span><b></b><small></small></span><strong></strong>';total.insertAdjacentElement('beforebegin',row)}
  setTextIfChanged(row.querySelector('b'),title);setTextIfChanged(row.querySelector('small'),subtitle);return row;
}

function renderPickupLocationNote(){
  const row=document.querySelector('.booking-choice-row');
  if(!row)return;
  const pickup=[...row.querySelectorAll('button')].find(btn=>/Самовивіз/.test(btn.textContent||''));
  if(pickup){const span=pickup.querySelector('span');if(span&&span.textContent!=='Полтава · 0 грн')span.textContent='Полтава · 0 грн'}
  const selected=row.querySelector('button.is-selected');
  const isPickup=Boolean(selected&&/Самовивіз/.test(selected.textContent||''));
  let note=document.querySelector('.vx-pickup-location-note');
  if(isPickup){
    if(!note){note=document.createElement('p');note.className='vx-pickup-location-note';row.insertAdjacentElement('afterend',note)}
    note.textContent='Точне місце отримання менеджер повідомить під час опрацювання заявки.';
    note.hidden=false;
  }else if(note)note.hidden=true;
}
function normalizeSettlement(value){return String(value||'').toLocaleLowerCase('uk-UA').replace(/^[смт.\s]+/u,'').replace(/[’`]/g,"'").trim()}
function deliveryAddressInput(){return document.querySelector('.booking-delivery-address input[type="text"]:not([data-vac-address-detail])')}
function currentDeliveryQuote(){
  const input=deliveryAddressInput(),address=String(input?.value||'').trim();
  if(!address)return {amount:deliveryPricing.local,zone:'pending',pending:true,quoteRequired:false,distanceKm:null};
  const meta=window.__VAC_DELIVERY_META__?.()||{};
  const settlement=String(meta.settlement||address.split(',')[0]||'').trim();
  const normalized=normalizeSettlement(settlement);
  const local=(deliveryPricing.localSettlements||[]).some(item=>normalizeSettlement(item)===normalized);
  if(local)return {amount:deliveryPricing.local,zone:'local',pending:false,quoteRequired:false,settlement,distanceKm:0};
  const distance=Number(meta.pricingDistanceKm);
  if(meta.verified===true&&Number.isFinite(distance)&&distance>=0){
    if(distance>deliveryPricing.maxOutsideKm)return {amount:0,zone:'agreement',pending:false,quoteRequired:true,settlement,distanceKm:distance};
    const extraKm=Math.max(0,Math.ceil((distance-deliveryPricing.includedKm)-1e-9));
    const amount=deliveryPricing.baseOutside+extraKm*deliveryPricing.perKm;
    return {amount,zone:extraKm>0?'distance':'nearby',pending:false,quoteRequired:false,settlement,distanceKm:distance,extraKm};
  }
  return {amount:0,zone:'agreement',pending:false,quoteRequired:true,settlement,distanceKm:Number.isFinite(distance)?distance:null};
}
function renderDeliveryFee(){
  const row=document.querySelector('.booking-choice-row');if(!row)return;
  const delivery=[...row.querySelectorAll('button')].find(btn=>/Доставка/.test(btn.textContent||''));
  const quote=currentDeliveryQuote();
  const label=quote.quoteRequired?'тариф підтвердить менеджер':quote.pending?`${formatMoney(deliveryPricing.local)} / від ${formatMoney(deliveryPricing.baseOutside)}`:formatMoney(quote.amount);
  if(delivery){const span=delivery.querySelector('span');setTextIfChanged(span,`до вас і назад · ${label}`)}
  const address=document.querySelector('.booking-delivery-address > small,.booking-delivery-address .booking-field-hint');
  if(address){
    const text=quote.quoteRequired
      ?'Для адреси, введеної вручну поза визначеною зоною, вартість доставки підтвердить менеджер до передоплати.'
      :quote.pending
        ?`Полтава, Розсошенці, Щербані та Горбанівка — ${formatMoney(deliveryPricing.local)}. За межі Полтави: до ${deliveryPricing.includedKm} км — ${formatMoney(deliveryPricing.baseOutside)}, далі +${deliveryPricing.perKm} грн/км. Понад ${deliveryPricing.maxOutsideKm} км — за погодженням.`
        :quote.zone==='distance'
          ?`${formatMoney(quote.amount)} · ${quote.distanceKm.toFixed(1).replace('.',',')} км за межами Полтави. Базові ${deliveryPricing.includedKm} км — ${formatMoney(deliveryPricing.baseOutside)}, далі +${deliveryPricing.perKm} грн/км.`
          :`${formatMoney(quote.amount)} включає доставку техніки до вас і її повернення назад.`;
    setTextIfChanged(address,text);
  }
  const summary=document.querySelector('.booking-summary');
  if(summary){
    const deliveryRow=[...summary.querySelectorAll(':scope > div')].find(el=>/Доставка/.test(el.querySelector('span')?.textContent||''));
    if(deliveryRow){
      const strong=deliveryRow.querySelector('strong');
      if(strong)setTextIfChanged(strong,quote.quoteRequired?'за погодженням':quote.pending?`від ${formatMoney(deliveryPricing.local)}`:formatMoney(quote.amount));
    }
    let note=summary.querySelector('.vx-summary-delivery-note');
    if(quote.quoteRequired){if(!note){note=document.createElement('p');note.className='vx-summary-delivery-note';summary.querySelector('.booking-summary-total')?.insertAdjacentElement('afterend',note)}setTextIfChanged(note,'Вартість бронювання зараз показана без доставки. Тариф підтвердить менеджер до передоплати.');note.hidden=false}else if(note)note.hidden=true;
  }
  const mobile=document.querySelector('.booking-mobile-summary');
  if(mobile){
    let note=mobile.querySelector('.vx-mobile-delivery');
    if(!note){note=document.createElement('small');note.className='vx-mobile-delivery';mobile.querySelector('div')?.appendChild(note)}
    const selected=row.querySelector('button.is-selected');
    const isDelivery=Boolean(selected&&/Доставка/.test(selected.textContent||''));
    note.hidden=!isDelivery;
    if(isDelivery)setTextIfChanged(note,quote.quoteRequired?'Доставка — після підтвердження адреси':quote.pending?`Доставка: ${formatMoney(deliveryPricing.local)} / від ${formatMoney(deliveryPricing.baseOutside)}`:`Доставка: ${formatMoney(quote.amount)}${quote.distanceKm>deliveryPricing.includedKm?` · ${quote.distanceKm.toFixed(1).replace('.',',')} км`:''}`);
  }
}

function renderDeposit(){
  const amount=depositAmount(),summary=document.querySelector('.booking-summary'),mobile=document.querySelector('.booking-mobile-summary');
  if(summary){
    const total=summary.querySelector('.booking-summary-total');
    if(total){
      const prepayment=ensureSummaryFinanceRow(summary,total,'vx-summary-prepayment','Передплата','Сплачуєте після підтвердження. Входить у вартість.');
      setTextIfChanged(prepayment.querySelector('strong'),'200 грн');
      const row=ensureSummaryFinanceRow(summary,total,'vx-summary-deposit','Залоговий платіж','Не входить у вартість. Сплачуєте при отриманні; залишок повертаємо після фінального розрахунку.');
      setTextIfChanged(row.querySelector('strong'),amount?formatMoney(amount):'—');
      const totalLabel=summary.querySelector('.booking-summary-total span');setTextIfChanged(totalLabel,'Вартість бронювання');
      const note=summary.querySelector('.vx-summary-deposit-note')||summary.querySelector(':scope > p');
      if(note){if(note.className!=='vx-summary-deposit-note')note.className='vx-summary-deposit-note';setTextIfChanged(note,'Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.');}
    }
  }
  if(mobile){
    let note=mobile.querySelector('.vx-mobile-deposit');if(!note){note=document.createElement('small');note.className='vx-mobile-deposit';mobile.querySelector('div')?.appendChild(note)}
    setTextIfChanged(note,amount?`Залоговий платіж: ${formatMoney(amount)}`:'Залоговий платіж — після вибору дат');
  }
  const conditions=document.querySelector('.booking-conditions ul');
  if(conditions&&conditions.children[0])setTextIfChanged(conditions.children[0],'Передплата 200 грн сплачується тільки після підтвердження заявки, закріплює дату та входить у вартість оренди.');
  if(conditions&&conditions.children[1])setTextIfChanged(conditions.children[1],'Новий клієнт надсилає документ менеджеру приватно. Повторному клієнту, чиї дані вже є в базі, повторно надсилати документ не потрібно.');
  if(conditions&&conditions.children[2])setTextIfChanged(conditions.children[2],amount?`Залоговий платіж ${formatMoney(amount)} сплачується під час отримання техніки. Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.`:'Залоговий платіж сплачується під час отримання техніки. Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.');
}

function renderConsent(){
  const span=document.querySelector('.booking-consent:not(.vx-marketing-consent) > span');
  if(!span||span.dataset.vxConsentFixed==='1')return;
  const terms=document.createElement('a');
  terms.href='/umovy/';terms.target='_blank';terms.rel='noopener';terms.textContent='умови бронювання';
  const privacy=document.createElement('a');
  privacy.href='/polityka-konfidenciynosti/';privacy.target='_blank';privacy.rel='noopener';privacy.textContent='політику конфіденційності';
  span.replaceChildren(
    document.createTextNode('Погоджуюсь на обробку контактних даних для цієї заявки та приймаю '),
    terms,
    document.createTextNode(' і '),
    privacy,
    document.createTextNode('.')
  );
  span.dataset.vxConsentFixed='1';
}

const requestedProduct=new URLSearchParams(location.search).get('product')||'';
const validRequestedProduct=productCodes.some(([,code])=>code===requestedProduct);
function renderPrefilledProduct(){
  const section=document.querySelector('#booking-products'),list=section?.querySelector('.booking-products');
  if(!section||!list||!validRequestedProduct)return;
  const selected=list.querySelector('button.is-selected,button[aria-pressed="true"],button.selected');
  if(!selected)return;
  section.classList.add('vx-product-prefilled');
  let bar=section.querySelector('.vx-product-prefill-bar');
  if(!bar){
    bar=document.createElement('div');bar.className='vx-product-prefill-bar';
    bar.innerHTML='<span><small>Ваш вибір</small><strong></strong></span><button type="button" aria-expanded="false"><span>Змінити техніку</span><i aria-hidden="true">↔</i></button>';
    section.querySelector('.booking-step-heading')?.insertAdjacentElement('afterend',bar);
    bar.querySelector('button').onclick=()=>{
      const expanded=section.classList.toggle('vx-product-expanded');
      bar.querySelector('button').setAttribute('aria-expanded',String(expanded));
      bar.querySelector('button span').textContent=expanded?'Згорнути список':'Змінити техніку';
    };
    list.addEventListener('click',event=>{
      if(!event.target.closest('button')||!section.classList.contains('vx-product-expanded'))return;
      setTimeout(()=>{section.classList.remove('vx-product-expanded');const button=bar.querySelector('button');button.setAttribute('aria-expanded','false');button.querySelector('span').textContent='Змінити техніку';renderPrefilledProduct()},0);
    });
  }
  const title=selected.querySelector('strong')?.textContent?.trim()||'Обрана техніка';
  const barTitle=bar.querySelector('strong');if(barTitle&&barTitle.textContent!==title)barTitle.textContent=title;
}


const LOYALTY_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5';
const PHONE_PROMO_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-phone-promo-v1';
let loyaltyTimer=0;
let autoSmsPromoCode='';
function normalizePhone(value){
  const digits=String(value||'').replace(/\D/g,'');
  if(digits.length===10&&digits.startsWith('0'))return '+38'+digits;
  if(digits.length===12&&digits.startsWith('380'))return '+'+digits;
  return '';
}
function loyaltyBox(input){
  let box=input.closest('label')?.querySelector('.public-loyalty-status');
  if(!box){
    box=document.createElement('div');
    box.className='public-loyalty-status';
    input.closest('label')?.appendChild(box);
  }
  return box;
}
function promoInput(){return document.querySelector('.booking-promo-field input')}
function setNativeInputValue(input,value){
  if(!input)return;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  if(setter)setter.call(input,value);else input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
function applySmsPromoCode(code,phone){
  const input=promoInput();if(!input)return false;
  const clean=String(code||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,32);
  const current=String(input.value||'').toUpperCase();
  const previous=String(input.dataset.autoSmsPromo||autoSmsPromoCode||'').toUpperCase();
  if(!clean){
    if(previous&&current===previous){setNativeInputValue(input,'');delete input.dataset.autoSmsPromo;delete input.dataset.autoSmsPromoPhone;autoSmsPromoCode=''}
    return false;
  }
  // A code from the SMS link or one typed by the client always wins over phone discovery.
  if(current&&current!==previous)return false;
  if(current!==clean)setNativeInputValue(input,clean);
  input.dataset.autoSmsPromo=clean;input.dataset.autoSmsPromoPhone=phone;autoSmsPromoCode=clean;
  return true;
}
async function checkLoyalty(input){
  const phone=normalizePhone(input.value);
  const box=loyaltyBox(input);
  const promoField=promoInput();
  if(promoField?.dataset.autoSmsPromoPhone&&promoField.dataset.autoSmsPromoPhone!==phone)applySmsPromoCode('',phone);
  if(!phone){applySmsPromoCode('',phone);box.hidden=true;box.textContent='';return}
  box.hidden=false;box.className='public-loyalty-status checking';box.textContent='Перевіряємо бонуси за номером…';
  try{
    const [loyaltyResponse,promoResponse]=await Promise.all([
      fetch(LOYALTY_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'loyalty_lookup',customerPhone:phone})}),
      fetch(PHONE_PROMO_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'lookup',customerPhone:phone})})
    ]);
    const [data,promoData]=await Promise.all([loyaltyResponse.json(),promoResponse.json().catch(()=>({promo:null}))]);
    const loyalty=data?.loyalty;
    const smsPromo=promoResponse.ok?promoData?.promo||null:null;
    if(!loyaltyResponse.ok||!loyalty)throw new Error('lookup_failed');
    if(smsPromo&&smsPromo.code){
      const applied=applySmsPromoCode(smsPromo.code,phone);
      const benefit=smsPromo.discountType==='fixed'?`${Math.max(0,Number(smsPromo.discountValue)||0)} грн`:`−${Math.max(0,Number(smsPromo.discountValue)||0)}%`;
      box.className='public-loyalty-status active';
      box.innerHTML=`<small>Активований персональний бонус</small><strong>${smsPromo.campaignName||'Ваш бонус'} · ${benefit}</strong><span>${applied?'Бонус уже активований за вашим номером — знижку підставлено в бронювання.':'За номером є активний SMS-бонус. Ваш введений промокод залишили без змін.'}</span><em>${applied?'Нічого вводити вручну не потрібно':'Перевіримо найвигіднішу знижку при розрахунку'}</em>`;
    }else{
      applySmsPromoCode('',phone);
      if(loyalty.percent>0){
      const completed=Math.max(0,Number(loyalty.completedOrders)||0);
      const isVip=Number(loyalty.percent)>=10||String(loyalty.level||'').toLowerCase()==='vip';
      const nextTarget=isVip?null:completed<3?3:6;
      const remaining=nextTarget?Math.max(0,nextTarget-completed):0;
      box.className='public-loyalty-status active';
      box.innerHTML=`<small>Ваш рівень лояльності</small><strong>${loyalty.level} · −${loyalty.percent}% на оренду техніки</strong><span><b>${completed} завершених оренд</b> · знижка застосована автоматично.</span>${isVip?'<em>Максимальний рівень VAcleaner</em>':`<em>До VIP залишилось ${remaining} ${remaining===1?'оренда':'оренди'}</em>`}`;
    }else{
      const completed=Math.max(0,Number(loyalty.completedOrders)||0);
      const remaining=Math.max(0,3-completed);
      box.className='public-loyalty-status neutral';
      box.innerHTML=`<small>Ваш рівень лояльності</small><strong>Start · ${completed} завершених оренд</strong><span>До знижки −5% залишилось <b>${remaining} ${remaining===1?'оренда':'оренди'}</b>.</span><em>Далі: VIP · −10% після 6 оренд</em>`;
      }
    }
  }catch{
    box.className='public-loyalty-status neutral';
    box.textContent='Не вдалося перевірити лояльність. Заявку можна оформити без цього.';
  }
}

function renderLoyaltyHint(){
  const heading=document.querySelector('#booking-contact .booking-step-heading');
  if(!heading||heading.parentElement.querySelector('.vx-loyalty-hint'))return;
  const hint=document.createElement('p');
  hint.className='vx-loyalty-hint';
  hint.innerHTML='<b>Вже орендували у VAcleaner?</b> Введіть той самий номер — покажемо кількість завершених оренд, ваш рівень і застосуємо знижку автоматично.';
  heading.insertAdjacentElement('afterend',hint);
}
function bindLoyalty(){
  const promo=promoInput();
  if(promo&&!promo.dataset.smsManualBound){
    promo.dataset.smsManualBound='1';
    promo.addEventListener('input',event=>{if(event.isTrusted&&promo.dataset.autoSmsPromo&&String(promo.value||'').toUpperCase()!==String(promo.dataset.autoSmsPromo).toUpperCase()){delete promo.dataset.autoSmsPromo;delete promo.dataset.autoSmsPromoPhone;autoSmsPromoCode=''}});
  }
  document.querySelectorAll('input[type="tel"]').forEach(input=>{
    if(input.dataset.loyaltyBound)return;
    input.dataset.loyaltyBound='1';
    input.addEventListener('input',()=>{clearTimeout(loyaltyTimer);loyaltyTimer=setTimeout(()=>checkLoyalty(input),450)});
    if(input.value)checkLoyalty(input);
  });
}

let refreshAttempts=0;
function refreshBindings(){
  apply();
  renderLoyaltyHint();
  bindLoyalty();
  renderDeposit();
  renderPickupLocationNote();
  renderDeliveryFee();
  renderConsent();
  renderPrefilledProduct();
  if(refreshAttempts<12){
    refreshAttempts+=1;
    setTimeout(refreshBindings,500);
  }
}
fetch(API,{cache:'no-store'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('settings_failed')))
  .then(d=>{const remoteSlots=validSlots(d?.slots);if(remoteSlots)slots=remoteSlots;if(d?.depositRules)depositRules={...depositRules,...d.depositRules};if(d?.deliveryPricing&&typeof d.deliveryPricing==='object')deliveryPricing={...deliveryPricing,...d.deliveryPricing,localSettlements:Array.isArray(d.deliveryPricing.localSettlements)?[...d.deliveryPricing.localSettlements]:deliveryPricing.localSettlements};else if(Number.isFinite(Number(d?.deliveryFee))&&Number(d.deliveryFee)>=0)deliveryPricing.local=Math.round(Number(d.deliveryFee));refreshBindings()})
  .catch(()=>refreshBindings());
const depositObserver=new MutationObserver(()=>requestAnimationFrame(()=>{renderDeposit();renderDeliveryFee()}));
document.addEventListener('DOMContentLoaded',()=>{refreshBindings();depositObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','value']});document.addEventListener('change',()=>{renderDeposit();renderPickupLocationNote();renderDeliveryFee();renderPrefilledProduct()},true);document.addEventListener('input',event=>{if(event.target?.closest?.('.booking-delivery-address'))requestAnimationFrame(renderDeliveryFee)},true);document.addEventListener('vacleaner:address-selected',event=>{if(event.detail?.mode==='public')requestAnimationFrame(renderDeliveryFee)});document.addEventListener('click',()=>setTimeout(()=>{renderDeposit();renderPickupLocationNote();renderDeliveryFee();renderPrefilledProduct()},0),true)});
})();


// v4.1.47.2 — attach verified distance metadata to booking estimates/creation.
(()=>{
  const BOOKING_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5';
  const priorFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    try{
      const url=typeof input==='string'?input:input?.url||'';
      if(String(url).startsWith(BOOKING_API)&&typeof init?.body==='string'){
        const body=JSON.parse(init.body),action=String(body?.action||'');
        if(['availability','promo_lookup','create'].includes(action)){
          const mode=document.querySelector('#booking-extras .booking-choice-row button.is-selected,#booking-extras .booking-choice-row button[aria-pressed="true"]')?.textContent||'';
          if(/Доставка/.test(mode)){
            const meta=window.__VAC_DELIVERY_META__?.()||{};
            body.fulfillment='delivery';
            body.deliveryAddress=window.__VAC_DELIVERY_ADDRESS__?.(body.deliveryAddress)||body.deliveryAddress;
            body.deliveryAddressVerified=meta.verified===true;
            if(Number.isFinite(Number(meta.pricingDistanceKm)))body.deliveryDistanceKm=Number(meta.pricingDistanceKm);
            if(Number.isFinite(Number(meta.routeKm)))body.deliveryRouteKm=Number(meta.routeKm);
            if(Number.isFinite(Number(meta.lat)))body.deliveryLat=Number(meta.lat);
            if(Number.isFinite(Number(meta.lon)))body.deliveryLon=Number(meta.lon);
            if(meta.distanceSource)body.deliveryDistanceSource=String(meta.distanceSource);
          }
          init={...init,body:JSON.stringify(body)};
        }
      }
    }catch{}
    return priorFetch(input,init);
  };
})();

// v3.0.23 — public nearest-availability UX.
// This layer observes booking API responses and enriches the existing availability card
// without changing the Next.js bundle.
(()=>{
  const BOOKING_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5';
  const originalFetch=window.fetch.bind(window);
  const dateFmt=new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long'});
  const windowLabel=value=>value==='evening'?'вечір':'ранок';
  const setNativeValue=(el,value)=>{
    if(!el)return;
    const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if(setter)setter.call(el,value);else el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  };
  function applySuggestedPeriod(next){
    const grid=document.querySelector('.booking-date-grid');
    if(!grid)return;
    const dates=[...grid.querySelectorAll('input[type="date"]')],windows=[...grid.querySelectorAll('select')];
    setNativeValue(dates[0],next.startDate);
    setNativeValue(windows[0],next.pickupWindow);
    setNativeValue(dates[1],next.returnDate);
    setNativeValue(windows[1],next.returnWindow);
    grid.scrollIntoView({block:'center',behavior:'smooth'});
  }
  function nearestPanel(){
    return document.querySelector('.vx-nearest-availability-panel');
  }
  function clearNearest(){
    nearestPanel()?.remove();
  }
  function renderNearest(next){
    if(!next?.startDate){clearNearest();return}
    const card=document.querySelector('.availability-card');
    if(!card)return;
    const start=dateFmt.format(new Date(next.startDate+'T12:00:00'));
    const label=`${start}, ${windowLabel(next.pickupWindow)}`;
    let panel=nearestPanel();
    if(!panel){
      panel=document.createElement('aside');
      panel.className='vx-nearest-availability-panel';
      panel.setAttribute('aria-live','polite');
      const title=document.createElement('strong');
      title.className='vx-nearest-title';
      const copy=document.createElement('span');
      copy.className='vx-nearest-copy';
      const actions=document.createElement('div');
      actions.className='vx-nearest-actions';
      const button=document.createElement('button');
      button.type='button';
      button.className='vx-use-nearest';
      const hint=document.createElement('small');
      hint.textContent='Або виберіть іншу дату вручну.';
      actions.append(button,hint);
      panel.append(title,copy,actions);
      card.insertAdjacentElement('afterend',panel);
    }
    panel.querySelector('.vx-nearest-title').textContent='На цей час техніка зайнята';
    panel.querySelector('.vx-nearest-copy').textContent=`Найближче вільне вікно для цього комплекту й тієї самої тривалості — ${label}.`;
    const button=panel.querySelector('.vx-use-nearest');
    button.textContent=`Обрати ${start} · ${windowLabel(next.pickupWindow)}`;
    button.onclick=()=>applySuggestedPeriod(next);
    panel.dataset.startDate=next.startDate;
    panel.dataset.pickupWindow=next.pickupWindow||'morning';
  }
  window.fetch=async(input,init)=>{
    const response=await originalFetch(input,init);
    try{
      const url=typeof input==='string'?input:input?.url||'';
      if(String(url).startsWith(BOOKING_API)){
        let action='';
        if(typeof init?.body==='string')action=JSON.parse(init.body)?.action||'';
        if(action==='availability'||action==='create'){
          const data=await response.clone().json();
          if(data?.nextAvailable&&data?.available!==true)renderNearest(data.nextAvailable);
          else if(data?.available===true)clearNearest();
        }
      }
    }catch{}
    return response;
  };
})();
