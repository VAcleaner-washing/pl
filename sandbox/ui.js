/* An opt-in presentation layer. It delegates every business action to the existing UI. */
(()=>{'use strict';
if(!['synthetic','staging'].includes(document.documentElement.dataset.adminLab))return;
const hosted=document.documentElement.dataset.adminLab==='staging';
const layoutMedia=hosted?matchMedia('(max-width:900px)'):null;
const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
const el=(tag,className,value)=>{const node=document.createElement(tag);node.className=className;if(value)node.textContent=value;return node};
const banner=el('aside','lab-banner');banner.setAttribute('aria-label','Тестове середовище');
banner.innerHTML='<div><b>LAB</b><span>Тестові дані · лише цей пристрій</span></div><button type="button" id="labTools" aria-expanded="false" aria-controls="labToolsPanel">Керування</button><a data-lab-stable href="https://vacleaner.pp.ua/admin/bronuvannia/" target="_blank" rel="noopener noreferrer">Робоча 46 ↗</a>';
if(hosted)banner.innerHTML='<div><b>R4</b><span role="status">Перевіряємо тестовий доступ…</span></div><button type="button" id="labTools" aria-expanded="false" aria-controls="labToolsPanel">Про R4</button><a data-stage-stable href="https://vacleaner.pp.ua/admin/bronuvannia/" target="_blank" rel="noopener noreferrer">Робоча 46 ↗</a>';
document.body.append(banner);
const panel=el('section','lab-tools');panel.id='labToolsPanel';panel.hidden=true;
panel.innerHTML='<h2>Пісочниця VAcleaner</h2><p>Це синтетичні записи. Не вводьте реальні дані клієнтів чи документи. Наявність техніки й доставки тут демонстраційна; SMS, push, реферальні транзакції та зовнішні контакти заблоковані.</p><label><input type="checkbox" id="labReadError"> Помилка читання API</label><label><input type="checkbox" id="labWriteError"> Помилка збереження API</label><label>Затримка відповіді <select id="labDelay"><option value="0">Без затримки</option><option value="800">800 мс</option><option value="2500">2,5 с</option></select></label><div class="lab-tool-actions"><button type="button" id="labExport">Експорт тестових даних</button><button type="button" id="labReset">Скинути пісочницю</button></div><p>Скидання видалить лише тестові зміни в цьому браузері. Робоча версія й production-база залишаться без змін.</p>';
if(hosted){
 panel.innerHTML='<h2>R4 · тестова база</h2><p>Зміни зберігаються на окремому сервері та видимі іншому тестовому менеджеру. Використовуйте тільки вигадані контакти й тестові зображення. Робочі клієнти та фінанси залишаються у версії 46.</p><p>SMS, push, зовнішні повідомлення та адресні інтеграції вимкнені. Недоступна дія показує помилку; успішне надсилання не симулюється.</p><p>Для входу потрібні manager-a або manager-b та окремий тестовий пароль. Пароль робочої версії не підходить.</p><a data-stage-demo href="/admin/bronuvannia/">Відкрити попередній LAB із локальними демоданими</a>';
 const readinessStatus=ready=>{banner.querySelector('[role="status"]').textContent=ready?'Тестові дані · сервер':'Тестовий вхід закрито';if(!ready){panel.hidden=false;banner.querySelector('#labTools').setAttribute('aria-expanded','true')}};
 window.addEventListener('vacleaner:stage-readiness',event=>readinessStatus(event.detail?.ready===true));
 window.VA_STAGE.readiness.then(()=>readinessStatus(true),()=>readinessStatus(false));
}
document.body.append(panel);
const tools=banner.querySelector('button');tools.onclick=()=>{panel.hidden=!panel.hidden;tools.setAttribute('aria-expanded',String(!panel.hidden))};
if(!hosted){
panel.querySelector('#labReadError').onchange=e=>{window.VA_LAB.faults.read=e.target.checked;document.dispatchEvent(new Event('vacleaner:lab-conditions'))};
panel.querySelector('#labWriteError').onchange=e=>{window.VA_LAB.faults.write=e.target.checked;document.dispatchEvent(new Event('vacleaner:lab-conditions'))};
panel.querySelector('#labDelay').onchange=e=>window.VA_LAB.faults.delay=Number(e.target.value);
panel.querySelector('#labReset').onclick=()=>{if(confirm('Видалити всі тестові зміни лише в цій пісочниці й повернути початкові демодані?'))window.VA_LAB.reset()};
panel.querySelector('#labExport').onclick=()=>{const url=URL.createObjectURL(new Blob([window.VA_LAB.export()],{type:'application/json'})),a=el('a','');a.href=url;a.download='VAcleaner-LAB-test-data.json';a.dataset.labDownload='';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
}
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
  const service=card.querySelector('.booking-finance-expenses');
  if(service){
   const row=el('div','lab-money-row lab-service-total');
   row.append(el('span','',text(service.querySelector('span'))),el('strong','',text(service.querySelector('b'))));
   money.append(row);
  }
  for(const [selector,className] of [['.booking-finance-received-summary','lab-received-total'],['.booking-deposit-state','lab-deposit-total'],['.booking-finance>em','lab-balance']]){
   const source=card.querySelector(selector);if(!source)continue;
   const row=el('div','lab-money-row '+className),label=className==='lab-deposit-total'?'Застава '+text(source.querySelector('small')):text(source.querySelector('span'));
   row.append(el('span','',label),el('strong','',text(source.querySelector('strong'))));money.append(row);
  }
  const delivery=el('span','lab-booking-delivery',text(card.querySelector('.booking-delivery-head strong'))),timing=card.querySelector('.schedule-badge');summary.append(name,period,delivery);
  if(text(timing))summary.append(el('span','lab-booking-timing'+(timing.classList.contains('danger')?' danger':''),text(timing)));
  summary.append(money);card.querySelector('.booking-row-head').after(summary);
  const open=el('button','btn lab-open-detail','Деталі');open.type='button';open.setAttribute('aria-label',`Деталі ${text(card.querySelector('.booking-identity small'))} · ${name.textContent}`);
  open.onclick=e=>{e.stopPropagation();card.querySelector('.booking-row-head').click()};
  const actions=card.querySelector('.booking-actions'),more=actions.querySelector('.booking-action-more');
  actions.insertBefore(open,more);
  const moreIcon=more?.querySelector('summary>span');if(moreIcon)moreIcon.textContent='⋯';
  if(hosted){
   actions.dataset.stageSecondary=String([...actions.children].filter(node=>node.matches('.btn:not(.primary-action):not(.lab-open-detail)')).length);
   actions.dataset.stageMore=String(Boolean(more));
  }
 });
}
function detailUI(){
 const detail=document.querySelector('#layer .detail');if(!detail)return;
 const actions=detail.querySelector('.detail-actions'),primary=actions?.querySelector('.primary-action');
 if(primary&&!detail.querySelector('.lab-action-dock')){
  const dock=el('div','lab-action-dock'),label=el('span','',text(detail.querySelector('.detail-top-meta span'))),button=el('button','btn primary',text(primary));button.type='button';button.onclick=()=>primary.click();dock.append(label,button);detail.append(dock);primary.classList.add('lab-original-primary');
 }
 const dockButton=detail.querySelector('.lab-action-dock button');
 if(primary&&dockButton){const disabled=primary.disabled||detail.dataset.liveDetailStale==='true';if(dockButton.disabled!==disabled)dockButton.disabled=disabled}
 // R4 uses real layout rows: keep the original header node/listeners, and
 // let only the content shell scroll between the header and delegated action.
 if(hosted){
  const shell=detail.querySelector(':scope>.detail-shell'),head=detail.querySelector('.detail-top');
  if(shell&&head&&detail.querySelector(':scope>.lab-action-dock')){
   const mobile=layoutMedia.matches;
   if(mobile&&head.parentElement===shell)detail.insertBefore(head,shell);
   else if(!mobile&&head.parentElement===detail)shell.prepend(head);
   detail.classList.toggle('stage-detail-layout',mobile);
  }
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
// UX-01: project canonical report nodes; calculations and actions keep their owners.
const dashboardDisclosureState=new Map();
let dashboardPeriodFocus=null;
function dashboardRemember(root){if(root.nodeType!==1)return;for(const item of root.querySelectorAll('.ux01-detail[data-disclosure-key]'))dashboardDisclosureState.set(item.dataset.disclosureKey,item.open)}
const dashboardIcons={
 profit:'<path d="M5 9c0-2 14-2 14 0s-14 2-14 0v10c0 2 14 2 14 0V9M5 14c0 2 14 2 14 0M5 18c0 2 14 2 14 0"/>',
 revenue:'<path d="M4 20V12h4v8M10 20V7h4v13M16 20V3h4v17"/>',
 expense:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M6 15h4"/>',
 completed:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16m-9 5 2 2 4-4"/>',
 utilization:'<path d="M12 3v9h9A9 9 0 0 0 12 3Z"/><path d="M8 5a8 8 0 1 0 11 11L8 13Z"/>',
 ledger:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
 investment:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
 delivery:'<path d="M3 7h12v12H3zM15 11h4l3 4v4h-7M6 19a2 2 0 1 0 4 0m7 0a2 2 0 1 0 4 0"/>'
};
function dashboardIcon(kind){const node=el('span','ux01-icon');node.setAttribute('aria-hidden','true');node.innerHTML=`<svg viewBox="0 0 24 24" focusable="false">${dashboardIcons[kind]||dashboardIcons.ledger}</svg>`;return node}
function dashboardDisclosure(surface,view,index,kind){
 const details=el('details','ux01-detail'),summary=el('summary','ux01-detail-title'),heading=surface.querySelector('h3'),key=view+':'+text(heading);
 details.dataset.disclosureKey=key;
 const caption=el('span','ux01-detail-caption');if(heading)caption.append(heading);
 const chevron=el('span','ux01-chevron','›');chevron.setAttribute('aria-hidden','true');
 summary.append(dashboardIcon(kind),caption,chevron);details.append(summary,surface);
 details.open=dashboardDisclosureState.has(key)?dashboardDisclosureState.get(key):(innerWidth>900&&view==='finances'&&index<2);
 details.addEventListener('toggle',()=>{if(details.isConnected)dashboardDisclosureState.set(key,details.open)});return details;
}
function dashboardPeriods(control){
 const chips=control.querySelector('.admin-periods');if(!chips)return;
 const row=el('div','ux01-period-row'),select=el('select','ux01-period-select');select.id='dashboardPeriod';select.setAttribute('aria-label','Період звіту');
 const labels={'7':'Останні 7 днів','30':'Останні 30 днів',month:'Місяць',year:'Рік',all:'Увесь час'};
 for(const button of chips.querySelectorAll('[data-analytics-period]')){const option=el('option','',labels[button.dataset.analyticsPeriod]||text(button));option.value=button.dataset.analyticsPeriod;option.selected=button.classList.contains('active');select.append(option)}
 select.addEventListener('change',()=>{const button=[...chips.querySelectorAll('[data-analytics-period]')].find(node=>node.dataset.analyticsPeriod===select.value);if(button&&!button.disabled){dashboardPeriodFocus=document.activeElement===select?document.documentElement.dataset.adminView:null;button.click()}});
 const chevron=el('span','ux01-period-chevron','⌄');chevron.setAttribute('aria-hidden','true');row.append(dashboardIcon('completed'),select,chevron);chips.hidden=true;control.prepend(row);control.classList.add('ux01-period-controls');
}
function dashboardExpenseAction(view,root){
 let proxy=document.querySelector('#dashboardAddExpense');
 const native=view==='finances'?root?.querySelector('#addExpense'):null;if(!native){proxy?.remove();return}
 const header=document.querySelector('.page-head');if(!native||!header)return;
 if(!proxy){proxy=el('button','btn primary ux01-page-action','＋ Витрата');proxy.id='dashboardAddExpense';proxy.type='button';proxy.setAttribute('aria-label','Додати витрату');proxy.onclick=()=>{const button=document.querySelector('#view #addExpense');if(button&&!button.disabled)button.click()};header.append(proxy)}
 if(proxy.disabled!==native.disabled)proxy.disabled=native.disabled;
}
function dashboardUI(){
 const view=document.documentElement.dataset.adminView,root=document.querySelector('#view');dashboardExpenseAction(view,root);
 if(!root||!['analytics','finances'].includes(view)){dashboardPeriodFocus=null;if(document.documentElement.hasAttribute('data-ux01-ready'))document.documentElement.removeAttribute('data-ux01-ready');return}
 if(root.querySelector(':scope>.ux01-dashboard'))return;
 const cards=[...root.querySelectorAll(view==='analytics'?'.analytics-kpis>.kpi':'.finance-kpis>.kpi')];
 const toolbar=root.querySelector(view==='analytics'?'.analytics-toolbar':'.finance-toolbar'),control=root.querySelector(view==='analytics'?'.analytics-period-controls':'.finance-period-row>.analytics-period-controls'),trend=root.querySelector('.analytics-trend-chart')?.closest('article');
 if(cards.length!==4||!toolbar||!control||(view==='analytics'&&!trend)){if(document.documentElement.hasAttribute('data-ux01-ready'))document.documentElement.removeAttribute('data-ux01-ready');return}
 const workspace=el('div','ux01-dashboard'),notes=el('details','ux01-notes'),noteTitle=el('summary','',view==='analytics'?'Як рахуються показники':'Дати та правила обліку');notes.append(noteTitle);
 const intro=toolbar.querySelector('p');if(intro)notes.append(intro);if(view==='finances')control.classList.add('finance-period-row');dashboardPeriods(control);workspace.append(control);
 if(view==='analytics'){
  // Keep the canonical .analytics-kpis descendant order for asynchronous decorators.
  const report=el('div','analytics-kpis ux01-analytics-report'),hero=cards[3],[revenue,average,utilization]=cards;
  hero.classList.add('ux01-profit-hero');hero.prepend(dashboardIcon('profit'));
  for(const [card,kind] of [[revenue,'revenue'],[utilization,'utilization']]){card.classList.add('ux01-mini-kpi');card.prepend(dashboardIcon(kind))}
  const operating=root.querySelector('[data-analytics-operating-amount]'),count=revenue.querySelector('[data-analytics-completed-count]');
  if(!operating||!count)return;
  const expense=el('article','ux01-mini-kpi ux01-projected-expense'),completed=el('article','ux01-mini-kpi ux01-projected-completed');
  expense.append(dashboardIcon('expense'),el('span','', 'Операційні витрати'),el('strong','',operating.textContent));
  completed.append(dashboardIcon('completed'),el('span','', 'Завершені оренди'),el('strong','',text(count)));
  average.classList.add('ux01-average-kpi');
  for(const card of [revenue,average,utilization]){const context=el('div','ux01-metric-context');context.append(el('b','',text(card.querySelector('span:not(.ux01-icon)'))));for(const detail of card.querySelectorAll(':scope>small'))context.append(detail);notes.append(context)}
  const canonical=el('div','ux01-canonical-metrics ux01-kpi-grid');
  canonical.append(revenue,average,utilization,hero,expense,completed);report.append(canonical);
  trend.classList.add('ux01-trend');const graphHeading=trend.querySelector('h3'),graphLabel=trend.querySelector('[role="img"]')?.getAttribute('aria-label');if(graphHeading&&graphLabel)graphHeading.textContent=graphLabel;
  const explanation=trend.querySelector('.analytics-trend-head p');if(explanation)notes.append(explanation);
  const panels=[...root.querySelectorAll('.analytics-decision-grid > article')].filter(surface=>surface!==trend),details=el('div','analytics-grid analytics-decision-grid ux01-analytics-details');
  panels.forEach((surface,index)=>details.append(dashboardDisclosure(surface,view,index,'revenue')));
  workspace.append(report,trend,notes,details);
 }else{
  const [revenue,cost,profit,margin]=cards,summary=el('section','finance-kpis ux01-finance-summary'),primary=el('div','ux01-finance-primary'),components=el('div','ux01-finance-components');summary.setAttribute('aria-label','Фінансовий результат');
  profit.classList.add('ux01-finance-profit');profit.prepend(dashboardIcon('profit'));margin.classList.add('ux01-finance-margin');
  const warning=profit.querySelector('small'),equation=profit.querySelector('small:last-child');warning?.classList.add('ux01-finance-warning');equation?.classList.add('ux01-equation');
  primary.append(profit,margin);for(const [card,kind] of [[revenue,'profit'],[cost,'expense']]){card.prepend(dashboardIcon(kind));components.append(card)}
  summary.append(primary,components);if(warning)summary.append(warning);if(equation)summary.append(equation);
  for(const card of [revenue,cost,margin]){const context=el('div','ux01-metric-context');context.append(el('b','',text(card.querySelector('span:not(.ux01-icon)'))));for(const detail of card.querySelectorAll(':scope>small'))context.append(detail);notes.append(context)}
  const shown=text(margin.querySelector('strong')),percent=/^\d+(?:[.,]\d+)?%$/.test(shown)?Number(shown.slice(0,-1).replace(',','.')):NaN;
  if(Number.isFinite(percent)&&percent>=0&&percent<=100){const meter=el('div','ux01-margin-meter'),bar=el('i','');meter.setAttribute('aria-hidden','true');bar.style.width=percent+'%';meter.append(bar);primary.after(meter)}
  const panels=[root.querySelector('.finance-ledger'),root.querySelector('.equipment-payback-card'),root.querySelector('.delivery-map-card'),root.querySelector('.finance-breakdown'),root.querySelector('.finance-method')].filter(Boolean),details=el('div','ux01-finance-details');
  panels.forEach((surface,index)=>details.append(dashboardDisclosure(surface,view,index,['ledger','revenue','delivery','expense','investment'][index])));
  const native=el('div','ux01-native-actions');native.hidden=true;native.append(toolbar);
  workspace.append(summary,details,notes,native);
 }
 root.replaceChildren(workspace);document.documentElement.setAttribute('data-ux01-ready','true');dashboardExpenseAction(view,root);
 if(dashboardPeriodFocus===view){dashboardPeriodFocus=null;workspace.querySelector('#dashboardPeriod')?.focus({preventScroll:true})}
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
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;listUI();detailUI();dashboardUI()})};
if(hosted){
 // Retain the MediaQueryList and also observe viewport resize. WebKit can
 // deliver the breakpoint update later than its first responsive style pass.
 layoutMedia.addEventListener('change',schedule);
 window.addEventListener('resize',schedule,{passive:true});
}
const observer=new MutationObserver(records=>{for(const record of records)for(const removed of record.removedNodes)dashboardRemember(removed);timeUI();schedule()});
observer.observe(document.querySelector('#adminMount'),{childList:true,subtree:true});
observer.observe(document.querySelector('#layer'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
observer.observe(document.body,{childList:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;tools.setAttribute('aria-expanded','false');tools.focus()}});
schedule();
})();
