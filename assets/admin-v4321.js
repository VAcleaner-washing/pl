(()=>{
  'use strict';

  const mobile=()=>matchMedia('(max-width:900px)').matches;
  const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
  const amount=value=>{
    const normalized=String(value||'').replace(/\s+/g,'').replace(/[^\d,.-]/g,'').replace(',','.');
    const numeric=Number(normalized);
    return Number.isFinite(numeric)?Math.max(0,Math.round(numeric)):0;
  };
  const format=value=>`${new Intl.NumberFormat('uk-UA').format(Math.max(0,Math.round(value||0)))} грн`;
  const svgCoins=`<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="8" cy="6" rx="5" ry="2.5"/><path d="M3 6v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6"/><path d="M3 10v4c0 1.4 2.2 2.5 5 2.5 1.1 0 2.1-.2 2.9-.5"/><ellipse cx="16" cy="15" rx="5" ry="2.5"/><path d="M11 15v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"/></svg>`;

  function moneyMap(financeRow){
    const rows=[...financeRow.querySelectorAll('.native-pay-line')];
    return new Map(rows.map(row=>[text(row.querySelector('span')),amount(text(row.querySelector('b')))]));
  }

  function pick(map,pred){
    for(const [label,value] of map.entries()) if(pred(label)) return value;
    return 0;
  }

  function row(label,value){
    return `<div class="v4321-money-line"><span>${label}</span><b>${format(value)}</b></div>`;
  }

  function decorateInfoRows(card){
    card.querySelectorAll('.native-detail-info-row').forEach(item=>{
      const label=text(item.querySelector(':scope>div>small'));
      item.classList.toggle('v4321-client-row',label==='Клієнт');
      item.classList.toggle('v4321-delivery-row',['Самовивіз','Доставка','Видача'].includes(label));
      item.classList.toggle('v4321-equipment-row',label==='Техніка');
      item.classList.toggle('v4321-extras-row',label==='Додатково');
    });
  }

  function enhanceDetailFinance(detail){
    if(!mobile()||!detail)return;
    const card=detail.querySelector('.native-detail-card');
    if(!card)return;
    decorateInfoRows(card);
    if(detail.querySelector('.native-detail-finance-v4321'))return;

    const financeRow=[...card.querySelectorAll('.native-detail-info-row')].find(item=>text(item.querySelector(':scope>div>small'))==='Фінанси');
    if(!financeRow)return;
    const values=moneyMap(financeRow);
    const prepayment=pick(values,label=>label.startsWith('Передоплата'));
    const deposit=pick(values,label=>label.startsWith('Залог')||label.startsWith('Фактичний залоговий'));
    const rental=pick(values,label=>label==='Оренда'||label.startsWith('Оренда після знижки')||label.startsWith('Оренда до знижки'));
    const extras=pick(values,label=>label==='Додатково');
    const delivery=pick(values,label=>label==='Доставка');
    const status=String(card.dataset.status||'');

    // Finance truth: confirmed means the prepayment is factual; the security deposit
    // becomes factual only after issue. Waived prepayment naturally stays at 0.
    const factualPrepayment=['confirmed','issued','completed'].includes(status)?prepayment:0;
    const factualDeposit=['issued','completed'].includes(status)?deposit:0;
    const received=factualPrepayment+factualDeposit;
    const expenses=rental+extras+delivery;
    const balance=received-expenses;
    const resultLabel=balance>=0?'До повернення':'До доплати';
    const resultClass=balance>=0?'refund':'due';

    const section=document.createElement('section');
    section.className='native-detail-finance-v4321';
    section.dataset.status=status;
    section.innerHTML=`
      <header class="v4321-finance-head">
        <div class="v4321-finance-title"><i>${svgCoins}</i><div><small>Фінанси</small><strong>Розрахунок бронювання</strong></div></div>
        <div class="v4321-finance-expenses"><small>Разом витрати</small><strong>${format(expenses)}</strong></div>
      </header>
      <div class="v4321-finance-groups">
        <section class="v4321-finance-group received">
          <h3>Отримано від клієнта</h3>
          ${row('Передоплата',factualPrepayment)}
          ${row('Залог',factualDeposit)}
        </section>
        <section class="v4321-finance-group charged">
          <h3>Нараховано</h3>
          ${row('Оренда',rental)}
          ${row('Додатково',extras)}
          ${row('Доставка',delivery)}
        </section>
      </div>
      <div class="v4321-finance-summary">
        <div class="v4321-summary-card received"><span class="v4321-summary-icon">↓</span><span><small>Отримано</small><strong>${format(received)}</strong></span></div>
        <div class="v4321-summary-card expenses"><span class="v4321-summary-icon">↑</span><span><small>Витрати</small><strong>${format(expenses)}</strong></span></div>
        <div class="v4321-summary-result ${resultClass}"><span class="v4321-summary-icon">↶</span><small>${resultLabel}</small><strong>${format(Math.abs(balance))}</strong></div>
      </div>`;

    financeRow.remove();
    card.insertAdjacentElement('afterend',section);
    detail.classList.add('v4321-detail-ready');
  }

  function apply(){
    if(!mobile())return;
    document.documentElement.classList.add('v4321');
    document.querySelectorAll('.detail').forEach(enhanceDetailFinance);
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