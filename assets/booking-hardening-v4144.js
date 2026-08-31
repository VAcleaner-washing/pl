(()=>{
'use strict';
if(!location.pathname.replace(/\/+$/,'').endsWith('/bronuvannia'))return;
const KEY='vacleaner_booking_draft_v4144';
const TTL=60*60*1000;
const params=new URLSearchParams(location.search);
const hasExternalPreset=()=>Boolean(params.get('product')||params.get('from')||params.get('promo')||params.get('extras')||location.hash);
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
function reactValue(el,value){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
  if(setter)setter.call(el,value);else el.value=value;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function reactChecked(el,value){
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'checked')?.set;
  if(setter)setter.call(el,Boolean(value));else el.checked=Boolean(value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function selectedProduct(){return $('#booking-products .booking-products button[aria-pressed="true"],#booking-products .booking-products button.is-selected,#booking-products .booking-products button.selected')?.dataset.productCode||''}
function controlKey(el){
  if(el.matches('[data-vac-address-detail]'))return 'address-detail';
  if(el.getAttribute('role')==='combobox'&&el.closest('.booking-delivery-address'))return 'address-main';
  if(el.closest('.booking-promo-field'))return 'promo';
  if(el.type==='tel')return 'phone';
  if(el.tagName==='TEXTAREA')return 'comment';
  if(el.type==='date')return `date-${$$('#booking-dates input[type="date"]').indexOf(el)}`;
  if(el.tagName==='SELECT')return `slot-${$$('#booking-dates select').indexOf(el)}`;
  if(el.type==='checkbox'||el.type==='radio'){
    const label=norm(el.closest('label')?.textContent).slice(0,120);
    return `${el.type}-${el.name||''}-${el.value||''}-${label}`;
  }
  const ph=el.getAttribute('placeholder');
  if(ph)return `field-${ph}`;
  return '';
}
function collect(){
  const form=$('.booking-form');if(!form)return null;
  const controls={};
  $$('input,select,textarea',form).forEach(el=>{
    if(el.classList.contains('vx-native-control')&&el.type!=='date')return;
    const key=controlKey(el);if(!key)return;
    if(el.type==='checkbox'||el.type==='radio')controls[key]={checked:el.checked};
    else controls[key]={value:el.value};
  });
  const fulfillment=$('#booking-extras .booking-choice-row button.is-selected,#booking-extras .booking-choice-row button[aria-pressed="true"]');
  return {schema:2,savedAt:Date.now(),product:selectedProduct(),task:$('#booking-products')?.dataset.vxSmartTask||'',fulfillment:norm(fulfillment?.textContent).startsWith('Доставка')?'delivery':norm(fulfillment?.textContent).startsWith('Самовивіз')?'pickup':'',controls,step:Number(form.dataset.vxActiveStep||0)};
}
function save(){try{const d=collect();if(d)sessionStorage.setItem(KEY,JSON.stringify(d))}catch{}}
function read(){try{const d=JSON.parse(sessionStorage.getItem(KEY)||'null');if(!d||d.schema!==2||Date.now()-Number(d.savedAt||0)>TTL){sessionStorage.removeItem(KEY);return null}return d}catch{return null}}
function clear(){try{sessionStorage.removeItem(KEY)}catch{}}
let restoring=false;
function applyControl(key,state){
  const form=$('.booking-form');if(!form)return false;
  const el=$$('input,select,textarea',form).find(x=>controlKey(x)===key);
  if(!el)return false;
  if(el.type==='radio'){
    // Radio restore is group-based: only replay the saved checked option. Dispatching
    // `change` for an unchecked radio fires React's onChange handler and can select
    // the wrong gift (the last radio in DOM). Native group behaviour unchecks peers.
    if(Boolean(state.checked)&&!el.checked)reactChecked(el,true);
  }else if(el.type==='checkbox'){
    if(Boolean(el.checked)!==Boolean(state.checked))reactChecked(el,state.checked);
  }else if(state.value!=null&&el.value!==state.value)reactValue(el,state.value);
  return true;
}
function restore(){
  if(hasExternalPreset())return;
  const d=read();if(!d)return;
  restoring=true;
  if(d.task&&window.__VAC_SMART_BOOKING_SET_TASK__)window.__VAC_SMART_BOOKING_SET_TASK__(d.task,{silent:true});
  if(d.product){
    const b=$(`#booking-products .booking-products button[data-product-code="${CSS.escape(d.product)}"]`);
    if(b&&!b.matches('[aria-pressed="true"],.is-selected,.selected'))b.click();
  }
  if(d.fulfillment){
    const candidates=$$('#booking-extras .booking-choice-row button');
    const b=candidates.find(x=>d.fulfillment==='delivery'?/^Доставка/.test(norm(x.textContent)):/^Самовивіз/.test(norm(x.textContent)));
    if(b&&!b.classList.contains('is-selected'))b.click();
  }
  let attempts=0;
  const replay=()=>{
    attempts++;
    let missing=0;
    for(const [k,v] of Object.entries(d.controls||{}))if(!applyControl(k,v))missing++;
    if(attempts<12&&missing)setTimeout(replay,180);
    else{
      const form=$('.booking-form');
      if(form&&matchMedia('(max-width:620px)').matches&&Number.isFinite(Number(d.step)))window.__VAC_BOOKING_SET_STEP__?.(Math.max(0,Math.min(3,Number(d.step))),{history:'replace'});
      restoring=false;
      const note=document.createElement('div');note.className='vx-draft-restored';note.textContent='Бронювання відновлено';
      $('.booking-progress')?.insertAdjacentElement('afterend',note);setTimeout(()=>note.remove(),2600);
    }
  };
  setTimeout(replay,120);
}
let saveTimer=0;
function scheduleSave(){if(restoring)return;clearTimeout(saveTimer);saveTimer=setTimeout(save,180)}
function bindPersistence(){
  const form=$('.booking-form');if(!form||form.dataset.vxDraftBound)return;
  form.dataset.vxDraftBound='1';
  form.addEventListener('input',scheduleSave,true);form.addEventListener('change',scheduleSave,true);form.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(scheduleSave,30)},true);
  const observer=new MutationObserver(()=>scheduleSave());observer.observe(form,{subtree:true,attributes:true,attributeFilter:['aria-pressed','class','data-vx-active-step'],childList:true});
  const successObserver=new MutationObserver(()=>{if(document.querySelector('.booking-success'))clear()});successObserver.observe(document.body,{childList:true,subtree:true});
}

const TASKS={
  sofa:{label:'Диван / крісла',title:'Диван або крісла',copy:'Для більшості м’яких меблів достатньо Puzzi. Якщо хочете додати сухий етап перед промиванням — оберіть Puzzi + Jimmy.',codes:['puzzi','puzzi_jimmy'],primary:'puzzi',badges:{puzzi:'Рекомендуємо',puzzi_jimmy:'Глибше очищення'},notes:{puzzi_jimmy:'Сухий етап: пил, шерсть, пилові кліщі та пов’язані алергени'}},
  mattress:{label:'Матрац / ліжко',title:'Матрац або ліжко',copy:'Для матраца рекомендуємо два етапи: Jimmy спочатку збирає сухий пил і пилових кліщів, Puzzi після цього глибоко промиває текстиль.',codes:['puzzi_jimmy','puzzi'],primary:'puzzi_jimmy',badges:{puzzi_jimmy:'Рекомендуємо',puzzi:'Простіший варіант'},notes:{puzzi_jimmy:'Jimmy → сухий етап · Puzzi → глибоке промивання'}},
  kitchen:{label:'Кухня / ванна',title:'Кухня або ванна',copy:'Для плитки, швів, сантехніки та твердих поверхонь основний вибір — пароочисник SC 2.',codes:['sc2','combo'],primary:'sc2',badges:{sc2:'Рекомендуємо',combo:'Якщо ще й диван'}},
  windows:{label:'Вікна / дзеркала',title:'Вікна та дзеркала',copy:'Робот бере на себе скло. Якщо потрібно пройти ще рами, кути й стики — дивіться комплект «Ідеальні вікна».',codes:['abir','ideal_windows'],primary:'abir',badges:{abir:'Рекомендуємо',ideal_windows:'Рами + стики'}},
  whole:{label:'Кілька зон / весь дім',title:'Кілька зон або весь дім',copy:'Оберіть масштаб: дивани + кухня/ванна, генеральне прибирання або повний HOME RESET з усією технікою.',codes:['combo','general','elite'],primary:'general',badges:{combo:'2 основні зони',general:'Рекомендуємо',elite:'Максимальний комплект'}},
  know:{label:'Я знаю, яку техніку хочу',title:'Уся техніка та комплекти',copy:'Показуємо весь каталог — оберіть конкретну техніку або комплект.',codes:null,primary:''}
};
function smartHtml(){return `<div class="vx-smart-entry" data-vx-smart-entry><div class="vx-smart-entry__head"><small>Оберіть задачу</small><h3>Що плануєте почистити?</h3><p>Один клік — покажемо відповідну техніку та комплекти.</p></div><div class="vx-smart-entry__grid">${Object.entries(TASKS).map(([k,t])=>`<button type="button" data-vx-task="${k}"><span>${t.label}</span><i aria-hidden="true">→</i></button>`).join('')}</div><div class="vx-smart-entry__guide"><span><strong>Не впевнені, який комплект потрібен?</strong><small>Врахуємо тип забруднення, плями, запах і кількість зон.</small></span><a href="/pidbir/">Пройти точний підбір за 30 секунд →</a></div></div><div class="vx-smart-taskbar" hidden><span><small>Ваша задача</small><strong></strong></span><button type="button">Змінити</button></div>`}
function clearProductMeta(grid){$$('button[data-product-code]',grid).forEach(b=>{b.hidden=false;b.style.removeProperty('order');delete b.dataset.vxSmartBadge;delete b.dataset.vxSmartNote;b.classList.remove('vx-smart-primary')})}
function setTask(task,{silent=false}={}){
  const cfg=TASKS[task],section=$('#booking-products'),grid=section?.querySelector('.booking-products');if(!cfg||!section||!grid)return;
  section.dataset.vxSmartTask=task;
  const entry=$('[data-vx-smart-entry]',section),bar=$('.vx-smart-taskbar',section),heading=$('.booking-step-heading h2',section),copy=$('.booking-step-heading p',section);
  const stepHeading=$('.booking-step-heading',section);if(stepHeading)stepHeading.hidden=false;
  if(entry)entry.hidden=true;if(bar){bar.hidden=false;$('strong',bar).textContent=cfg.label}
  clearProductMeta(grid);grid.classList.add('vx-smart-products-visible');
  if(cfg.codes){
    const ranks=new Map(cfg.codes.map((code,i)=>[code,i]));
    $$('button[data-product-code]',grid).forEach(b=>{
      const code=b.dataset.productCode;b.hidden=!ranks.has(code);if(ranks.has(code))b.style.order=String(ranks.get(code));
      if(cfg.badges?.[code])b.dataset.vxSmartBadge=cfg.badges[code];if(cfg.notes?.[code])b.dataset.vxSmartNote=cfg.notes[code];if(code===cfg.primary)b.classList.add('vx-smart-primary');
    });
  }
  if(heading)heading.textContent=cfg.title;if(copy)copy.textContent=cfg.copy;
  if(!silent){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'booking_task_selected',booking_task:task});save()}
}
function resetTask(){
  const section=$('#booking-products'),grid=section?.querySelector('.booking-products');if(!section||!grid)return;
  delete section.dataset.vxSmartTask;clearProductMeta(grid);grid.classList.remove('vx-smart-products-visible');
  $('[data-vx-smart-entry]',section)?.removeAttribute('hidden');const bar=$('.vx-smart-taskbar',section);if(bar)bar.hidden=true;
  const stepHeading=$('.booking-step-heading',section);if(stepHeading)stepHeading.hidden=true;
  save();
}
function enhanceSmartEntry(){
  const section=$('#booking-products'),grid=section?.querySelector('.booking-products');if(!section||!grid||section.dataset.vxSmartBound)return;
  section.dataset.vxSmartBound='1';
  const pref=selectedProduct();
  if(!pref&&!hasExternalPreset()){
    section.querySelector('.booking-step-heading')?.insertAdjacentHTML('afterend',smartHtml());
    const stepHeading=section.querySelector('.booking-step-heading');if(stepHeading)stepHeading.hidden=true;
    grid.classList.add('vx-smart-products');
    $$('[data-vx-task]',section).forEach(b=>b.addEventListener('click',()=>setTask(b.dataset.vxTask)));
    $('.vx-smart-taskbar button',section)?.addEventListener('click',resetTask);
  }else grid.classList.add('vx-smart-products-visible');
  window.__VAC_SMART_BOOKING_SET_TASK__=setTask;
}
function collapsePromo(){
  const field=$('.booking-promo-field');if(!field||field.dataset.vxPromoCollapsed)return;
  field.dataset.vxPromoCollapsed='1';
  const input=$('input',field);if(!input)return;
  const toggle=document.createElement('button');toggle.type='button';toggle.className='vx-promo-toggle';toggle.innerHTML='<span class="vx-promo-toggle__icon" aria-hidden="true">%</span><span class="vx-promo-toggle__copy"><b>Є промокод?</b><small>Введіть код — перевіримо знижку автоматично</small></span><span class="vx-promo-toggle__action">Додати <i aria-hidden="true">+</i></span>';toggle.setAttribute('aria-label','Відкрити поле промокоду');toggle.setAttribute('aria-expanded',input.value?'true':'false');
  const wrap=document.createElement('div');wrap.className='vx-promo-body';
  [...field.childNodes].filter(n=>n!==toggle).forEach(n=>wrap.appendChild(n));field.append(toggle,wrap);
  const sync=()=>{const open=toggle.getAttribute('aria-expanded')==='true'||Boolean(input.value)||Boolean(input.dataset.autoSmsPromo);field.classList.toggle('is-open',open);wrap.hidden=!open;toggle.setAttribute('aria-label',open?'Сховати поле промокоду':'Відкрити поле промокоду');const action=toggle.querySelector('.vx-promo-toggle__action');if(action)action.innerHTML=open?'Сховати <i aria-hidden="true">×</i>':'Додати <i aria-hidden="true">+</i>'};
  toggle.addEventListener('click',()=>{toggle.setAttribute('aria-expanded',toggle.getAttribute('aria-expanded')==='true'?'false':'true');sync();if(!wrap.hidden)input.focus()});input.addEventListener('input',sync);sync();
}
function polishSummary(){
  const total=$('.booking-summary-total span');if(total&&total.textContent.trim()!=='Вартість бронювання')total.textContent='Вартість бронювання';
  const mobile=$('.booking-mobile-summary span');if(mobile&&mobile.textContent.trim()==='Орієнтовно')mobile.textContent='Вартість';
}
function setStep(index,{history:historyMode='none'}={}){
  const form=$('.booking-form');if(!form||!matchMedia('(max-width:620px)').matches)return;
  const steps=['booking-products','booking-dates','booking-extras','booking-contact'].map(id=>$('#'+id)).filter(Boolean),buttons=$$('.booking-progress button',form);if(steps.length!==4)return;
  const next=Math.max(0,Math.min(3,Number(index)||0));form.dataset.vxActiveStep=String(next);
  steps.forEach((s,i)=>{s.classList.toggle('is-vx-active',i===next);s.setAttribute('aria-hidden',i===next?'false':'true')});buttons.forEach((b,i)=>{b.classList.toggle('is-vx-active',i===next);if(i===next)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  const state={...(window.history.state||{}),vacBookingStep:next};if(historyMode==='push'&&window.history.state?.vacBookingStep!==next)window.history.pushState(state,'',location.href);else if(historyMode==='replace')window.history.replaceState(state,'',location.href);
}
function bindHistory(){
  const form=$('.booking-form');if(!form||form.dataset.vxHistoryBound)return;form.dataset.vxHistoryBound='1';
  window.__VAC_BOOKING_SET_STEP__=setStep;
  if(matchMedia('(max-width:620px)').matches)history.replaceState({...history.state,vacBookingStep:Number(form.dataset.vxActiveStep||0)},'',location.href);
  document.addEventListener('click',e=>{
    if(!matchMedia('(max-width:620px)').matches)return;
    const p=e.target.closest('.booking-progress button');if(p){const i=$$('.booking-progress button',form).indexOf(p);if(i>=0)setTimeout(()=>{if(Number(form.dataset.vxActiveStep)===i)history.pushState({...history.state,vacBookingStep:i},'',location.href)},0);return}
    const b=e.target.closest('.booking-mobile-summary button');if(b&&b.type!=='submit')setTimeout(()=>{const i=Number(form.dataset.vxActiveStep||0);if(history.state?.vacBookingStep!==i)history.pushState({...history.state,vacBookingStep:i},'',location.href)},0);
  },true);
  addEventListener('popstate',e=>{if(e.state&&Number.isInteger(e.state.vacBookingStep))setStep(e.state.vacBookingStep)});
}
function enhance(){enhanceSmartEntry();collapsePromo();polishSummary();bindPersistence();bindHistory()}
const start=()=>{enhance();setTimeout(()=>{enhance();restore()},420);new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
