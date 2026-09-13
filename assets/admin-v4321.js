(()=>{'use strict';
const mobile=()=>window.matchMedia('(max-width: 900px)').matches;
const clean=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
const icon=name=>({
  coins:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="6" rx="5" ry="2.5"/><path d="M4 6v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6M4 10v4c0 1.4 2.2 2.5 5 2.5 1.1 0 2.1-.2 2.9-.5"/><path d="M12 12c.8-.7 2.3-1.2 4-1.2 2.8 0 5 1.1 5 2.5s-2.2 2.5-5 2.5-5-1.1-5-2.5c0-.5.3-.9 1-1.3Z"/><path d="M11 13.3v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"/></svg>',
  down:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.5 13.5 12 17l3.5-3.5"/></svg>',
  up:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 17V7m-3.5 3.5L12 7l3.5 3.5"/></svg>',
  return:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7H3V3"/><path d="M3.5 7.5A9 9 0 1 1 4 17"/></svg>',
  history:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h7M9 16h7"/></svg>',
  calculator:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 6h8v4H8zM8 14h2M14 14h2M8 18h2M14 18h2"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>'
}[name]||'');
function rowLabel(row){
  const span=row?.querySelector(':scope > span');
  if(!span)return'';
  const copy=span.cloneNode(true);
  copy.querySelectorAll('small').forEach(node=>node.remove());
  return clean(copy);
}
function rowMeta(row){return clean(row?.querySelector(':scope > span small'))}
function amount(row){return clean(row?.querySelector(':scope > strong'))||'0 грн'}
function findRow(rows,test){return rows.find(row=>test(rowLabel(row),row))||null}
function financeLine(label,row,{meta='',className=''}={}){
  if(!row)return'';
  const helper=meta||rowMeta(row);
  return `<div class="v4321-finance-line ${className}"><span>${escapeHtml(label)}${helper?`<small>${escapeHtml(helper)}</small>`:''}</span><b>${escapeHtml(amount(row))}</b></div>`;
}
function normalizeBalance(balance){
  const source=clean(balance?.querySelector(':scope > span'))||'Підсумок';
  const className=balance?.classList.contains('due')?'due':balance?.classList.contains('refund')?'refund':'neutral';
  let label=source;
  if(className==='refund'&&!source.toLowerCase().startsWith('повернено'))label='До повернення';
  if(className==='due'&&!source.toLowerCase().includes('отримано'))label='До доплати';
  return{className,label,amount:clean(balance?.querySelector(':scope > strong'))||'0 грн'};
}
function markInfoRows(card){
  card.querySelectorAll('.native-detail-info-row').forEach(row=>{
    const label=clean(row.querySelector(':scope > div > small'));
    const key=label==='Дата і час'?'date':label==='Фінанси'?'finance':label==='Техніка'?'equipment':label==='Додатково'?'extras':label==='Клієнт'?'client':/Доставка|Самовивіз|Видача/.test(label)?'delivery':label==='Подарунок'?'gift':label==='Примітка'?'note':'other';
    row.dataset.v4321Row=key;
    if(['equipment','extras','client','delivery'].includes(key))row.classList.add('v4321-chevron-row');
  });
}
function buildFinance(detail,nativeCard){
  if(detail.querySelector('.v4321-finance-card'))return;
  const finance=detail.querySelector('.finance-panel');
  if(!finance)return;
  const rows=[...finance.querySelectorAll(':scope > .money-row')];
  if(!rows.length)return;
  const pre=findRow(rows,label=>label.startsWith('Передоплата'));
  const dep=findRow(rows,label=>label.startsWith('Залог'));
  const received=findRow(rows,(label,row)=>row.classList.contains('received-total')||label.startsWith('Отримано разом'));
  const expenses=findRow(rows,(label,row)=>row.classList.contains('expenses-total')||label.startsWith('Разом витрати'));
  const rental=findRow(rows,label=>label.startsWith('Оренда після знижки'))||findRow(rows,label=>label==='Оренда')||findRow(rows,label=>label.startsWith('Оренда до знижки'));
  const discount=findRow(rows,(label,row)=>row.classList.contains('discount-money-row')||label.startsWith('Знижка'));
  const extra=findRow(rows,(label,row)=>row.classList.contains('finance-extra-row')||label.startsWith('Додатково'));
  const delivery=findRow(rows,label=>label==='Доставка');
  const chemistry=findRow(rows,label=>label.startsWith('Хімія'));
  const balance=normalizeBalance(finance.querySelector(':scope > .balance'));
  const totalExpenses=amount(expenses);
  const totalReceived=amount(received);
  const charges=[
    financeLine('Оренда',rental),
    financeLine('Знижка',discount,{className:'discount'}),
    financeLine('Додатково',extra),
    financeLine('Доставка',delivery),
    financeLine('Хімія',chemistry)
  ].filter(Boolean).join('');
  const card=document.createElement('section');
  card.className='v4321-finance-card';
  card.innerHTML=`
    <header class="v4321-finance-head"><span class="v4321-finance-icon">${icon('coins')}</span><h2>Фінанси</h2><div><small>Разом витрати</small><strong>${escapeHtml(totalExpenses)}</strong></div></header>
    <section class="v4321-finance-group received"><h3>Отримано від клієнта</h3>${financeLine('Передоплата',pre)}${financeLine('Залог',dep)}</section>
    <section class="v4321-finance-group charged"><h3>Нараховано</h3>${charges||'<div class="v4321-finance-empty">Нарахувань немає</div>'}</section>
    <div class="v4321-finance-summaries">
      <div class="v4321-finance-summary received"><span class="v4321-summary-icon">${icon('down')}</span><span><small>Отримано</small><strong>${escapeHtml(totalReceived)}</strong></span></div>
      <div class="v4321-finance-summary charged"><span class="v4321-summary-icon">${icon('up')}</span><span><small>Витрати</small><strong>${escapeHtml(totalExpenses)}</strong></span></div>
    </div>
    <div class="v4321-finance-balance ${balance.className}"><span class="v4321-balance-icon">${icon('return')}</span><span>${escapeHtml(balance.label)}</span><strong>${escapeHtml(balance.amount)}</strong></div>`;
  nativeCard.insertAdjacentElement('afterend',card);
}
function buildHistory(detail){
  if(detail.querySelector('.v4321-history-row'))return;
  const audit=detail.querySelector('.audit-panel');
  const finance=detail.querySelector('.v4321-finance-card');
  if(!audit||!finance)return;
  const button=document.createElement('button');
  button.type='button';
  button.className='v4321-history-row';
  button.setAttribute('aria-expanded','false');
  button.innerHTML=`<span class="v4321-history-icon">${icon('history')}</span><span>Історія бронювання</span><i aria-hidden="true">›</i>`;
  finance.insertAdjacentElement('afterend',button);
  button.addEventListener('click',()=>{
    const open=detail.classList.toggle('v4321-history-open');
    button.setAttribute('aria-expanded',String(open));
    if(open)requestAnimationFrame(()=>audit.scrollIntoView({behavior:'smooth',block:'nearest'}));
  });
}
function styleStatus(detail,nativeCard){
  const status=String(nativeCard.dataset.status||'confirmed');
  detail.dataset.v4321Status=status;
  const pill=detail.querySelector('.hero-status');
  if(!pill)return;
  const text=clean(pill).replace(/^✓\s*/,'');
  if(text&&pill.textContent!==text)pill.textContent=text;
  const palette={
    issued:['#5ce09e','rgba(92,224,158,.5)','rgba(25,119,78,.12)'],
    confirmed:['#5ce09e','rgba(92,224,158,.5)','rgba(25,119,78,.12)'],
    waiting_payment:['#efbd61','rgba(239,189,97,.5)','rgba(151,103,24,.12)'],
    pending:['#79b5ff','rgba(121,181,255,.5)','rgba(52,101,160,.12)'],
    completed:['#a8b0b4','rgba(168,176,180,.4)','rgba(94,104,109,.11)'],
    cancelled:['#ef817b','rgba(239,129,123,.48)','rgba(144,55,51,.11)']
  }[status]||['#5ce09e','rgba(92,224,158,.5)','rgba(25,119,78,.12)'];
  pill.style.setProperty('color',palette[0],'important');
  pill.style.setProperty('border-color',palette[1],'important');
  pill.style.setProperty('background',palette[2],'important');
}
function enhanceActions(detail){
  const actions=detail.querySelector('.native-detail-actions');
  if(!actions)return;
  actions.classList.add('v4321-actions');
  const narrow=window.matchMedia('(max-width: 350px)').matches;
  actions.querySelectorAll('[data-action]').forEach(button=>{
    const action=button.dataset.action||'';
    const primary=button.classList.contains('primary-action');
    button.classList.toggle('v4321-primary-action',primary);
    if((action==='finance'||action==='extend')&&!button.querySelector('.v4321-action-icon')){
      const span=document.createElement('span');
      span.className='v4321-action-icon';
      span.innerHTML=icon(action==='finance'?'calculator':'calendar');
      button.prepend(span);
    }
    if(narrow){
      button.style.setProperty('grid-column','1','important');
      button.style.setProperty('grid-row','auto','important');
    }else if(primary){
      button.style.setProperty('grid-column','1 / -1','important');
      button.style.setProperty('grid-row','1','important');
    }else if(action==='finance'){
      button.style.setProperty('grid-column','1','important');
      button.style.setProperty('grid-row','2','important');
    }else if(action==='extend'){
      button.style.setProperty('grid-column','2','important');
      button.style.setProperty('grid-row','2','important');
    }else if(action==='edit'){
      button.style.setProperty('grid-column','1 / -1','important');
      button.style.setProperty('grid-row','2','important');
    }
  });
}
function enhance(){
  if(!mobile())return;
  document.querySelectorAll('.detail').forEach(detail=>{
    const nativeCard=detail.querySelector('.native-detail-card');
    if(!nativeCard)return;
    styleStatus(detail,nativeCard);
    markInfoRows(nativeCard);
    buildFinance(detail,nativeCard);
    buildHistory(detail);
    enhanceActions(detail);
    detail.classList.add('v4321-detail-ready');
  });
}
let queued=false;
const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',queue,{passive:true});
})();