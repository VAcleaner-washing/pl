/* An opt-in presentation layer. It delegates every business action to the existing UI. */
(()=>{'use strict';
if(document.documentElement.dataset.adminLab!=='synthetic')return;
const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
const el=(tag,className,value)=>{const node=document.createElement(tag);node.className=className;if(value)node.textContent=value;return node};
const banner=el('aside','lab-banner');banner.setAttribute('aria-label','Тестове середовище');
banner.innerHTML='<div><b>LAB</b><span>Тестові дані · лише цей пристрій</span></div><button type="button" id="labTools" aria-expanded="false" aria-controls="labToolsPanel">Керування</button><a data-lab-stable href="https://vacleaner.pp.ua/admin/bronuvannia/" target="_blank" rel="noopener noreferrer">Робоча 46 ↗</a>';
document.body.append(banner);
const panel=el('section','lab-tools');panel.id='labToolsPanel';panel.hidden=true;
panel.innerHTML='<h2>Пісочниця VAcleaner</h2><p>Це синтетичні записи. Не вводьте реальні дані клієнтів чи документи. Наявність техніки й доставки тут демонстраційна; SMS, push, реферальні транзакції та зовнішні контакти заблоковані.</p><label><input type="checkbox" id="labReadError"> Помилка читання API</label><label><input type="checkbox" id="labWriteError"> Помилка збереження API</label><label>Затримка відповіді <select id="labDelay"><option value="0">Без затримки</option><option value="800">800 мс</option><option value="2500">2,5 с</option></select></label><div class="lab-tool-actions"><button type="button" id="labExport">Експорт тестових даних</button><button type="button" id="labReset">Скинути пісочницю</button></div><p>Скидання видалить лише тестові зміни в цьому браузері. Робоча версія й production-база залишаться без змін.</p>';
document.body.append(panel);
const tools=banner.querySelector('button');tools.onclick=()=>{panel.hidden=!panel.hidden;tools.setAttribute('aria-expanded',String(!panel.hidden))};
panel.querySelector('#labReadError').onchange=e=>{window.VA_LAB.faults.read=e.target.checked;document.dispatchEvent(new Event('vacleaner:lab-conditions'))};
panel.querySelector('#labWriteError').onchange=e=>{window.VA_LAB.faults.write=e.target.checked;document.dispatchEvent(new Event('vacleaner:lab-conditions'))};
panel.querySelector('#labDelay').onchange=e=>window.VA_LAB.faults.delay=Number(e.target.value);
panel.querySelector('#labReset').onclick=()=>{if(confirm('Видалити всі тестові зміни лише в цій пісочниці й повернути початкові демодані?'))window.VA_LAB.reset()};
panel.querySelector('#labExport').onclick=()=>{const url=URL.createObjectURL(new Blob([window.VA_LAB.export()],{type:'application/json'})),a=el('a','');a.href=url;a.download='VAcleaner-LAB-test-data.json';a.dataset.labDownload='';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
let compact=localStorage.getItem('vacleaner_lab_compact')!=='0';
function listUI(){
 const list=document.querySelector('#view .booking-list');if(!list)return;
 list.classList.toggle('lab-compact',compact);list.classList.remove('compact');
 if(!document.querySelector('#labListMode')){
  const toggle=el('div','lab-list-mode');toggle.id='labListMode';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Вигляд списку бронювань');
  for(const [value,label] of [[true,'Стисло'],[false,'Повністю']]){
   const button=el('button','',label);button.type='button';button.dataset.compact=String(value);
   button.onclick=()=>{compact=value;localStorage.setItem('vacleaner_lab_compact',value?'1':'0');listUI()};toggle.append(button);
  }list.before(toggle);
 }
 document.querySelectorAll('#labListMode button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.compact===String(compact))));
 list.querySelectorAll('.booking-card:not([data-lab-card])').forEach(card=>{
  card.dataset.labCard='';
  const summary=el('div','lab-booking-summary'),name=el('strong','lab-booking-client',text(card.querySelector('.booking-person strong')).replace(/›$/,''));
  const period=el('div','lab-booking-period',text(card.querySelector('.booking-time strong')));
  const money=el('div','lab-booking-money');
  for(const selector of ['.booking-finance-received-summary','.booking-finance>em','.booking-deposit-state']){
   const source=card.querySelector(selector);if(!source)continue;const value=selector.includes('received')?'Отримано '+text(source.querySelector('strong')):selector.includes('deposit')?'Залог '+text(source.querySelector('strong'))+' '+text(source.querySelector('small')):[...source.children].map(text).join(' · ');money.append(el('span',selector.includes('>em')?'lab-balance':'',value));
  }
  const delivery=el('span','lab-booking-delivery',text(card.querySelector('.booking-delivery-head strong'))),timing=card.querySelector('.schedule-badge');summary.append(name,period,delivery);
  if(text(timing))summary.append(el('span','lab-booking-timing'+(timing.classList.contains('danger')?' danger':''),text(timing)));
  summary.append(money);card.querySelector('.booking-row-head').after(summary);
  const open=el('button','btn lab-open-detail','Деталі');open.type='button';open.setAttribute('aria-label',`Деталі ${text(card.querySelector('.booking-identity small'))} · ${name.textContent}`);
  open.onclick=e=>{e.stopPropagation();card.querySelector('.booking-row-head').click()};
  const actions=card.querySelector('.booking-actions'),more=actions.querySelector('.booking-action-more');
  actions.insertBefore(open,more);
  const moreIcon=more?.querySelector('summary>span');if(moreIcon)moreIcon.textContent='⋯';
 });
}
function detailUI(){
 const detail=document.querySelector('#layer .detail');if(!detail)return;
 const actions=detail.querySelector('.detail-actions'),primary=actions?.querySelector('.primary-action');
 if(primary&&!detail.querySelector('.lab-action-dock')){
  const dock=el('div','lab-action-dock'),label=el('span','',text(detail.querySelector('.detail-top-meta span'))),button=el('button','btn primary',text(primary));button.type='button';button.onclick=()=>primary.click();dock.append(label,button);detail.append(dock);primary.classList.add('lab-original-primary');
 }
 // Existing renderers create this card asynchronously; process it once when ready.
 const finance=detail.querySelector('.v4321-finance-card');
 if(finance&&!finance.dataset.labFinance){
  finance.dataset.labFinance='1';
  const disclosure=el('details','lab-ledger'),summary=el('summary','', 'Склад розрахунку');disclosure.append(summary);
  for(const group of finance.querySelectorAll(':scope > .v4321-finance-group'))disclosure.append(group);
  finance.append(disclosure);
 }
}
let timeUIState=null;
const periodOf=time=>{const hour=Number(String(time).slice(0,2));return hour<12?'morning':hour<17?'day':'evening'};
function timeUI(){
 const overlay=document.querySelector('.admin-v4315-time-overlay');if(!overlay)return;
 const grid=overlay.querySelector('.admin-v4315-time-grid');if(!grid)return;
 if(!timeUIState){
  const periods=el('div','lab-time-periods');periods.setAttribute('role','group');periods.setAttribute('aria-label','Період дня');
  const scroll=overlay.querySelector('.admin-v4315-time-scroll'),heading=overlay.querySelector('.admin-v4315-time-sheet-head strong'),caption=el('small','');
  const headingGroup=el('div','lab-time-heading');heading.before(headingGroup);headingGroup.append(heading,caption);
  for(const [value,label] of [['morning','Ранок'],['day','День'],['evening','Вечір']]){
   const button=el('button','',label);button.type='button';button.dataset.timePeriod=value;
   button.onclick=()=>{showTimePeriod(value);scroll.scrollTop=0};periods.append(button);
  }
  scroll.before(periods);grid.setAttribute('role','group');
  timeUIState={overlay,grid,periods,caption,first:null};
  observer.observe(overlay,{attributes:true,attributeFilter:['class']});observer.observe(grid,{childList:true});
  overlay.addEventListener('click',event=>{
   if(!event.target.closest('.admin-v4315-time-close,[data-time-sheet-close]'))return;
   const trigger=document.querySelector('.admin-v4315-time-trigger[aria-expanded="true"]');
   queueMicrotask(()=>{if(!overlay.classList.contains('is-open')&&trigger?.isConnected)trigger.focus({preventScroll:true})});
  },true);
 }
 if(!overlay.classList.contains('is-open')||timeUIState.first===grid.firstElementChild)return;
 timeUIState.first=grid.firstElementChild;
 const selected=grid.querySelector('.is-selected'),current=selected?.dataset.time||'';
 timeUIState.caption.textContent=current?'Обрано '+current:'';
 grid.setAttribute('aria-label',overlay.querySelector('.admin-v4315-time-sheet-head strong').textContent);
 showTimePeriod(periodOf(current));
}
function showTimePeriod(period){
 const {grid,periods}=timeUIState;
 for(const button of periods.children)button.setAttribute('aria-pressed',String(button.dataset.timePeriod===period));
 for(const option of grid.children)option.hidden=!option.classList.contains('admin-v4315-current-off-grid')&&periodOf(option.dataset.time)!==period;
}
document.addEventListener('keydown',event=>{
 const overlay=timeUIState?.overlay;if(!overlay?.classList.contains('is-open'))return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();overlay.querySelector('.admin-v4315-time-close').click();return}
 if(event.key!=='Tab')return;
 event.stopImmediatePropagation();
 const controls=[...overlay.querySelectorAll('button:not(:disabled)')].filter(button=>!button.hidden&&button.getClientRects().length);
 const first=controls[0],last=controls.at(-1);if(!first)return;
 if(event.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){event.preventDefault();first.focus()}
},true);
// One scheduled pass per DOM batch. Existing listeners, status guards and saves stay owned
// by the canonical application. No timers, network polling or duplicate business handlers.
let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;listUI();detailUI()})};
const observer=new MutationObserver(()=>{timeUI();schedule()});
observer.observe(document.querySelector('#adminMount'),{childList:true,subtree:true});
observer.observe(document.querySelector('#layer'),{childList:true,subtree:true});
observer.observe(document.body,{childList:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;tools.setAttribute('aria-expanded','false');tools.focus()}});
schedule();
})();
