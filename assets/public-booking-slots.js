(()=>{
'use strict';
const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
let slots={morningStart:'07:00',morningEnd:'09:30',eveningStart:'17:30',eveningEnd:'20:00'};
const label=(kind)=>kind==='morning'?`Ранок · ${slots.morningStart}–${slots.morningEnd}`:`Вечір · ${slots.eveningStart}–${slots.eveningEnd}`;
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
  if(refreshAttempts<12){
    refreshAttempts+=1;
    setTimeout(refreshBindings,500);
  }
}
fetch(API,{cache:'no-store'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('settings_failed')))
  .then(d=>{if(d?.slots)slots={...slots,...d.slots};refreshBindings()})
  .catch(()=>refreshBindings());
})();
