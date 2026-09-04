(()=>{'use strict';
const money=n=>new Intl.NumberFormat('uk-UA').format(Math.max(0,Number(n)||0))+' грн';
const amount=node=>Number(String(node?.textContent||'').replace(/[^0-9]/g,''))||0;
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function enhanceFinance(root=document){
  root.querySelectorAll('.booking-card .booking-finance').forEach(finance=>{
    const received=finance.querySelector(':scope > .booking-finance-received-summary');
    const deposit=finance.querySelector(':scope > .booking-deposit-state');
    if(!received)return;
    let helper=received.querySelector(':scope > .booking-finance-received-breakdown');
    if(!helper){helper=document.createElement('small');helper.className='booking-finance-received-breakdown';received.appendChild(helper)}
    const legacy=received.nextElementSibling;
    if(legacy?.tagName==='SPAN'&&!legacy.className)legacy.classList.add('booking-finance-received-legacy');
    const receivedAmount=amount(received.querySelector(':scope > strong'));
    const depositAmount=amount(deposit?.querySelector(':scope > strong'));
    const paid=Boolean(deposit?.classList.contains('paid'));
    const returned=Boolean(deposit?.classList.contains('returned'));
    const expectedPending=Boolean(deposit?.classList.contains('pending')&&finance.classList.contains('pre-issue'));
    const normalDeposit=Boolean(!deposit||paid||returned||expectedPending);
    const prepayment=Math.max(0,receivedAmount-((paid||returned)?depositAmount:0));
    let helperText=`Передоплата ${money(prepayment)}`;
    if(depositAmount>0){
      if(paid||returned)helperText+=` · залог ${money(depositAmount)}`;
      else if(expectedPending)helperText+=` · залог ${money(depositAmount)} при видачі`;
    }
    setText(helper,helperText);
    finance.classList.toggle('booking-finance--deposit-collapsed',normalDeposit);
    if(!deposit)return;
    deposit.classList.toggle('booking-deposit-state--redundant',normalDeposit);
    deposit.classList.toggle('booking-deposit-state--exception',!normalDeposit);
    if(!normalDeposit){
      setText(deposit.querySelector(':scope > span'),'Залог не отримано');
      setText(deposit.querySelector(':scope > small'),'· потрібна перевірка');
    }
  })
}
const run=()=>enhanceFinance(document);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else queueMicrotask(run);
const target=document.getElementById('view')||document.getElementById('adminMount')||document.body;
new MutationObserver(()=>run()).observe(target,{childList:true,subtree:true});
window.VACLEANER_ENHANCE_BOOKING_FINANCE=run;
})();
