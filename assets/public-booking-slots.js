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
    morning.textContent=label('morning');
    evening.textContent=label('evening');
    const isMorning=sel.value==='morning';
    const field=sel.closest('label')?.nextElementSibling?.querySelector?.('input[type="time"]');
    if(field){field.min=isMorning?slots.morningStart:slots.eveningStart;field.max=isMorning?slots.morningEnd:slots.eveningEnd}
  });
}
fetch(API,{cache:'no-store'}).then(r=>r.json()).then(d=>{if(d?.slots)slots={...slots,...d.slots};apply();new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true})}).catch(()=>apply());
})();
