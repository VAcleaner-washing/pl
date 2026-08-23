(()=>{
  'use strict';
  const normPhone=v=>String(v||'').replace(/\D/g,'');
  const enhanceClientCard=()=>{
    const form=document.querySelector('.client-card-form');
    if(!form||form.dataset.glassQuickActions==='1')return;
    form.dataset.glassQuickActions='1';
    const host=form.querySelector('header>div');
    if(!host)return;
    const phoneInput=form.querySelector('[name="customerPhone"]');
    const phone=normPhone(phoneInput?.value);
    const bar=document.createElement('div');
    bar.className='glass-client-actions';
    if(phone){
      const call=document.createElement('a');
      call.href=`tel:+${phone}`;
      call.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.8 9.4 8l-1.8 1.5c1.4 2.8 3.5 4.9 6.3 6.3l1.5-1.8 4.2 2.2-.9 3.1c-.3 1-1.2 1.7-2.3 1.7C9.1 21 3 14.9 3 7.6c0-1.1.7-2 1.7-2.3l2.5-.7Z"/></svg><span>Подзвонити</span>';
      call.setAttribute('aria-label','Подзвонити клієнту');
      bar.append(call);
    }
    const create=document.createElement('button');
    create.type='button';
    create.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Нова оренда</span>';
    create.setAttribute('aria-label','Створити нове бронювання');
    create.addEventListener('click',()=>{
      form.querySelector('[data-close]')?.click();
      window.setTimeout(()=>document.getElementById('mobileNewBooking')?.click(),80);
    });
    bar.append(create);
    host.append(bar);
  };
  const layer=document.getElementById('layer');
  const observer=new MutationObserver(()=>enhanceClientCard());
  if(layer)observer.observe(layer,{childList:true,subtree:true});
  enhanceClientCard();
})();
