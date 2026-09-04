(()=>{'use strict';
/* VAcleaner v4.3.9 — make RETURN SMS self-identifying while keeping the
   transport-safe symbol set introduced in v4.3.8. */
const legacyReturn=/^VAcleaner:\s*давно не освіжали дім\?\s*(.+?)\s+на оренду\.\s*Активуйте бонус:\s*\{link\}\s*Діє 21 день\.\s*Стоп:\s*vacleaner\.pp\.ua\/s\s*$/u;
function transportSafe(value){
  const source=String(value??'');
  return typeof window.VACLEANER_SMS_TRANSPORT_TEXT==='function'
    ? window.VACLEANER_SMS_TRANSPORT_TEXT(source)
    : source;
}
function brandReturnText(value){
  const raw=String(value??''),source=transportSafe(raw),match=source.match(legacyReturn);
  if(!match)return raw;
  const bonus=String(match[1]||'').trim().replace(/^-/,'−');
  return `VAcleaner — оренда техніки для прибирання у Полтаві. Давно не освіжали дім? ★ Для вас ${bonus} на наступну оренду. Активуйте бонус: {link} Діє 21 день. Відмова: vacleaner.pp.ua/s`;
}
function apply(){
  const field=document.getElementById('smsMessage');
  if(!(field instanceof HTMLTextAreaElement)||field.dataset.smsBrandCopy==='v439')return false;
  const next=brandReturnText(field.value);
  if(next===field.value)return false;
  field.value=next;
  field.dataset.smsBrandCopy='v439';
  field.dispatchEvent(new Event('input',{bubbles:true}));
  return true;
}
const observer=new MutationObserver(apply);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else queueMicrotask(apply);
window.VACLEANER_SMS_BRAND_RETURN_TEXT=brandReturnText;
})();
