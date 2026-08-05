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
