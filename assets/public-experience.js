(()=>{
  'use strict';

  const VERSION='2.9.10.0';
  const INSTAGRAM='https://www.instagram.com/vacleaner_washing.pl/';
  const REVIEW_HIGHLIGHT_1='https://www.instagram.com/stories/highlights/18130438687549534/';
  const REVIEW_HIGHLIGHT_2='https://www.instagram.com/stories/highlights/18303073276178357/';
  const months=['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
  const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const dateState=new WeakMap();
  const slotState=new WeakMap();
  let activeDateInput=null;
  let viewDate=new Date();

  function setNativeValue(el,value){
    const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if(setter) setter.call(el,value); else el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function parseDate(value){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!m)return null;
    return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
  }
  function isoDate(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function sameDay(a,b){return !!a&&!!b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
  function formatDate(value){
    const d=parseDate(value);
    if(!d)return 'Оберіть дату';
    return new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'long',year:'numeric'}).format(d);
  }
  function dateRole(input){
    const text=(input.closest('label')?.childNodes?.[0]?.textContent||input.closest('label')?.textContent||'').trim().toLowerCase();
    return text.includes('повернен')?'повернення':'отримання';
  }

  function iconCalendar(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M3.5 9.5h17"></path></svg>'}
  function iconSun(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"></circle><path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4"></path></svg>'}
  function iconMoon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 15.1A8 8 0 0 1 8.9 4.5a8.1 8.1 0 1 0 10.6 10.6Z"></path></svg>'}

  function updateDateTrigger(input){
    const state=dateState.get(input);if(!state)return;
    const has=!!input.value;
    state.value.textContent=formatDate(input.value);
    state.hint.textContent=has?`Дата ${dateRole(input)} обрана`:'Відкриється календар українською';
    state.trigger.setAttribute('aria-label',`${dateRole(input)}: ${state.value.textContent}`);
  }

  function enhanceDate(input){
    if(dateState.has(input)||!input.closest('.booking-date-grid'))return;
    input.classList.add('vx-native-control');
    input.tabIndex=-1;
    const trigger=document.createElement('button');
    trigger.type='button';trigger.className='vx-date-trigger';
    trigger.innerHTML=`<span class="vx-date-trigger__copy"><span class="vx-date-trigger__value"></span><span class="vx-date-trigger__hint"></span></span><span class="vx-date-trigger__icon">${iconCalendar()}</span>`;
    input.insertAdjacentElement('afterend',trigger);
    const state={trigger,value:trigger.querySelector('.vx-date-trigger__value'),hint:trigger.querySelector('.vx-date-trigger__hint')};
    dateState.set(input,state);
    trigger.addEventListener('click',()=>openCalendar(input));
    input.closest('label')?.addEventListener('click',e=>{if(e.target===input.closest('label')){e.preventDefault();trigger.click()}});
    input.addEventListener('invalid',e=>{e.preventDefault();openCalendar(input)});
    input.addEventListener('change',()=>updateDateTrigger(input));
    input.addEventListener('input',()=>updateDateTrigger(input));
    updateDateTrigger(input);
  }

  function ensureCalendar(){
    let layer=document.querySelector('.vx-calendar-layer');
    if(layer)return layer;
    layer=document.createElement('div');
    layer.className='vx-calendar-layer';
    layer.innerHTML=`<section class="vx-calendar-dialog" role="dialog" aria-modal="true" aria-labelledby="vx-calendar-title">
      <header class="vx-calendar-top"><div><span class="vx-calendar-kicker">VAcleaner · дата бронювання</span><h2 class="vx-calendar-title" id="vx-calendar-title">Оберіть дату</h2></div><button type="button" class="vx-calendar-close" aria-label="Закрити">×</button></header>
      <div class="vx-calendar-toolbar"><button type="button" class="vx-calendar-nav vx-calendar-prev" aria-label="Попередній місяць">‹</button><div class="vx-calendar-month"></div><button type="button" class="vx-calendar-nav vx-calendar-next" aria-label="Наступний місяць">›</button></div>
      <div class="vx-calendar-weekdays">${weekdays.map(x=>`<span>${x}</span>`).join('')}</div><div class="vx-calendar-grid"></div>
      <footer class="vx-calendar-footer"><span class="vx-calendar-meta">Доступні дати враховують обмеження форми</span><button type="button" class="vx-calendar-today">Сьогодні</button></footer>
    </section>`;
    document.body.appendChild(layer);
    layer.addEventListener('click',e=>{if(e.target===layer)closeCalendar()});
    layer.querySelector('.vx-calendar-close').addEventListener('click',closeCalendar);
    layer.querySelector('.vx-calendar-prev').addEventListener('click',()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1,12);renderCalendar()});
    layer.querySelector('.vx-calendar-next').addEventListener('click',()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1,12);renderCalendar()});
    layer.querySelector('.vx-calendar-today').addEventListener('click',()=>{
      if(!activeDateInput)return;
      const today=new Date();today.setHours(12,0,0,0);
      const min=parseDate(activeDateInput.min),max=parseDate(activeDateInput.max);
      if((min&&today<min)||(max&&today>max))return;
      chooseDate(today);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&layer.classList.contains('is-open'))closeCalendar()});
    return layer;
  }

  function openCalendar(input){
    activeDateInput=input;
    const selected=parseDate(input.value);
    const min=parseDate(input.min);
    viewDate=selected||min||new Date();
    viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),1,12);
    const layer=ensureCalendar();
    layer.querySelector('.vx-calendar-title').textContent=`Дата ${dateRole(input)}`;
    renderCalendar();
    layer.classList.add('is-open');
    document.documentElement.style.overflow='hidden';
    setTimeout(()=>layer.querySelector('.vx-calendar-close')?.focus(),20);
  }
  function closeCalendar(){
    const layer=document.querySelector('.vx-calendar-layer');
    layer?.classList.remove('is-open');
    document.documentElement.style.overflow='';
    activeDateInput=null;
  }
  function chooseDate(date){
    if(!activeDateInput)return;
    setNativeValue(activeDateInput,isoDate(date));
    updateDateTrigger(activeDateInput);
    closeCalendar();
  }
  function renderCalendar(){
    const layer=ensureCalendar(),grid=layer.querySelector('.vx-calendar-grid');
    const year=viewDate.getFullYear(),month=viewDate.getMonth();
    layer.querySelector('.vx-calendar-month').textContent=`${months[month]} ${year}`;
    const first=new Date(year,month,1,12),last=new Date(year,month+1,0,12);
    const leading=(first.getDay()+6)%7;
    const min=parseDate(activeDateInput?.min),max=parseDate(activeDateInput?.max),selected=parseDate(activeDateInput?.value),today=new Date();today.setHours(12,0,0,0);
    const minMonth=min?new Date(min.getFullYear(),min.getMonth(),1,12):null;
    const maxMonth=max?new Date(max.getFullYear(),max.getMonth(),1,12):null;
    layer.querySelector('.vx-calendar-prev').disabled=!!minMonth&&viewDate<=minMonth;
    layer.querySelector('.vx-calendar-next').disabled=!!maxMonth&&viewDate>=maxMonth;
    const cells=[];
    for(let i=0;i<42;i++){
      const day=i-leading+1;
      const d=new Date(year,month,day,12);
      const outside=d.getMonth()!==month;
      const disabled=outside||(min&&d<min)||(max&&d>max);
      cells.push(`<button type="button" class="vx-calendar-day${outside?' is-outside':''}${sameDay(d,today)?' is-today':''}${sameDay(d,selected)?' is-selected':''}" data-date="${isoDate(d)}" ${disabled?'disabled':''} aria-label="${new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'}).format(d)}">${d.getDate()}</button>`);
    }
    grid.innerHTML=cells.join('');
    grid.querySelectorAll('.vx-calendar-day:not(:disabled)').forEach(btn=>btn.addEventListener('click',()=>chooseDate(parseDate(btn.dataset.date))));
  }

  function slotParts(text){
    const normalized=String(text||'').replace(/\s+/g,' ').trim();
    const parts=normalized.split('·').map(x=>x.trim());
    return {name:parts[0]||'Час',time:parts.slice(1).join(' · ')||''};
  }
  function updateSlots(select){
    const state=slotState.get(select);if(!state)return;
    const options=[...select.options].filter(o=>o.value);
    state.wrap.innerHTML='';
    options.forEach(option=>{
      const data=slotParts(option.textContent);
      const btn=document.createElement('button');
      btn.type='button';btn.className='vx-slot-option';btn.dataset.value=option.value;
      btn.setAttribute('aria-pressed',String(select.value===option.value));
      if(select.value===option.value)btn.classList.add('is-selected');
      btn.innerHTML=`<span class="vx-slot-option__icon">${/вечір/i.test(data.name)?iconMoon():iconSun()}</span><span class="vx-slot-option__copy"><small>${data.name}</small><strong>${data.time}</strong></span>`;
      btn.addEventListener('click',()=>{setNativeValue(select,option.value);updateSlots(select)});
      state.wrap.appendChild(btn);
    });
  }
  function enhanceSelect(select){
    if(slotState.has(select)||!select.closest('.booking-date-grid'))return;
    select.classList.add('vx-native-control');select.tabIndex=-1;
    const label=select.closest('label');label?.classList.add('vx-slot-field');
    const wrap=document.createElement('div');wrap.className='vx-slot-options';select.insertAdjacentElement('afterend',wrap);
    slotState.set(select,{wrap});
    select.addEventListener('change',()=>updateSlots(select));
    updateSlots(select);
  }

  function replacePublicLabels(root=document){
    const replacements=new Map([
      ['Робот ABIR','Робот для вікон'],
      ['Puzzi + робот ABIR','Puzzi + робот для вікон'],
      ['SC 2 + ABIR','SC 2 + робот для вікон'],
      ['Puzzi + SC 2 + Jimmy + ABIR','Puzzi + SC 2 + Jimmy + робот для вікон'],
      ['ABIR WD8','Робот для вікон · ABIR WD8']
    ]);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const p=node.parentElement;if(!p||['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName))return NodeFilter.FILTER_REJECT;
      return [...replacements.keys()].some(x=>node.nodeValue?.includes(x))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{let value=node.nodeValue;replacements.forEach((to,from)=>{value=value.split(from).join(to)});node.nodeValue=value});
  }

  function proofMarkup(){
    return `<section class="vx-proof" data-vx-proof="${VERSION}" aria-labelledby="vx-proof-title"><div class="vx-proof__inner"><div><p class="vx-proof__eyebrow">Оригінальні відгуки · Instagram Highlights</p><h2 id="vx-proof-title">Не кілька цитат. <em>Близько сотні реальних відгуків.</em></h2><p class="vx-proof__lead">У профілі VAcleaner збережено дві великі добірки повідомлень клієнтів. Ми не переписуємо їх «красивими словами» — відкривайте оригінальні сторіс і дивіться досвід людей із Полтави.</p><div class="vx-proof__actions"><a class="vx-proof__cta" href="${REVIEW_HIGHLIGHT_1}" target="_blank" rel="noreferrer">Відкрити першу добірку ↗</a><a class="vx-proof__secondary" href="/bronuvannia">Перевірити вільну дату</a></div></div><div class="vx-proof__panel"><div class="vx-proof__count"><span class="vx-proof__number">02</span><span class="vx-proof__count-copy">повні добірки реальних відгуків у Instagram Highlights</span></div><a class="vx-highlight" href="${REVIEW_HIGHLIGHT_1}" target="_blank" rel="noreferrer" aria-label="Відкрити першу добірку відгуків в Instagram"><span class="vx-highlight__ring"><span>01</span></span><span><strong>Відгуки · частина I</strong><small>Відкрити перший Highlight з відгуками</small></span></a><a class="vx-highlight" href="${REVIEW_HIGHLIGHT_2}" target="_blank" rel="noreferrer" aria-label="Відкрити другу добірку відгуків в Instagram"><span class="vx-highlight__ring"><span>02</span></span><span><strong>Відгуки · частина II</strong><small>Відкрити другий Highlight з відгуками</small></span></a><p class="vx-proof__note">Кожна картка відкриває відповідну добірку відгуків без переходу через профіль.</p></div></div></section>`;
  }
  function injectProof(){
    if(document.querySelector('[data-vx-proof]'))return;
    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(!['/','/bronuvannia','/vidhuky'].includes(path))return;
    const box=document.createElement('div');box.innerHTML=proofMarkup();const section=box.firstElementChild;
    if(path==='/'){
      const existing=document.querySelector('.v21-reviews');
      if(existing)existing.insertAdjacentElement('afterend',section);
      else document.querySelector('footer')?.insertAdjacentElement('beforebegin',section);
    }else if(path==='/bronuvannia'){
      document.querySelector('.booking-form')?.insertAdjacentElement('afterend',section);
    }else{
      const old=document.querySelector('.social-proof');
      if(old)old.replaceWith(section);else document.querySelector('.final-cta')?.insertAdjacentElement('beforebegin',section);
    }
  }

  function enhance(){
    if(location.pathname.startsWith('/admin/'))return;
    replacePublicLabels();
    document.querySelectorAll('a[href="/vidhuky"]').forEach(a=>{if(a.textContent.trim()==='Процес')a.textContent='Відгуки'});
    document.querySelectorAll('.booking-date-grid input[type="date"]').forEach(enhanceDate);
    document.querySelectorAll('.booking-date-grid select').forEach(enhanceSelect);
    injectProof();
  }

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;enhance()});
  });
  document.addEventListener('DOMContentLoaded',()=>{
    enhance();observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  });
  window.addEventListener('vacleaner:slots-updated',()=>document.querySelectorAll('.booking-date-grid select').forEach(updateSlots));
})();
