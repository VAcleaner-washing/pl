(()=>{'use strict';
/* VAcleaner v4.3.11 — process contact-action copy polish.
   Keep the existing tel: target/handler; normalize only the manager-facing label. */
function enhance(root=document){
  const form=root.querySelector?.('.process-form');
  if(!form)return false;
  const call=[...form.querySelectorAll('.process-actions a.btn[href^="tel:"]')][0];
  if(!call)return false;
  const current=String(call.textContent||'').trim();
  if(current==='Подзвонити') call.textContent='Зателефонувати';
  call.setAttribute('aria-label','Зателефонувати клієнту');
  return true;
}
const run=()=>enhance(document);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else queueMicrotask(run);
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
window.VACLEANER_ENHANCE_PROCESS_CONTACT_ACTIONS=run;
})();
