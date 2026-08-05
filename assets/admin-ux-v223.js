(()=>{
  'use strict';
  const STATUS_BY_LABEL={
    'Усі':'all','Нова':'pending','Очікує передплату':'waiting_payment','Підтверджена':'confirmed',
    'Видана':'issued','Повернена':'completed','Скасована':'cancelled'
  };
  const CONFIRM_ACTIONS={
    'Підтвердити':'Підтвердити це бронювання без очікування передплати?',
    'Передплата внесена':'Підтвердити, що передплату справді отримано?',
    'Техніку видано':'Підтвердити, що техніку вже видано клієнту?',
    'Повернено':'Підтвердити повернення техніки та завершити бронювання?',
    'Скасувати':'Скасувати це бронювання? Дія звільнить техніку на вибрані дати.'
  };
  let activeFilter='all';
  let query='';
  let enhancing=false;
  let lastNewCount=-1;

  const cards=()=>[...document.querySelectorAll('.admin-bookings-section .admin-booking-card')];
  const cardStatus=(card)=>{
    const badge=card.querySelector('header b[class*="status-"]');
    if(!badge)return '';
    const cls=[...badge.classList].find(x=>x.startsWith('status-'));
    return cls?cls.slice(7):'';
  };
  const normalized=(value)=>(value||'').toLocaleLowerCase('uk-UA').replace(/\s+/g,' ').trim();


  function newBookingsCount(){
    return cards().filter(card=>cardStatus(card)==='pending').length;
  }

  function prioritizeNewBookings(){
    const list=document.querySelector('.admin-bookings-section .admin-booking-list');
    if(!list)return;
    const current=cards();
    if(current.length<2)return;
    const priority={pending:0,waiting_payment:1};
    const sorted=[...current].sort((a,b)=>{
      const pa=priority[cardStatus(a)]??2;
      const pb=priority[cardStatus(b)]??2;
      return pa-pb;
    });
    if(sorted.some((card,index)=>card!==current[index])){
      const fragment=document.createDocumentFragment();
      sorted.forEach(card=>fragment.append(card));
      list.append(fragment);
    }
  }

  function enhanceNewBookingIndicators(){
    const count=newBookingsCount();
    const tabs=[...document.querySelectorAll('.admin-pwa-tabs button')];
    const bookingsTab=tabs.find(button=>button.textContent.replace(/\d+/g,'').trim()==='Заявки');
    if(bookingsTab){
      let badge=bookingsTab.querySelector('.admin-new-badge');
      if(!badge){
        badge=document.createElement('span');
        badge.className='admin-new-badge';
        badge.setAttribute('aria-label','Нові заявки');
        bookingsTab.append(badge);
      }
      badge.textContent=String(count);
      badge.hidden=count===0;
      bookingsTab.classList.toggle('has-new-bookings',count>0);
    }

    const headerActions=document.querySelector('.admin-pwa-header-actions');
    if(headerActions){
      const bell=[...headerActions.querySelectorAll(':scope > button')][0];
      if(bell){
        bell.classList.add('admin-header-notification-button');
        let bellBadge=bell.querySelector('.admin-header-notification-badge');
        if(!bellBadge){
          bellBadge=document.createElement('span');
          bellBadge.className='admin-header-notification-badge';
          bellBadge.setAttribute('aria-label','Кількість нових заявок');
          bell.append(bellBadge);
        }
        bellBadge.textContent=String(count);
        bellBadge.hidden=count===0;
      }
    }

    const topline=document.querySelector('.admin-pwa-topline');
    if(topline){
      let alert=topline.querySelector('.admin-new-bookings-alert');
      if(!alert){
        alert=document.createElement('button');
        alert.type='button';
        alert.className='admin-new-bookings-alert';
        alert.innerHTML='<span class="admin-new-bookings-dot"></span><strong></strong>';
        alert.addEventListener('click',()=>{
          const tab=[...document.querySelectorAll('.admin-pwa-tabs button')].find(button=>button.textContent.includes('Заявки'));
          tab?.click();
          activeFilter='pending';
          setTimeout(()=>{
            enhanceFilters(document.querySelector('.admin-bookings-section'));
            applyFilters();
            document.querySelector('.admin-bookings-section')?.scrollIntoView({behavior:'smooth',block:'start'});
          },80);
        });
        topline.append(alert);
      }
      alert.querySelector('strong').textContent=count===1?'1 нова заявка':`${count} нові заявки`;
      alert.hidden=count===0;
    }

    if(count!==lastNewCount){
      document.title=count>0?`(${count}) Нові заявки · VAcleaner`:'VAcleaner Manager';
      lastNewCount=count;
    }
  }

  function applyFilters(){
    const list=document.querySelector('.admin-bookings-section .admin-booking-list');
    if(!list)return;
    let visible=0;
    cards().forEach(card=>{
      const status=cardStatus(card);
      const matchesStatus=activeFilter==='all'||status===activeFilter;
      const matchesQuery=!query||normalized(card.textContent).includes(normalized(query));
      const show=matchesStatus&&matchesQuery;
      card.hidden=!show;
      if(show)visible++;
    });
    let empty=document.querySelector('.admin-search-empty');
    if(!visible){
      if(!empty){
        empty=document.createElement('p');
        empty.className='admin-search-empty';
        list.after(empty);
      }
      empty.textContent=query?'Нічого не знайдено. Спробуйте номер телефону, ім’я або код бронювання.':'У цьому статусі поки немає бронювань.';
    }else empty?.remove();
  }

  function enhanceSearch(section){
    if(section.querySelector('.admin-search-wrap'))return;
    const filters=section.querySelector('.admin-filters');
    if(!filters)return;
    const wrap=document.createElement('div');
    wrap.className='admin-search-wrap';
    wrap.innerHTML='<span class="admin-search-icon" aria-hidden="true">⌕</span><input type="search" inputmode="search" autocomplete="off" placeholder="Пошук за ім’ям, телефоном або кодом"><button class="admin-search-clear" type="button" aria-label="Очистити пошук">×</button>';
    filters.before(wrap);
    const input=wrap.querySelector('input');
    input.value=query;
    input.addEventListener('input',()=>{query=input.value;wrap.classList.toggle('has-value',!!query);applyFilters();});
    wrap.querySelector('button').addEventListener('click',()=>{query='';input.value='';wrap.classList.remove('has-value');input.focus();applyFilters();});
  }

  function enhanceFilters(section){
    const counts={all:cards().length};
    cards().forEach(card=>{const s=cardStatus(card);counts[s]=(counts[s]||0)+1;});
    section.querySelectorAll('.admin-filters button').forEach(button=>{
      const label=button.childNodes[0]?.textContent?.trim()||button.textContent.trim();
      const status=STATUS_BY_LABEL[label];
      if(!status)return;
      button.dataset.clientStatus=status;
      button.classList.toggle('is-active',status===activeFilter);
      let count=button.querySelector('.admin-filter-count');
      if(!count){count=document.createElement('span');count.className='admin-filter-count';button.append(count);}
      const value=String(counts[status]||0);if(count.textContent!==value)count.textContent=value;
    });
  }

  function enhanceCalendar(){
    const section=document.querySelector('.admin-calendar-section');
    if(!section)return;
    const heading=section.querySelector('.admin-section-heading');
    if(heading&&!section.querySelector('.admin-calendar-legend')){
      const legend=document.createElement('div');
      legend.className='admin-calendar-legend';
      legend.innerHTML='<span><i></i> Є вільна техніка</span><span><i></i> Усе зайнято</span>';
      heading.after(legend);
    }
    section.querySelectorAll('.admin-resource-row span').forEach(span=>{
      if(span.dataset.friendly==='1')return;
      const match=span.textContent.trim().match(/^(\d+)\/(\d+)$/);
      if(!match)return;
      const free=Number(match[1]);
      span.dataset.friendly='1';
      span.title=`Вільно ${free} з ${match[2]}`;
      span.setAttribute('aria-label',span.title);
      span.textContent=free===0?'Зайнято':`Вільно ${free}`;
    });
  }

  function enhanceHeader(){
    const actions=document.querySelector('.admin-pwa-header-actions');
    if(!actions||actions.querySelector('details'))return;
    const buttons=[...actions.children].filter(el=>el.tagName==='BUTTON');
    const install=buttons.find(b=>b.textContent.trim()==='Встановити');
    const logout=buttons.find(b=>b.textContent.trim()==='Вийти');
    if(install)install.classList.add('admin-install-action');
    if(!install&&!logout)return;
    const details=document.createElement('details');
    details.innerHTML='<summary aria-label="Додаткові дії">Ще</summary><div class="admin-pwa-more-panel"></div>';
    const panel=details.querySelector('div');
    if(install)panel.append(install);
    if(logout)panel.append(logout);
    actions.append(details);
    document.addEventListener('click',e=>{if(!details.contains(e.target))details.removeAttribute('open');},{passive:true});
  }

  function enhance(){
    if(enhancing)return;
    enhancing=true;
    try{
      const section=document.querySelector('.admin-bookings-section');
      if(section){prioritizeNewBookings();enhanceSearch(section);enhanceFilters(section);applyFilters();}
      enhanceNewBookingIndicators();
      enhanceCalendar();
      enhanceHeader();
    }finally{enhancing=false;}
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    const filter=button.dataset.clientStatus;
    if(filter){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      activeFilter=filter;
      document.querySelectorAll('.admin-filters button').forEach(b=>b.classList.toggle('is-active',b.dataset.clientStatus===activeFilter));
      applyFilters();
      return;
    }
    const label=button.textContent.trim();
    const message=CONFIRM_ACTIONS[label];
    if(message&&!window.confirm(message)){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    }
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();


/* VAcleaner Manager v2.2.10 — three clear workspaces */
(()=>{
  'use strict';
  const maintain=()=>{
    document.querySelectorAll('.admin-today-bookings').forEach(section=>section.hidden=true);
    const tabs=document.querySelector('.admin-pwa-tabs');
    if(tabs) tabs.classList.add('admin-pwa-tabs-three');
  };
  const observer=new MutationObserver(()=>requestAnimationFrame(maintain));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maintain);else maintain();
})();

/* VAcleaner Manager v2.2.13 — finance, chemistry and owner analytics */
(()=>{
  'use strict';
  const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-admin-bookings-v2';
  const KEY='sb_publishable_-UdAKDf5jzIP6N9rBp927g_VhyJKeog';
  let bookings=[];
  let loading=null;
  const money=v=>new Intl.NumberFormat('uk-UA').format(Number(v)||0)+' грн';
  const getToken=()=>{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i); if(!key||!key.includes('auth-token'))continue;
      try{
        const raw=JSON.parse(localStorage.getItem(key)||'null');
        const stack=[raw];
        while(stack.length){const x=stack.pop();if(!x)continue;if(typeof x==='object'){if(typeof x.access_token==='string')return x.access_token;Object.values(x).forEach(v=>stack.push(v));}}
      }catch{}
    }
    return '';
  };
  async function invoke(body){
    const token=getToken();
    if(!token)throw new Error('Сесію не знайдено. Увійдіть в адмінку ще раз.');
    const response=await fetch(API,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({error:'invalid_response'}));
    if(!response.ok)throw new Error(data.error||'Помилка сервера');
    return data;
  }
  async function loadBookings(force=false){
    if(bookings.length&&!force)return bookings;
    if(loading)return loading;
    loading=invoke({action:'list',status:''}).then(data=>bookings=data.bookings||[]).finally(()=>loading=null);
    return loading;
  }
  const cardCode=card=>card.querySelector('header span')?.textContent?.split('·')[0]?.trim()||'';
  const isPuzzi=b=>['puzzi','puzzi_jimmy','combo','general','elite'].includes(b.product_code)||/puzzi|миюч/i.test(b.product_label||'');
  function calc(b,used,story,issue){
    const free=story?2:0, paid=Math.max(0,used-free), chemistry=paid*50;
    const prepayment=b.prepayment_paid?Number(b.prepayment_amount||200):0;
    const expenses=Number(b.base_amount||0)+Number(b.delivery_amount||0)+chemistry;
    const received=prepayment+issue;
    const balance=received-expenses;
    return{free,paid,chemistry,prepayment,expenses,received,refund:Math.max(0,balance),due:Math.max(0,-balance)};
  }
  function financeSummary(b){
    const chem=b.extras?.chemistry||{};
    const issue=Number(b.deposit_amount||0);
    const c=calc(b,Number(chem.used_packets||0),chem.story_mention===true,issue);
    return `<div class="admin-finance-summary">
      <div><span>Бронювання</span><strong>${money(b.prepayment_amount||200)} ${b.prepayment_paid?'✓':'· очікується'}</strong></div>
      <div><span>При видачі</span><strong>${money(issue)}</strong></div>
      ${isPuzzi(b)?`<div><span>Хімія</span><strong>${Number(chem.used_packets||0)} пак. · ${money(c.chemistry)}</strong></div>`:''}
      <div><span>Витрати</span><strong>${money(c.expenses)}</strong></div>
      <div class="${c.refund?'is-refund':c.due?'is-due':''}"><span>${c.refund?'Повернути клієнту':c.due?'Доплата клієнта':'Розраховано'}</span><strong>${money(c.refund||c.due)}</strong></div>
    </div>`;
  }
  async function enhanceCards(){
    const cards=[...document.querySelectorAll('.admin-booking-card')];
    if(!cards.length)return;
    try{await loadBookings();}catch{return;}
    cards.forEach(card=>{
      const b=bookings.find(x=>x.booking_code===cardCode(card)); if(!b)return;
      let summary=card.querySelector('.admin-finance-summary');
      if(!summary){
        const holder=document.createElement('div');holder.innerHTML=financeSummary(b);summary=holder.firstElementChild;
        const meta=card.querySelector('.admin-booking-meta');meta?.after(summary);
      }
      const actions=card.querySelector('.admin-booking-actions');
      if(actions&&!actions.querySelector('.action-finance')){
        const btn=document.createElement('button');btn.type='button';btn.className='action-finance';btn.textContent='Розрахунок';btn.dataset.bookingCode=b.booking_code;actions.prepend(btn);
      }
    });
  }
  function openFinance(b){
    const old=document.querySelector('.admin-finance-modal');old?.remove();
    const chem=b.extras?.chemistry||{};
    const used=Number(chem.used_packets||0),story=chem.story_mention===true,issue=Number(b.deposit_amount||0);
    const modal=document.createElement('div');modal.className='admin-modal admin-finance-modal';
    modal.innerHTML=`<button class="admin-modal-backdrop" type="button" aria-label="Закрити"></button>
      <form class="admin-booking-form"><header><div><small>${b.booking_code}</small><h2>Фінальний розрахунок</h2></div><button type="button" data-close>×</button></header>
      <div class="admin-finance-intro"><strong>${b.product_label}</strong><span>${b.customer_name}</span></div>
      <div class="admin-form-grid">
        <label>Платіж при видачі, грн<input name="issue" type="number" min="0" step="50" value="${issue}" required></label>
        ${isPuzzi(b)?`<label>Використано пакетиків<input name="used" type="number" min="0" max="50" step="1" value="${used}" required></label>
        <label class="admin-form-check admin-form-wide"><input name="story" type="checkbox" ${story?'checked':''}><span><b>Була відмітка в сторіс</b><small>2 використані пакетики безкоштовно</small></span></label>`:''}
      </div>
      <div class="admin-live-calculation"></div>
      <footer><button class="admin-secondary-button" type="button" data-close>Закрити</button><button class="admin-create-button" type="submit">Зберегти розрахунок</button></footer></form>`;
    document.body.append(modal);
    const form=modal.querySelector('form'),live=modal.querySelector('.admin-live-calculation');
    const update=()=>{const u=isPuzzi(b)?Number(form.used.value||0):0,s=isPuzzi(b)&&form.story.checked,i=Number(form.issue.value||0),c=calc(b,u,s,i);live.innerHTML=`
      <div><span>Бронювання дати</span><strong>${money(c.prepayment)}</strong></div><div><span>Платіж при видачі</span><strong>${money(i)}</strong></div>
      <div><span>Оренда</span><strong>${money(b.base_amount)}</strong></div><div><span>Доставка</span><strong>${money(b.delivery_amount)}</strong></div>
      ${isPuzzi(b)?`<div><span>Хімія</span><strong>${u} використано − ${c.free} бонус = ${c.paid} × 50 грн</strong></div>`:''}
      <div><span>Разом витрати</span><strong>${money(c.expenses)}</strong></div>
      <div class="admin-balance ${c.refund?'is-refund':c.due?'is-due':''}"><span>${c.refund?'Повернути клієнту':c.due?'Клієнт має доплатити':'Розрахунок закрито'}</span><strong>${money(c.refund||c.due)}</strong></div>`;};
    form.addEventListener('input',update);update();
    modal.querySelectorAll('[data-close],.admin-modal-backdrop').forEach(x=>x.addEventListener('click',()=>modal.remove()));
    form.addEventListener('submit',async e=>{e.preventDefault();const save=form.querySelector('[type="submit"]');save.disabled=true;save.textContent='Зберігаємо…';try{await invoke({action:'save_finance',bookingId:b.id,issuePayment:Number(form.issue.value||0),usedPackets:isPuzzi(b)?Number(form.used.value||0):0,storyMention:isPuzzi(b)&&form.story.checked});await loadBookings(true);modal.remove();location.reload();}catch(err){save.disabled=false;save.textContent='Зберегти розрахунок';alert(err.message||'Не вдалося зберегти');}});
  }
  function analyticsData(items,days=30){
    const since=days?Date.now()-days*86400000:0;
    const filtered=items.filter(b=>!since||new Date(b.start_at||b.created_at).getTime()>=since);
    const completed=filtered.filter(b=>b.status==='completed');
    const counted=completed.length?completed:filtered.filter(b=>!['cancelled','declined'].includes(b.status));
    const revenue=counted.reduce((s,b)=>s+Number(b.total_amount||0),0);
    const chemistry=counted.reduce((s,b)=>s+Number(b.extras_amount||0),0);
    const delivery=counted.reduce((s,b)=>s+Number(b.delivery_amount||0),0);
    const byProduct={};counted.forEach(b=>{const k=b.product_label||b.product_code;byProduct[k]=(byProduct[k]||0)+1;});
    return{filtered,counted,revenue,chemistry,delivery,avg:counted.length?Math.round(revenue/counted.length):0,byProduct};
  }
  async function showAnalytics(days=30){
    const shell=document.querySelector('.admin-pwa-shell');if(!shell)return;
    document.querySelectorAll('.admin-calendar-section,.admin-bookings-section,.admin-upcoming-section').forEach(x=>x.hidden=true);
    let section=shell.querySelector('.admin-analytics-section');if(!section){section=document.createElement('section');section.className='admin-analytics-section';shell.append(section);}
    section.hidden=false;section.innerHTML='<p class="admin-empty">Рахуємо показники…</p>';
    const items=await loadBookings(true),a=analyticsData(items,days);
    const products=Object.entries(a.byProduct).sort((x,y)=>y[1]-x[1]);const max=Math.max(1,...products.map(x=>x[1]));
    section.innerHTML=`<div class="admin-section-heading"><div><h2>Аналітика</h2><p>Реальні показники VAcleaner за вибраний період</p></div><select class="admin-analytics-period"><option value="7" ${days===7?'selected':''}>7 днів</option><option value="30" ${days===30?'selected':''}>30 днів</option><option value="90" ${days===90?'selected':''}>90 днів</option><option value="0" ${days===0?'selected':''}>Увесь час</option></select></div>
      <div class="admin-kpi-grid"><article><span>Бронювань</span><strong>${a.counted.length}</strong></article><article><span>Виручка</span><strong>${money(a.revenue)}</strong></article><article><span>Середній чек</span><strong>${money(a.avg)}</strong></article><article><span>Хімія</span><strong>${money(a.chemistry)}</strong></article><article><span>Доставка</span><strong>${money(a.delivery)}</strong></article><article><span>Нові заявки</span><strong>${a.filtered.filter(b=>b.status==='pending').length}</strong></article></div>
      <div class="admin-analytics-grid"><article><h3>Популярність техніки</h3>${products.length?products.map(([name,value])=>`<div class="admin-product-stat"><div><span>${name}</span><b>${value}</b></div><i><em style="width:${Math.round(value/max*100)}%"></em></i></div>`).join(''):'<p>Ще немає даних.</p>'}</article>
      <article><h3>Статуси</h3>${['pending','waiting_payment','confirmed','issued','completed','cancelled'].map(status=>`<div class="admin-status-stat"><span>${({pending:'Нові',waiting_payment:'Очікують передплату',confirmed:'Підтверджені',issued:'Видані',completed:'Повернені',cancelled:'Скасовані'})[status]}</span><b>${a.filtered.filter(b=>b.status===status).length}</b></div>`).join('')}</article></div>`;
    section.querySelector('select').addEventListener('change',e=>showAnalytics(Number(e.target.value)));
  }
  function enhanceTabs(){
    const tabs=document.querySelector('.admin-pwa-tabs');if(!tabs)return;
    tabs.classList.add('admin-pwa-tabs-four');
    let btn=tabs.querySelector('.admin-analytics-tab');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='admin-analytics-tab';btn.textContent='Аналітика';tabs.append(btn);btn.addEventListener('click',()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('is-active',x===btn));showAnalytics(30);});}
    [...tabs.querySelectorAll('button:not(.admin-analytics-tab)')].forEach(x=>{if(x.dataset.analyticsBound)return;x.dataset.analyticsBound='1';x.addEventListener('click',()=>{tabs.querySelector('.admin-analytics-tab')?.classList.remove('is-active');document.querySelector('.admin-analytics-section')?.setAttribute('hidden','');});});
  }
  document.addEventListener('click',async e=>{const btn=e.target.closest('.action-finance');if(!btn)return;e.preventDefault();e.stopPropagation();try{const items=await loadBookings();const b=items.find(x=>x.booking_code===btn.dataset.bookingCode);if(b)openFinance(b);}catch(err){alert(err.message||'Не вдалося відкрити розрахунок');}},true);
  let queued=false;const run=()=>{if(queued)return;queued=true;requestAnimationFrame(async()=>{queued=false;enhanceTabs();await enhanceCards();});};
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();


/* VAcleaner Manager v2.2.14 — stable mobile form and correct Telegram text */
(()=>{
  'use strict';
  const API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-admin-bookings-v2';
  const KEY='sb_publishable_-UdAKDf5jzIP6N9rBp927g_VhyJKeog';
  let cache=null;
  const getToken=()=>{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!key.includes('auth-token'))continue;
      try{const raw=JSON.parse(localStorage.getItem(key)||'null'),stack=[raw];while(stack.length){const x=stack.pop();if(!x)continue;if(typeof x==='object'){if(typeof x.access_token==='string')return x.access_token;Object.values(x).forEach(v=>stack.push(v));}}}catch{}
    }
    return '';
  };
  async function getBookings(){
    if(cache)return cache;
    const token=getToken();
    if(!token)throw new Error('Сесію не знайдено');
    const response=await fetch(API,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'list',status:''})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Не вдалося отримати бронювання');
    cache=data.bookings||[];return cache;
  }
  const codeFromCard=card=>card?.querySelector('header span')?.textContent?.split('·')[0]?.trim()||'';
  const dateShort=v=>{if(!v)return '—';const [y,m,d]=String(v).slice(0,10).split('-');return `${d}.${m}`;};
  const exactTime=(b,key,fallback)=>{
    const value=b?.extras?.[key];
    return typeof value==='string'&&/^\d{2}:\d{2}$/.test(value)?value:fallback;
  };
  const fallbackTime=(windowCode,isReturn=false)=>windowCode==='morning'?(isReturn?'09:30':'07:00'):(isReturn?'20:00':'17:30');
  const amount=v=>`${new Intl.NumberFormat('uk-UA').format(Number(v)||0)} грн`;
  const copyText=async text=>{
    try{await navigator.clipboard.writeText(text);return true;}catch{}
    const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;
  };
  function buildTelegram(b){
    const issue=Number(b?.deposit_amount||b?.extras?.finance?.issue_payment||0);
    const total=Number(b?.total_amount||0);
    const booking=Number(b?.prepayment_amount||200);
    const pickup=exactTime(b,'pickup_time',fallbackTime(b.pickup_window,false));
    const address=b.fulfillment==='delivery'?(b.fulfillment_address||'Адресу не вказано'):'Самовивіз · Європейська, 146Е';
    const telegram=(b.customer_telegram||'').trim();
    return [
      `Дата📆: ${dateShort(b.start_date)} ${pickup}`,
      `Оренда🚀: ${b.product_label||'—'}`,
      `Ціна💶: ${amount(total)}`,
      `Бронювання: ${amount(booking)}`,
      `Авансовий платіж: +${amount(issue)}`,
      `Адреса📫: ${address}`,
      `Тел: ${b.customer_phone||'—'}`,
      telegram?`${b.customer_name||'Клієнт'} в Telegram: ${telegram}`:`${b.customer_name||'Клієнт'}`
    ].join('\n');
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button||!button.textContent.includes('Скопіювати для Telegram'))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const original=button.textContent;button.disabled=true;button.textContent='Копіюємо…';
    try{
      const card=button.closest('.admin-booking-card');
      const code=codeFromCard(card);
      const bookings=await getBookings();
      const booking=bookings.find(item=>item.booking_code===code);
      if(!booking)throw new Error('Бронювання не знайдено');
      await copyText(buildTelegram(booking));
      button.textContent='Скопійовано ✓';
      setTimeout(()=>{button.disabled=false;button.textContent=original;},1400);
    }catch(error){button.disabled=false;button.textContent=original;alert(error?.message||'Не вдалося скопіювати');}
  },true);
})();
