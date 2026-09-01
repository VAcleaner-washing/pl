(()=>{
  'use strict';
  const mobile=()=>window.matchMedia('(max-width: 900px)').matches;
  const labels={
    equipment:'Каталог та наявність',
    clients:'База клієнтів та контакти',
    campaigns:'Повідомлення, бонуси та акції',
    finances:'Платежі та звіти',
    analytics:'Статистика та показники',
    chemistry:'Засоби та витратні матеріали',
    settings:'Профіль і параметри'
  };
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};

  function enhanceShell(){
    if(!mobile())return;
    const main=document.querySelector('.main');
    const head=main?.querySelector('.page-head');
    const search=document.querySelector('.search');
    if(main&&head&&search){
      let row=main.querySelector('.native-search-row');
      if(!row){
        row=document.createElement('div');
        row.className='native-search-row';
        head.insertAdjacentElement('afterend',row);
      }
      if(search.parentElement!==row)row.appendChild(search);
      if(!row.querySelector('.native-search-options')){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='native-search-options';
        btn.setAttribute('aria-label','Фільтри');
        btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/></svg>';
        btn.onclick=()=>{
          const active=document.querySelector('.upcoming-scope .chip.active');
          active?.scrollIntoView({behavior:'smooth',block:'center'});
        };
        row.appendChild(btn);
      }
      if(!head.querySelector('.native-alert-button')){
        const bell=document.createElement('button');
        bell.type='button';
        bell.className='native-alert-button';
        bell.setAttribute('aria-label','Нові бронювання');
        const badge=document.querySelector('#mobileNavBadge');
        const count=(badge?.textContent||'').trim();
        bell.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>'+(count?`<b>${count}</b>`:'');
        bell.onclick=()=>document.querySelector('.mobile-nav [data-mobile-view="bookings"]')?.click();
        head.appendChild(bell);
      }
    }
  }

  function enhanceUpcoming(){
    if(!mobile())return;
    document.querySelectorAll('.upcoming-day>header').forEach(header=>{
      if(header.dataset.nativeDate==='1')return;
      const d=header.querySelector('span');
      const meta=header.querySelector('small');
      if(!d||!meta)return;
      const dm=(d.textContent||'').trim().match(/^(\d{2})\.(\d{2})$/);
      if(dm){
        const day=Number(dm[1]),month=Number(dm[2]);
        const monthName=new Intl.DateTimeFormat('uk-UA',{month:'long'}).format(new Date(2026,month-1,day));
        const raw=(meta.textContent||'').trim();
        const lead=raw==='сьогодні'?'Сьогодні':raw==='завтра'?'Завтра':raw.charAt(0).toUpperCase()+raw.slice(1);
        d.textContent=`${lead}, ${day} ${monthName}`;
        meta.hidden=true;
        header.dataset.nativeDate='1';
      }
    });
    document.querySelectorAll('.upcoming-row').forEach(row=>{
      const time=row.querySelector('.upcoming-time');
      const status=row.querySelector('.upcoming-title .status');
      if(time&&status&&!time.contains(status))time.appendChild(status);
      const tel=row.querySelector('.upcoming-client-info a');
      if(tel)tel.classList.add('native-phone');
      row.classList.add('native-card-ready');
    });
  }

  function enhanceMore(){
    if(!mobile())return;
    const menu=document.querySelector('.mobile-more-menu');
    if(!menu)return;
    if(!menu.querySelector('.native-more-title')){
      const title=document.createElement('h1');
      title.className='native-more-title';
      title.textContent='Ще';
      menu.prepend(title);
    }
    if(!menu.querySelector('.native-profile-card')){
      const name=document.querySelector('.top-profile-copy strong')?.textContent?.trim()||'VAcleaner';
      const card=document.createElement('button');
      card.type='button';
      card.className='native-profile-card';
      card.innerHTML=`<i>VA</i><span><b>${name}</b><small>Адміністратор</small></span><em>›</em>`;
      card.onclick=()=>document.querySelector('[data-more-view="settings"]')?.click();
      const grid=menu.querySelector('.mobile-more-grid');
      grid?.insertAdjacentElement('beforebegin',card);
    }
    menu.querySelectorAll('[data-more-view]').forEach(btn=>{
      if(btn.querySelector('small'))return;
      const id=btn.dataset.moreView;
      const span=btn.querySelector('span');
      if(span){
        const small=document.createElement('small');
        small.textContent=labels[id]||'';
        span.appendChild(small);
      }
      btn.classList.toggle('native-secondary-group',['settings'].includes(id));
    });
  }

  function enhanceDetail(){
    if(!mobile())return;
    const detail=document.querySelector('.detail');
    if(!detail||detail.dataset.nativeDetail==='1')return;
    detail.dataset.nativeDetail='1';
    const shell=detail.querySelector('.detail-shell');
    const meta=detail.querySelector('.detail-top-meta span');
    if(meta)meta.textContent=`Бронювання ${meta.textContent.trim()}`;
    const flow=detail.querySelector('.flow');
    if(flow)flow.classList.add('native-detail-flow');
    const grid=detail.querySelector('.detail-grid');
    const info=detail.querySelector('.info-grid');
    const finance=detail.querySelector('.finance-panel');
    if(shell&&grid&&info){
      const stack=document.createElement('section');
      stack.className='native-detail-stack';
      [...info.children].forEach(node=>stack.appendChild(node));
      if(finance)stack.appendChild(finance);
      grid.insertAdjacentElement('beforebegin',stack);
      grid.classList.add('native-detail-grid-empty');
      stack.querySelectorAll(':scope > article').forEach(a=>a.classList.add('native-detail-row'));
    }
    const heroStatus=detail.querySelector('.hero-status');
    const statusText=(heroStatus?.textContent||'').toLowerCase();
    const statusClass=statusText.includes('видана')?'issued':statusText.includes('повернен')?'completed':statusText.includes('очікує')?'waiting_payment':statusText.includes('нова')?'pending':statusText.includes('скас')?'cancelled':'confirmed';
    const stack=detail.querySelector('.native-detail-stack');
    if(stack)stack.dataset.status=statusClass;
    const actions=detail.querySelector('.detail-actions');
    if(actions)actions.classList.add('native-detail-actions');
  }

  function enhance(){
    enhanceShell();
    enhanceUpcoming();
    enhanceMore();
    enhanceDetail();
  }
  const observer=new MutationObserver(queue);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:false});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('DOMContentLoaded',queue,{once:true});
  queue();
})();
