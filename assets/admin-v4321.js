(()=>{
  'use strict';

  const mobile=()=>matchMedia('(max-width:900px)').matches;
  const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
  const money=value=>{
    const digits=String(value||'').replace(/[^0-9-]/g,'');
    const parsed=Number(digits||0);
    return Number.isFinite(parsed)?parsed:0;
  };
  const format=value=>`${Math.max(0,Math.round(Number(value)||0)).toLocaleString('uk-UA')} грн`;

  function financeLineMap(row){
    const map=new Map();
    row.querySelectorAll('.native-pay-line').forEach(line=>{
      const label=text(line.querySelector('span'));
      const amount=text(line.querySelector('b'));
      if(label)map.set(label,{label,amount,value:money(amount)});
    });
    return map;
  }

  function enhanceFinance(detail){
    if(!mobile())return;
    const card=detail.querySelector('.native-detail-card');
    if(!card||card.dataset.financeV4321==='1')return;
    if(!['issued','completed'].includes(String(card.dataset.status||'')))return;

    const financeRow=[...card.querySelectorAll('.native-detail-info-row')].find(row=>text(row.querySelector(':scope > div > small'))==='Фінанси');
    if(!financeRow)return;
    const lines=financeLineMap(financeRow);
    const pre=lines.get('Передоплата');
    const dep=lines.get('Залог');
    const rental=lines.get('Оренда');
    const extra=lines.get('Додатково');
    const delivery=lines.get('Доставка');
    if(!pre||!dep||!rental)return;

    const received=(pre?.value||0)+(dep?.value||0);
    const expenses=(rental?.value||0)+(extra?.value||0)+(delivery?.value||0);
    const balance=received-expenses;
    const resultLabel=balance>=0?'До повернення':'До доплати';
    const resultClass=balance>=0?'refund':'due';

    const row=(label,item)=>`<div class="v4321-fin-line"><span>${label}</span><b>${item?.amount||'0 грн'}</b></div>`;
    const section=document.createElement('section');
    section.className='native-detail-finance-v4321';
    section.dataset.result=resultClass;
    section.innerHTML=`
      <header class="v4321-fin-head">
        <div><i aria-hidden="true">₴</i><h2>Фінанси</h2></div>
        <strong><span>Разом витрати</span><b>${format(expenses)}</b></strong>
      </header>
      <div class="v4321-fin-group received">
        <h3>Отримано від клієнта</h3>
        ${row('Передоплата',pre)}
        ${row('Залог',dep)}
      </div>
      <div class="v4321-fin-group charged">
        <h3>Нараховано</h3>
        ${row('Оренда',rental)}
        ${row('Додатково',extra)}
        ${row('Доставка',delivery)}
      </div>
      <div class="v4321-fin-summary" aria-label="Фінансовий підсумок">
        <div class="v4321-fin-tile received"><span>Отримано</span><strong>${format(received)}</strong></div>
        <div class="v4321-fin-tile expenses"><span>Витрати</span><strong>${format(expenses)}</strong></div>
        <div class="v4321-fin-result ${resultClass}"><span>${resultLabel}</span><strong>${format(Math.abs(balance))}</strong></div>
      </div>`;

    financeRow.remove();
    card.insertAdjacentElement('afterend',section);
    card.dataset.financeV4321='1';
  }

  function apply(){
    if(!mobile())return;
    document.documentElement.classList.add('v4321');
    document.querySelectorAll('.detail').forEach(enhanceFinance);
  }

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  };
  new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('resize',queue,{passive:true});
  addEventListener('DOMContentLoaded',queue,{once:true});
  queue();
})();
