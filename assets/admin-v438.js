(()=>{'use strict';
/* SendPulse currently renders supplementary-plane emoji as question marks on the
   active SMS route. Keep Cyrillic/Unicode text, but remove pictographs that are
   not transported faithfully before preview/preflight/send. */
const pictographs=/[\u{1F000}-\u{1FAFF}]/gu;
function smsTransportText(value){
  return String(value??'')
    .replace(pictographs,'')
    .replace(/[\uFE0F\u200D]/g,'')
    .replace(/[ \t]{2,}/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1');
}
function sanitizeField(field,emit){
  if(!(field instanceof HTMLTextAreaElement)||field.id!=='smsMessage')return false;
  const next=smsTransportText(field.value);
  if(next===field.value)return false;
  field.value=next;
  field.dataset.smsTransportSafe='1';
  if(emit)field.dispatchEvent(new Event('input',{bubbles:true}));
  return true;
}
function sweep(){
  /* smsMessage is a unique workspace field. Do not couple transport safety to
     one container: the composer is dynamically remounted between workflow modes. */
  const field=document.getElementById('smsMessage');
  if(field)sanitizeField(field,true);
}
document.addEventListener('input',event=>sanitizeField(event.target,false),true);
const observer=new MutationObserver(sweep);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sweep,{once:true});else queueMicrotask(sweep);
window.VACLEANER_SMS_TRANSPORT_TEXT=smsTransportText;
})();
