(()=>{
  'use strict';
  const ROUTE='/admin/bronuvannia-native-v26/';
  const mobile=()=>matchMedia('(max-width:900px)').matches;
  let queued=false;
  const q=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};

  const notify=(msg,type)=>{try{if(typeof toast==='function')toast(msg,type)}catch{} };
  const cleanPhone=value=>String(value||'').replace(/\s+/g,'').trim();

  function restoreUpcomingOperationalLayout(){
    document.querySelectorAll('.upcoming-row').forEach(row=>{
      row.classList.add('native-v25-upcoming');
      const time=row.querySelector('.upcoming-time');
      const title=row.querySelector('.upcoming-title');
      const status=time?.querySelector(':scope > .status');
      if(status&&title&&!title.contains(status))title.appendChild(status);
      const badge=time?.querySelector('.schedule-badge');
      if(badge)badge.hidden=false;
    });
  }

  function makeProfileInformational(){
    const old=document.querySelector('.mobile-more-menu .native-profile-card:not(.native-v25-profile-static)');
    if(!old)return;
    const info=document.createElement('div');
    info.className='native-profile-card native-v25-profile-static';
    info.setAttribute('role','group');
    info.setAttribute('aria-label','Профіль адміністратора');
    const avatar=old.querySelector('i')?.outerHTML||'<i>VA</i>';
    const copy=old.querySelector('span')?.outerHTML||'<span><b>Вадим</b><small>Адміністратор</small></span>';
    info.innerHTML=avatar+copy;
    old.replaceWith(info);
  }

  function processDocumentTools(){
    const form=document.querySelector('.process-form');
    if(!form||form.querySelector('.native-v25-document-tools'))return;
    const anchor=form.querySelector('#documentProfileState');
    if(!anchor)return;
    const tools=document.createElement('section');
    tools.className='native-v25-document-tools';
    tools.innerHTML=`
      <div class="native-v25-document-head">
        <div><b>Фото документа</b><small>Приватно · доступне тільки в адмінці</small></div>
        <span data-v25-document-state>Не перевірено</span>
      </div>
      <div class="native-v25-document-actions">
        <label class="btn subtle native-v25-document-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden data-v25-document-file><span>Додати / замінити</span></label>
        <button class="btn subtle" type="button" data-v25-document-view>Переглянути фото</button>
      </div>
      <div class="native-v25-document-preview" hidden>
        <img alt="Фото документа клієнта">
        <div><b data-v25-document-name>Фото документа</b><small data-v25-document-meta></small><a target="_blank" rel="noopener">Відкрити оригінал ↗</a></div>
      </div>`;
    anchor.insertAdjacentElement('afterend',tools);
    const fileInput=tools.querySelector('[data-v25-document-file]');
    const viewBtn=tools.querySelector('[data-v25-document-view]');
    const state=tools.querySelector('[data-v25-document-state]');
    const preview=tools.querySelector('.native-v25-document-preview');
    const img=preview.querySelector('img');
    const name=tools.querySelector('[data-v25-document-name]');
    const meta=tools.querySelector('[data-v25-document-meta]');
    const link=preview.querySelector('a');
    const phone=()=>cleanPhone(form.querySelector('[name="customerPhone"]')?.value);
    const busy=v=>{viewBtn.disabled=v;fileInput.disabled=v;tools.classList.toggle('busy',v)};
    const showDocument=data=>{
      if(!data?.document){preview.hidden=true;state.textContent='Фото не додано';state.classList.remove('stored');return false}
      state.textContent='Фото збережено';state.classList.add('stored');
      preview.hidden=false;img.hidden=false;img.src=data.document.url||'';link.href=data.document.url||'#';name.textContent=data.document.name||'Фото документа';
      meta.textContent=data.document.uploadedAt?`Завантажено ${new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(data.document.uploadedAt))}`:'Збережено у приватному сховищі';
      img.onerror=()=>{img.hidden=true;meta.textContent='Попередній перегляд недоступний — відкрийте оригінал.'};
      return true;
    };
    const load=async({quiet=false}={})=>{
      if(typeof documentRequest!=='function'){if(!quiet)notify('Перегляд документа недоступний');return false}
      if(!phone()){if(!quiet)notify('Спочатку вкажіть телефон клієнта');return false}
      busy(true);try{const data=await documentRequest('view',{phone:phone()});const ok=showDocument(data);if(!ok&&!quiet)notify('Фото документа ще не додано');return ok}catch(err){state.textContent='Не вдалося завантажити';if(!quiet)notify(err?.message||'Не вдалося відкрити фото');return false}finally{busy(false)}
    };
    viewBtn.addEventListener('click',async()=>{if(!preview.hidden){preview.hidden=true;viewBtn.textContent='Переглянути фото';return}const ok=await load();if(ok)viewBtn.textContent='Сховати фото'});
    fileInput.addEventListener('change',async()=>{
      const file=fileInput.files?.[0];if(!file)return;
      if(typeof documentRequest!=='function'){notify('Завантаження документа недоступне');return}
      if(!phone()){notify('Спочатку вкажіть телефон клієнта');fileInput.value='';return}
      busy(true);state.textContent='Завантажуємо…';
      try{await documentRequest('upload',{phone:phone(),file});notify('Фото документа збережено','success');await load({quiet:true});viewBtn.textContent='Сховати фото'}catch(err){state.textContent='Помилка';notify(err?.message||'Фото документа не завантажено')}finally{busy(false);fileInput.value=''}
    });
    // Lightweight state check only after the process form exists.
    load({quiet:true});
  }

  function shortenSmsStepper(){
    document.querySelectorAll('.sms-campaign-modal .sms-stepper b[data-short]').forEach(el=>{
      if(!el.dataset.v25Long)el.dataset.v25Long=el.textContent||'';
      if(mobile())el.textContent=el.dataset.short||el.textContent;
    });
  }

  function patchLocalNotification(){
    if(typeof window.sendLocalNotification!=='function'||window.sendLocalNotification.__nativeV26)return;
    const fn=async(title,body)=>{
      try{
        const reg=await navigator.serviceWorker?.ready;
        if(reg)await reg.showNotification(title,{body,icon:'/admin/icon-192.png',badge:'/admin/icon-192.png',tag:'vacleaner-booking',data:{url:ROUTE}});
        else if('Notification' in window)new Notification(title,{body});
      }catch(e){console.warn('notification_failed',e)}
    };
    fn.__nativeV26=true;window.sendLocalNotification=fn;
  }

  function registerScopedSw(){
    if(!('serviceWorker' in navigator)||!location.pathname.startsWith(ROUTE))return;
    navigator.serviceWorker.register('/admin/sw-native-v26.js?v=4247',{scope:ROUTE}).then(reg=>reg.update?.()).catch(err=>console.warn('native_v26_sw_failed',err));
  }

  function apply(){
    if(!mobile())return;
    document.documentElement.classList.add('native-v25','native-v26');
    restoreUpcomingOperationalLayout();
    makeProfileInformational();
    processDocumentTools();
    shortenSmsStepper();
    patchLocalNotification();
  }

  new MutationObserver(q).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('resize',q,{passive:true});
  addEventListener('DOMContentLoaded',()=>{registerScopedSw();apply()},{once:true});
  registerScopedSw();apply();
})();
