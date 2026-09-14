(()=>{'use strict';
const mobile=()=>window.matchMedia('(max-width: 900px)').matches;
const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
const icon=name=>({
  dots:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.55"/><circle cx="12" cy="12" r="1.55"/><circle cx="19" cy="12" r="1.55"/></svg>',
  person:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3.2"/><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M18 10v7M14.5 13.5h7"/></svg>'
}[name]||'');
function setLeadingLabel(span,label,helper){
  if(!span)return;
  const small=span.querySelector(':scope > small');
  [...span.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
  span.insertBefore(document.createTextNode(label),small||span.firstChild);
  if(small&&helper!==undefined)small.textContent=helper;
}
function setButtonLabel(button,label){
  if(!button)return;
  [...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
  let target=button.querySelector(':scope > .v4322-action-label');
  if(!target){target=document.createElement('span');target.className='v4322-action-label';button.appendChild(target)}
  target.textContent=label;
}
function polishFinance(detail){
  const card=detail.querySelector('.v4321-finance-card');
  if(!card||card.dataset.v4322Finance==='1')return;
  card.dataset.v4322Finance='1';
  card.classList.add('v4322-finance-card');
  card.querySelector('.v4321-finance-head > div')?.remove();
  const receivedGroup=card.querySelector('.v4321-finance-group.received');
  const chargedGroup=card.querySelector('.v4321-finance-group.charged');
  if(receivedGroup){
    const heading=receivedGroup.querySelector(':scope > h3');
    if(heading)heading.textContent='Отримано';
    [...receivedGroup.querySelectorAll('.v4321-finance-line')].forEach(row=>{
      const span=row.querySelector(':scope > span');
      if(/^Залог(?:\s|$)/i.test(text(span)))setLeadingLabel(span,'Застава','повертається після розрахунку');
    });
  }
  if(chargedGroup){const heading=chargedGroup.querySelector(':scope > h3');if(heading)heading.textContent='Нараховано'}
  const summaries=[...card.querySelectorAll('.v4321-finance-summary')];
  const receivedLabel=summaries[0]?.querySelector('small');
  const chargedLabel=summaries[1]?.querySelector('small');
  if(receivedLabel)receivedLabel.textContent='Отримано';
  if(chargedLabel)chargedLabel.textContent='Нараховано';
}
function addCompletedActionIcon(button,type){
  if(!button||button.querySelector('.v4322-action-icon'))return;
  const span=document.createElement('span');
  span.className='v4322-action-icon';
  span.innerHTML=icon(type);
  button.prepend(span);
}
function polishActions(detail){
  const actions=detail.querySelector('.native-detail-actions');
  if(!actions)return;
  const finance=actions.querySelector('[data-action="finance"]');
  if(finance)setButtonLabel(finance,'Деталі розрахунку');
  const status=String(detail.dataset.v4321Status||detail.querySelector('.native-detail-card')?.dataset.status||'');
  if(status!=='completed')return;
  actions.classList.add('v4322-completed-actions');
  if(finance)finance.classList.add('v4322-details-action');
  const referral=actions.querySelector('[data-action="referral"]');
  if(referral){referral.classList.add('v4322-referral-action');addCompletedActionIcon(referral,'person')}
  const correction=actions.querySelector('[data-action="status"]');
  if(correction)correction.classList.add('v4322-hidden-status');
  if(!correction||actions.querySelector('.v4322-more-action'))return;
  const more=document.createElement('button');
  more.type='button';
  more.className='btn v4322-more-action';
  more.setAttribute('aria-label','Інші дії');
  more.innerHTML=`<span class="v4322-action-icon">${icon('dots')}</span><span class="v4322-action-label">Ще</span>`;
  more.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();correction.click()});
  actions.appendChild(more);
}
function enhance(){
  if(!mobile())return;
  document.querySelectorAll('.detail.v4321-detail-ready').forEach(detail=>{polishFinance(detail);polishActions(detail);detail.classList.add('v4322-detail-ready')});
}
let queued=false;
const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',queue,{passive:true});
})();