(()=>{
'use strict';
const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
const CORE_SLOTS=window.VACLEANER_CORE?.slots||{morningStart:'07:00',morningEnd:'09:30',eveningStart:'17:30',eveningEnd:'20:00'};
let slots={...CORE_SLOTS};
let depositRules={oneUnit:{day:1000,weekend:2000},twoUnits:{day:1500,weekend:3000},general:{day:2000,weekend:3000},elite:{day:3000,weekend:4000}};
let deliveryFee=Number(window.VACLEANER_CORE?.deliveryFee)||250;
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
  [/HOME RESET|Весь дім/i,'elite'],[/Генеральне прибирання|Генеральне/i,'general'],[/Вікна та гладкі поверхні|Ідеальні вікна/i,'ideal_windows'],[/Текстиль \+ кухня та ванна|Тариф «Комбо»|Комбо/i,'combo'],[/Глибоке очищення текстилю|Puzzi \+ Jimmy/i,'puzzi_jimmy'],[/Текстиль \+ вікна|Puzzi \+ робот/i,'puzzi_abir'],[/Kärcher SC 2/i,'sc2'],[/Робот для вікон/i,'abir'],[/Kärcher Puzzi/i,'puzzi']
];
function selectedProductCode(){
  const selected=document.querySelector('.booking-products button.is-selected');
  const text=selected?.textContent||'';
  return productCodes.find(([re])=>re.test(text))?.[1]||'';
}
function fullWeekend(start,finish,pickupWindow='morning',returnWindow='evening'){
  return Boolean(window.VACLEANER_CORE?.isWeekendDeposit?.(start,finish,pickupWindow,returnWindow));
}
function depositGroup(code){if(code==='elite')return'elite';if(code==='general')return'general';if(['puzzi_jimmy','puzzi_abir','combo','ideal_windows'].includes(code))return'twoUnits';return'oneUnit'}
function depositAmount(){
  const code=selectedProductCode(),dates=[...document.querySelectorAll('.booking-date-grid input[type="date"]')],windows=[...document.querySelectorAll('.booking-date-grid select')];
  if(!code||!dates[0]?.value||!dates[1]?.value)return 0;
  const row=depositRules[depositGroup(code)],pickupWindow=windows[0]?.value||'morning',returnWindow=windows[1]?.value||'evening';
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
function renderDeliveryFee(){
  const row=document.querySelector('.booking-choice-row');if(!row)return;
  const delivery=[...row.querySelectorAll('button')].find(btn=>/Доставка/.test(btn.textContent||''));
  const amount=formatMoney(deliveryFee);
  if(delivery){const span=delivery.querySelector('span');setTextIfChanged(span,`до вас і назад · ${amount}`)}
  const address=document.querySelector('.booking-delivery-address small');
  if(address)setTextIfChanged(address,`${amount} включає доставку техніки до вас і її повернення назад.`);
}

function renderDeposit(){
  const amount=depositAmount(),summary=document.querySelector('.booking-summary'),mobile=document.querySelector('.booking-mobile-summary');
  if(summary){
    const total=summary.querySelector('.booking-summary-total');
    if(total){
      const prepayment=ensureSummaryFinanceRow(summary,total,'vx-summary-prepayment','Бронювання дати','Сплачується після підтвердження заявки.');
      setTextIfChanged(prepayment.querySelector('strong'),'200 грн');
      const row=ensureSummaryFinanceRow(summary,total,'vx-summary-deposit','Залоговий платіж','Сплачується під час отримання техніки.');
      setTextIfChanged(row.querySelector('strong'),amount?formatMoney(amount):'—');
      const totalLabel=summary.querySelector('.booking-summary-total span');setTextIfChanged(totalLabel,'Вартість оренди');
      const note=summary.querySelector('.vx-summary-deposit-note')||summary.querySelector(':scope > p');
      if(note){if(note.className!=='vx-summary-deposit-note')note.className='vx-summary-deposit-note';setTextIfChanged(note,'Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.');}
    }
  }
  if(mobile){
    let note=mobile.querySelector('.vx-mobile-deposit');if(!note){note=document.createElement('small');note.className='vx-mobile-deposit';mobile.querySelector('div')?.appendChild(note)}
    setTextIfChanged(note,amount?`Залоговий платіж: ${formatMoney(amount)}`:'Залоговий платіж — після вибору дат');
  }
  const conditions=document.querySelector('.booking-conditions ul');
  if(conditions&&conditions.children[0])setTextIfChanged(conditions.children[0],'Передоплата 200 грн вноситься після підтвердження заявки, закріплює дату та входить у фінальний взаєморозрахунок.');
  if(conditions&&conditions.children[1])setTextIfChanged(conditions.children[1],'Новий клієнт надсилає документ менеджеру приватно. Повторному клієнту, чиї дані вже є в базі, повторно надсилати документ не потрібно.');
  if(conditions&&conditions.children[2])setTextIfChanged(conditions.children[2],amount?`Залоговий платіж ${formatMoney(amount)} сплачується під час отримання техніки. Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.`:'Залоговий платіж сплачується під час отримання техніки. Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.');
}

function renderConsent(){
  const span=document.querySelector('.booking-consent span');
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
    bar.innerHTML='<span><small>Вже обрано</small><strong></strong></span><button type="button" aria-expanded="false">Змінити техніку</button>';
    section.querySelector('.booking-step-heading')?.insertAdjacentElement('afterend',bar);
    bar.querySelector('button').onclick=()=>{
      const expanded=section.classList.toggle('vx-product-expanded');
      bar.querySelector('button').setAttribute('aria-expanded',String(expanded));
      bar.querySelector('button').textContent=expanded?'Згорнути список':'Змінити техніку';
    };
    list.addEventListener('click',event=>{
      if(!event.target.closest('button')||!section.classList.contains('vx-product-expanded'))return;
      setTimeout(()=>{section.classList.remove('vx-product-expanded');const button=bar.querySelector('button');button.setAttribute('aria-expanded','false');button.textContent='Змінити техніку';renderPrefilledProduct()},0);
    });
  }
  const title=selected.querySelector('strong')?.textContent?.trim()||'Обрана техніка';
  const barTitle=bar.querySelector('strong');if(barTitle&&barTitle.textContent!==title)barTitle.textContent=title;
}


const LOYALTY_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-booking-v5';
let loyaltyTimer=0;
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
async function checkLoyalty(input){
  const phone=normalizePhone(input.value);
  const box=loyaltyBox(input);
  if(!phone){box.hidden=true;box.textContent='';return}
  box.hidden=false;box.className='public-loyalty-status checking';box.textContent='Перевіряємо програму лояльності…';
  try{
    const response=await fetch(LOYALTY_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'loyalty_lookup',customerPhone:phone})});
    const data=await response.json();
    const loyalty=data?.loyalty;
    if(!response.ok||!loyalty)throw new Error('lookup_failed');
    if(loyalty.percent>0){
      box.className='public-loyalty-status active';
      box.innerHTML=`<strong>${loyalty.level} · −${loyalty.percent}% на оренду техніки</strong><span>${loyalty.completedOrders} завершених оренд. Знижка застосована автоматично.</span>`;
    }else{
      box.className='public-loyalty-status neutral';
      box.innerHTML=`<strong>Рівень Start</strong><span>${loyalty.completedOrders||0} завершених оренд. Regular починається з 3 оренд.</span>`;
    }
  }catch{
    box.className='public-loyalty-status neutral';
    box.textContent='Не вдалося перевірити лояльність. Заявку можна оформити без цього.';
  }
}
function bindLoyalty(){
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
  .then(d=>{const remoteSlots=validSlots(d?.slots);if(remoteSlots)slots=remoteSlots;if(d?.depositRules)depositRules={...depositRules,...d.depositRules};if(Number.isFinite(Number(d?.deliveryFee))&&Number(d.deliveryFee)>=0)deliveryFee=Math.round(Number(d.deliveryFee));refreshBindings()})
  .catch(()=>refreshBindings());
const depositObserver=new MutationObserver(()=>requestAnimationFrame(renderDeposit));
document.addEventListener('DOMContentLoaded',()=>{refreshBindings();depositObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','value']});document.addEventListener('change',()=>{renderDeposit();renderPickupLocationNote();renderDeliveryFee();renderPrefilledProduct()},true);document.addEventListener('click',()=>setTimeout(()=>{renderDeposit();renderPickupLocationNote();renderDeliveryFee();renderPrefilledProduct()},0),true)});
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
