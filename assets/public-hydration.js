(() => {
  'use strict';
  // Run enhancements only after React adopts the exported HTML. A failed or
  // stalled load gets a recovery surface, never competing DOM enhancements.
  let started=false,assetFailed=false;
  const noticeId='vac-page-recovery';
  function showRecovery(){
    if(document.getElementById(noticeId)||!document.body)return;
    const notice=document.createElement('section');
    notice.id=noticeId;notice.setAttribute('role','alert');
    notice.style.cssText='position:fixed;z-index:2147483647;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));max-width:520px;margin:auto;padding:18px;border:1px solid #a98449;border-radius:12px;background:#fffaf1;color:#171717;box-shadow:0 6px 30px #0004;font:16px/1.5 system-ui,sans-serif';
    const message=document.createElement('p');message.style.margin='0 0 12px';
    message.textContent='Частина сторінки не завантажилася. Спробуйте ще раз або зв’яжіться з менеджером.';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Спробувати ще раз';
    retry.style.cssText='min-height:44px;padding:8px 14px;margin:0 12px 8px 0;border:0;border-radius:6px;background:#171717;color:white;font:inherit;cursor:pointer';
    retry.addEventListener('click',()=>location.reload());
    const contact=document.createElement('a');contact.href='tel:+380953919569';contact.textContent='Подзвонити менеджеру';
    contact.style.cssText='display:inline-block;padding:10px 0;color:#704a13;text-decoration:underline';
    notice.append(message,retry,contact);document.body.appendChild(notice);
  }
  const watchdog=setTimeout(()=>{if(!started)showRecovery()},12000);
  window.addEventListener('error',event=>{
    const script=event.target;
    if(!(script instanceof HTMLScriptElement)||!script.src)return;
    const url=new URL(script.src,location.href);
    if(url.origin!==location.origin||!url.pathname.startsWith('/_next/'))return;
    assetFailed=true;showRecovery();
  },true);
  function start(){
    if(started)return;
    started=true;clearTimeout(watchdog);
    if(!assetFailed)document.getElementById(noticeId)?.remove();
    document.querySelectorAll('script[type="application/x-vacleaner-after-hydration"]').forEach(source=>{
      const script=document.createElement('script');
      for(const {name,value} of source.attributes){
        if(name!=='type')script.setAttribute(name,value);
      }
      script.async=false;
      script.addEventListener('error',()=>{assetFailed=true;showRecovery()},{once:true});
      source.replaceWith(script);
    });
  }
  window.addEventListener('vacleaner:hydrated',start,{once:true});
  if(document.documentElement.dataset.vacleanerHydrated==='1')start();
})();
