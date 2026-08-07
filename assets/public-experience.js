(()=>{
  'use strict';

  const CORE=window.VACLEANER_CORE||null;
  const VERSION=CORE?.version||'3.0.0';
  const INSTAGRAM='https://www.instagram.com/vacleaner_washing.pl/';
  const REVIEW_HIGHLIGHT_1='https://www.instagram.com/stories/highlights/18130438687549534/';
  const REVIEW_HIGHLIGHT_2='https://www.instagram.com/stories/highlights/18303073276178357/';
  const SETTINGS_API='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-settings';
  const FALLBACK_DEPOSIT_RULES={oneUnit:{day:1000,weekend:2000},twoUnits:{day:1500,weekend:3000},general:{day:2000,weekend:3000},elite:{day:3000,weekend:4000}};
  const FALLBACK_ALIASES={'Kärcher Puzzi':'puzzi','Kärcher Puzzi 8/1':'puzzi','Puzzi + Jimmy':'puzzi_jimmy','Puzzi + робот для вікон':'puzzi_abir','Puzzi + робот ABIR':'puzzi_abir','Kärcher SC 2':'sc2','Kärcher SC 2 Deluxe':'sc2','Робот для вікон':'abir','Робот ABIR':'abir','Тариф «Комбо»':'combo','Комбо · Puzzi + SC 2':'combo','Генеральне':'general','Генеральне прибирання':'general','Ідеальні вікна':'ideal_windows','HOME RESET':'elite'};
  const clone=value=>CORE?.clone?CORE.clone(value):JSON.parse(JSON.stringify(value));
  const DEFAULT_DEPOSIT_RULES=clone(CORE?.depositRules||FALLBACK_DEPOSIT_RULES);
  const PRODUCT_ALIASES=CORE?.productAliases||FALLBACK_ALIASES;
  let depositRules=clone(DEFAULT_DEPOSIT_RULES);
  let calendarReturnFocus=null;
  let calendarScrollLock=null;
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
    if(!input.closest('.booking-date-grid'))return;
    if(dateState.has(input)){updateDateTrigger(input);return;}
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
      <div class="vx-calendar-toolbar"><button type="button" class="vx-calendar-nav vx-calendar-prev" aria-label="Попередній місяць">‹</button><div class="vx-calendar-month" aria-live="polite"></div><button type="button" class="vx-calendar-nav vx-calendar-next" aria-label="Наступний місяць">›</button></div>
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
    document.addEventListener('keydown',e=>{
      if(!layer.classList.contains('is-open')||e.key!=='Tab')return;
      const focusable=[...layer.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),[tabindex]:not([tabindex="-1"])')];
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    });
    return layer;
  }

  function lockCalendarScroll(){
    if(calendarScrollLock)return;
    const root=document.documentElement;
    const beforeWidth=root.clientWidth;
    const basePadding=parseFloat(getComputedStyle(root).paddingRight)||0;
    calendarScrollLock={overflow:root.style.overflow,paddingRight:root.style.paddingRight};
    root.style.overflow='hidden';
    const releasedGutter=Math.max(0,root.clientWidth-beforeWidth);
    if(releasedGutter>0)root.style.paddingRight=`${basePadding+releasedGutter}px`;
  }
  function unlockCalendarScroll(){
    if(!calendarScrollLock)return;
    const root=document.documentElement;
    root.style.overflow=calendarScrollLock.overflow;
    root.style.paddingRight=calendarScrollLock.paddingRight;
    calendarScrollLock=null;
  }
  function openCalendar(input){
    activeDateInput=input;
    calendarReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const selected=parseDate(input.value);
    const min=parseDate(input.min);
    viewDate=selected||min||new Date();
    viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),1,12);
    const layer=ensureCalendar();
    layer.querySelector('.vx-calendar-title').textContent=`Дата ${dateRole(input)}`;
    renderCalendar();
    lockCalendarScroll();
    layer.classList.add('is-open');
    setTimeout(()=>layer.querySelector('.vx-calendar-day.is-selected:not(:disabled),.vx-calendar-day.is-today:not(:disabled),.vx-calendar-day:not(:disabled),.vx-calendar-close')?.focus(),20);
  }
  function closeCalendar(){
    const layer=document.querySelector('.vx-calendar-layer');
    layer?.classList.remove('is-open');
    unlockCalendarScroll();
    activeDateInput=null;
    const back=calendarReturnFocus;calendarReturnFocus=null;
    if(back&&document.contains(back))requestAnimationFrame(()=>back.focus());
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
    const enabled=[...grid.querySelectorAll('.vx-calendar-day:not(:disabled)')];
    enabled.forEach(btn=>{
      btn.addEventListener('click',()=>chooseDate(parseDate(btn.dataset.date)));
      btn.addEventListener('keydown',e=>{
        const current=enabled.indexOf(btn);let next=current;
        if(e.key==='ArrowLeft')next=current-1;
        else if(e.key==='ArrowRight')next=current+1;
        else if(e.key==='ArrowUp')next=current-7;
        else if(e.key==='ArrowDown')next=current+7;
        else if(e.key==='Home')next=Math.max(0,current-(current%7));
        else if(e.key==='End')next=Math.min(enabled.length-1,current+(6-current%7));
        else if(e.key==='PageUp'){e.preventDefault();viewDate=new Date(year,month-1,1,12);renderCalendar();requestAnimationFrame(()=>document.querySelector('.vx-calendar-day.is-selected:not(:disabled),.vx-calendar-day:not(:disabled)')?.focus());return}
        else if(e.key==='PageDown'){e.preventDefault();viewDate=new Date(year,month+1,1,12);renderCalendar();requestAnimationFrame(()=>document.querySelector('.vx-calendar-day.is-selected:not(:disabled),.vx-calendar-day:not(:disabled)')?.focus());return}
        else return;
        e.preventDefault();enabled[Math.max(0,Math.min(enabled.length-1,next))]?.focus();
      });
    });
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


  function arrowIcon(){return '<svg class="vx-review-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"></path></svg>'}
  function enhanceReviewLinks(){
    document.querySelectorAll('.mobile-menu nav a[href="/vidhuky"]').forEach(a=>{
      a.classList.add('vx-mobile-review-link');
      if(!a.querySelector('.vx-review-arrow'))a.insertAdjacentHTML('beforeend',arrowIcon());
    });
  }
  function mergeDepositRules(value){
    if(!value||typeof value!=='object')return;
    for(const key of Object.keys(DEFAULT_DEPOSIT_RULES)){
      const src=value[key];if(!src||typeof src!=='object')continue;
      depositRules[key]={day:Number(src.day)||DEFAULT_DEPOSIT_RULES[key].day,weekend:Number(src.weekend)||DEFAULT_DEPOSIT_RULES[key].weekend};
    }
  }
  function depositGroup(code){
    if(code==='elite')return'elite';if(code==='general')return'general';
    if(['puzzi_jimmy','puzzi_abir','combo','ideal_windows'].includes(code))return'twoUnits';
    return'oneUnit';
  }
  function fullWeekend(start,finish,pickupWindow='morning',returnWindow='evening'){
    return Boolean(CORE?.isWeekendDeposit?.(start,finish,pickupWindow,returnWindow));
  }
  function selectedProductCode(){
    const btn=document.querySelector('.booking-products button[aria-pressed="true"],.booking-products button.is-selected,.booking-products button.selected');
    const title=btn?.querySelector('strong')?.textContent?.trim()||'';return PRODUCT_ALIASES[title]||'';
  }
  function currentBookingDates(){const dates=[...document.querySelectorAll('.booking-date-grid input[type="date"]')],windows=[...document.querySelectorAll('.booking-date-grid select')];return{start:dates[0]?.value||'',finish:dates[1]?.value||'',pickupWindow:windows[0]?.value||'morning',returnWindow:windows[1]?.value||'evening'}}
  function currentDeposit(){const code=selectedProductCode();if(!code)return 0;const dates=currentBookingDates();if(!dates.start||!dates.finish)return 0;const group=depositGroup(code),rule=depositRules[group]||DEFAULT_DEPOSIT_RULES[group];return Number(fullWeekend(dates.start,dates.finish,dates.pickupWindow,dates.returnWindow)?rule.weekend:rule.day)||0}
  function formatMoney(value){return new Intl.NumberFormat('uk-UA').format(Number(value)||0)+' грн'}
  function enhanceDepositSummary(){
    const summary=document.querySelector('.booking-summary');if(!summary)return;
    const value=currentDeposit();
    const total=summary.querySelector('.booking-summary-total');
    if(!total)return;
    summary.querySelectorAll('.vx-summary-prepayment,.vx-summary-deposit').forEach(el=>el.remove());
    const prepayment=document.createElement('div');
    prepayment.className='vx-summary-prepayment vx-summary-finance-row';
    prepayment.innerHTML='<span><b>Бронювання дати</b><small>Сплачується після підтвердження заявки.</small></span><strong>200 грн</strong>';
    total.insertAdjacentElement('beforebegin',prepayment);
    const deposit=document.createElement('div');
    deposit.className='vx-summary-deposit vx-summary-finance-row';
    deposit.innerHTML=`<span><b>Залоговий платіж</b><small>Сплачується під час отримання техніки.</small></span><strong>${value?formatMoney(value):'—'}</strong>`;
    total.insertAdjacentElement('beforebegin',deposit);
    const totalLabel=summary.querySelector('.booking-summary-total span');if(totalLabel)totalLabel.textContent='Вартість оренди';
    let note=summary.querySelector('.vx-summary-deposit-note')||summary.querySelector(':scope > p');
    if(note){
      note.className='vx-summary-deposit-note';
      note.textContent='Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.';
    }
  }
  async function loadDepositRules(){try{const r=await fetch(SETTINGS_API,{cache:'no-store'}),d=await r.json();if(r.ok&&d.depositRules){mergeDepositRules(d.depositRules);enhanceDepositSummary()}}catch{}}
  function termsMarkup(){
    return `<section class="vx-rental-terms" data-vx-rental-terms="${VERSION}" aria-labelledby="vx-rental-terms-title"><div class="vx-rental-terms__inner"><div class="vx-rental-terms__head"><p>Умови оренди · без прихованих платежів</p><h2 id="vx-rental-terms-title">Що потрібно для оформлення</h2><span>Передоплата та фактично отриманий залоговий платіж формують спільний фінальний розрахунок при поверненні.</span></div><div class="vx-rental-steps"><article><b>01</b><div><h3>Передплата 200 грн</h3><p>Вноситься після підтвердження заявки, закріплює дату та входить у фінальний взаєморозрахунок.</p><dl><div><dt>ФОП</dt><dd>Невідома Анна Сергіївна</dd></div><div><dt>IBAN</dt><dd>UA523220010000026006370119233</dd></div><div><dt>ІПН</dt><dd>3314215243</dd></div><div><dt>Призначення</dt><dd>сплата за оренду техніки</dd></div></dl></div></article><article><b>02</b><div><h3>Документ для договору</h3><p>Новий клієнт надсилає фото паспорта, ID-картки або водійського посвідчення менеджеру приватно. Якщо ви вже орендували техніку й дані є в базі — повторно надсилати документ не потрібно.</p></div></article><article><b>03</b><div><h3>Залоговий платіж</h3><p>Сплачується під час отримання техніки. Після повернення техніки з передоплати та залогового платежу віднімається вартість оренди, доставки, додаткових засобів і використаної хімії. Залишок повертається клієнту або клієнт доплачує різницю.</p><div class="vx-deposit-table"><span><b>1 одиниця</b><em>1 000 грн</em><small>2+ доби у вікенд · 2 000 грн</small></span><span><b>2 одиниці / комплект</b><em>1 500 грн</em><small>2+ доби у вікенд · 3 000 грн</small></span><span><b>Генеральне</b><em>2 000 грн</em><small>2+ доби у вікенд · 3 000 грн</small></span><span><b>HOME RESET</b><em>3 000 грн</em><small>2+ доби у вікенд · 4 000 грн</small></span></div></div></article></div><p class="vx-rental-terms__privacy">Номери документів зберігаються у закритій базі VAcleaner лише для оформлення договорів і не показуються на публічному сайті.</p></div></section>`;
  }
  function injectTerms(){
    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(path!=='/umovy'||document.querySelector('[data-vx-rental-terms]'))return;
    const box=document.createElement('div');box.innerHTML=termsMarkup();
    const section=box.firstElementChild,footer=document.querySelector('footer'),cta=document.querySelector('.final-cta');
    if(cta)cta.insertAdjacentElement('beforebegin',section);else footer?.insertAdjacentElement('beforebegin',section);
  }

  function replacePublicLabels(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const p=node.parentElement;
      if(!p||['SCRIPT','STYLE','TEXTAREA','NOSCRIPT'].includes(p.tagName))return NodeFilter.FILTER_REJECT;
      const value=node.nodeValue||'';
      return /Робот ABIR|Puzzi \+ робот ABIR|SC 2 \+ ABIR|Puzzi \+ SC 2 \+ Jimmy \+ ABIR|ABIR WD8/.test(value)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const original=node.nodeValue||'';
      let value=original
        .split('Puzzi + SC 2 + Jimmy + ABIR').join('Puzzi + SC 2 + Jimmy + робот для вікон')
        .split('Puzzi + робот ABIR').join('Puzzi + робот для вікон')
        .split('SC 2 + ABIR').join('SC 2 + робот для вікон')
        .split('Робот ABIR').join('Робот для вікон');
      if(value.includes('ABIR WD8')&&!value.includes('Робот для вікон · ABIR WD8')){
        value=value.split('ABIR WD8').join('Робот для вікон · ABIR WD8');
      }
      if(value!==original)node.nodeValue=value;
    });
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

  function retireLegacyPublicPwa(){
    if(!('serviceWorker' in navigator)||location.pathname.startsWith('/admin/'))return;
    navigator.serviceWorker.getRegistrations().then(registrations=>{
      registrations.forEach(registration=>{
        try{
          const scopePath=new URL(registration.scope).pathname;
          const worker=registration.active||registration.waiting||registration.installing;
          const scriptPath=worker?.scriptURL?new URL(worker.scriptURL).pathname:'';
          if(scopePath==='/'&&scriptPath==='/sw.js')registration.unregister();
        }catch{}
      });
    }).catch(()=>{});
  }

  const mobileBookingMedia=window.matchMedia('(max-width:620px)');
  const mobileBookingStepIds=['booking-products','booking-dates','booking-extras','booking-contact'];
  let mobileBookingMediaBound=false;

  function mobileBookingParts(){
    const form=document.querySelector('.booking-form');
    if(!form)return null;
    const steps=mobileBookingStepIds.map(id=>form.querySelector(`#${id}`)).filter(Boolean);
    const progress=form.querySelector('.booking-progress');
    const buttons=progress?[...progress.querySelectorAll('button')]:[];
    return steps.length===mobileBookingStepIds.length?{form,steps,progress,buttons}:null;
  }
  function setMobileBookingStep(index,{scroll=false}={}){
    const parts=mobileBookingParts();
    if(!parts||!mobileBookingMedia.matches)return;
    const next=Math.max(0,Math.min(parts.steps.length-1,Number(index)||0));
    parts.form.dataset.vxActiveStep=String(next);
    parts.steps.forEach((step,stepIndex)=>{
      const active=stepIndex===next;
      step.classList.toggle('is-vx-active',active);
      step.setAttribute('aria-hidden',active?'false':'true');
    });
    parts.buttons.forEach((button,buttonIndex)=>{
      button.classList.toggle('is-vx-active',buttonIndex===next);
      if(buttonIndex===next)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    if(scroll){
      requestAnimationFrame(()=>{
        const top=parts.progress?.getBoundingClientRect().top||0;
        if(Math.abs(top-68)>4)window.scrollBy({top:top-68,behavior:'smooth'});
      });
    }
  }
  function mobileStepFromCta(button){
    const label=(button?.textContent||'').trim();
    if(label.includes('Обрати техніку'))return 0;
    if(label.includes('Обрати дату'))return 1;
    if(label.includes('Вказати адресу'))return 2;
    if(label.includes('До контактів'))return 3;
    return -1;
  }
  function enhanceMobileBookingFlow(){
    const parts=mobileBookingParts();
    if(!parts)return;
    const mobile=mobileBookingMedia.matches;
    parts.form.classList.toggle('vx-mobile-stepper',mobile);
    if(!mobile){
      parts.steps.forEach(step=>{step.classList.remove('is-vx-active');step.removeAttribute('aria-hidden')});
      parts.buttons.forEach(button=>{button.classList.remove('is-vx-active');button.removeAttribute('aria-current')});
      return;
    }
    if(!parts.form.dataset.vxMobileStepperBound){
      parts.form.dataset.vxMobileStepperBound='1';
      parts.form.addEventListener('click',event=>{
        const progressButton=event.target.closest('.booking-progress button');
        if(progressButton){
          const liveButtons=[...parts.form.querySelectorAll('.booking-progress button')];
          const index=liveButtons.indexOf(progressButton);
          if(index>=0)setMobileBookingStep(index);
          return;
        }
        const button=event.target.closest('.booking-mobile-summary button');
        if(!button||button.type==='submit')return;
        const target=mobileStepFromCta(button);
        if(target>=0)setMobileBookingStep(target);
      },true);
    }
    setMobileBookingStep(Number(parts.form.dataset.vxActiveStep||0));
    if(!mobileBookingMediaBound){
      mobileBookingMediaBound=true;
      mobileBookingMedia.addEventListener?.('change',()=>enhanceMobileBookingFlow());
    }
  }

  function enhance(){
    if(location.pathname.startsWith('/admin/'))return;
    replacePublicLabels();
    document.querySelectorAll('a[href="/vidhuky"]').forEach(a=>{if(a.textContent.trim()==='Процес')a.textContent='Відгуки'});
    enhanceReviewLinks();
    document.querySelectorAll('.booking-date-grid input[type="date"]').forEach(enhanceDate);
    document.querySelectorAll('.booking-date-grid select').forEach(enhanceSelect);
    injectProof();
    injectTerms();
    enhanceDepositSummary();
    enhanceMobileBookingFlow();
  }

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;enhance()});
  });
  document.addEventListener('DOMContentLoaded',()=>{
    retireLegacyPublicPwa();
    loadDepositRules();
    enhance();observer.observe(document.body,{childList:true,subtree:true});
  });
  window.addEventListener('vacleaner:slots-updated',()=>document.querySelectorAll('.booking-date-grid select').forEach(updateSlots));
  document.addEventListener('click',e=>{if(e.target.closest('.booking-products button'))requestAnimationFrame(enhanceDepositSummary)});
  document.addEventListener('change',e=>{if(e.target.matches('.booking-date-grid input[type="date"],.booking-date-grid select'))requestAnimationFrame(enhanceDepositSummary)});
})();
