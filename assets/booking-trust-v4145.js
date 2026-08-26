(()=>{
'use strict';
const cancellation='Скасування за 3 доби або раніше до видачі — передоплату 200 грн повертаємо. Якщо до видачі менше 3 діб — передоплата не повертається. Перенесення за 3+ доби — без втрати передоплати.';
const malfunction='Якщо техніка перестала нормально працювати — припиніть використання, не розбирайте її та зв’яжіться з VAcleaner. Якщо несправність виникла не з вини клієнта, запропонуємо заміну або справедливий перерахунок.';
const handoff='Стан і комплектність техніки перевіряємо при видачі. Клієнт не відповідає за дефекти, зафіксовані до початку оренди.';
function enhance(){
  const contact=document.querySelector('#booking-contact');if(!contact)return;
  const more=contact.querySelector('.booking-conditions-more > div');
  if(more&&!more.querySelector('[data-vx-cancel-policy]')){
    const p=document.createElement('p');p.dataset.vxCancelPolicy='1';p.textContent=cancellation;more.appendChild(p);
    const p2=document.createElement('p');p2.dataset.vxHandoffPolicy='1';p2.textContent=handoff;more.appendChild(p2);
    const p3=document.createElement('p');p3.dataset.vxMalfunctionPolicy='1';p3.textContent=malfunction;more.appendChild(p3);
  }
  const consent=contact.querySelector('.booking-consent');
  if(consent&&!contact.querySelector('.vx-booking-trust')){
    const box=document.createElement('aside');box.className='vx-booking-trust';box.setAttribute('aria-label','Ключові умови бронювання');
    box.innerHTML='<span><b>200 грн</b><small>тільки після підтвердження</small></span><span><b>Залоговий платіж</b><small>при отриманні · не є ціною оренди</small></span><span><b>Стан техніки</b><small>фіксуємо при видачі</small></span><span><b>Підтримка</b><small>під час оренди</small></span>';
    consent.insertAdjacentElement('beforebegin',box);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.documentElement,{childList:true,subtree:true});
})();
