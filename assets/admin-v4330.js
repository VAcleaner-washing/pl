(()=>{'use strict';
const HOME_RESET_ITEMS=[
  ['Kärcher Puzzi 8/1','Миючий пилосос · дивани, матраци, текстиль'],
  ['Kärcher SC 2 Deluxe','Пароочисник · кухня, ванна, тверді поверхні'],
  ['Jimmy JV35','Сухий етап · матраци та м’які меблі'],
  ['Робот для вікон · ABIR WD8','Вікна, дзеркала та скляні поверхні']
];
let panelSeq=0;
const clean=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
function enhanceRow(row){
  if(!(row instanceof HTMLElement)||row.dataset.v4330HomeReset==='1')return;
  const body=row.querySelector(':scope > div');
  const label=clean(body?.querySelector(':scope > small'));
  const product=clean(body?.querySelector(':scope > strong'));
  if(label!=='Техніка'||!/^HOME RESET(?:\s|$|·)/i.test(product))return;
  const hint=document.createElement('span');
  hint.className='v4330-home-reset-hint';
  hint.textContent='4 одиниці техніки · показати склад';
  const panel=document.createElement('div');
  panel.className='v4330-home-reset-kit';
  panel.id='v4330-home-reset-kit-'+(++panelSeq);
  panel.hidden=true;
  panel.innerHTML=HOME_RESET_ITEMS.map((item,index)=>`<div class="v4330-home-reset-kit-item"><span class="v4330-home-reset-kit-index">${String(index+1).padStart(2,'0')}</span><span class="v4330-home-reset-kit-copy"><b>${item[0]}</b><small>${item[1]}</small></span></div>`).join('');
  body.append(hint,panel);
  row.dataset.v4330HomeReset='1';
  row.classList.add('v4330-home-reset-row','v4321-chevron-row');
  row.setAttribute('role','button');
  row.setAttribute('tabindex','0');
  row.setAttribute('aria-expanded','false');
  row.setAttribute('aria-controls',panel.id);
  row.setAttribute('aria-label','HOME RESET. Показати техніку, що входить до комплекту');
  const setOpen=open=>{
    row.setAttribute('aria-expanded',String(open));
    panel.hidden=!open;
    hint.textContent=open?'4 одиниці техніки · згорнути':'4 одиниці техніки · показати склад';
    row.setAttribute('aria-label',`HOME RESET. ${open?'Згорнути':'Показати'} техніку, що входить до комплекту`);
  };
  row.addEventListener('click',event=>{
    if(event.target.closest('a,button,input,select,textarea,.v4330-home-reset-kit'))return;
    setOpen(row.getAttribute('aria-expanded')!=='true');
  });
  row.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    if(event.target!==row)return;
    event.preventDefault();
    setOpen(row.getAttribute('aria-expanded')!=='true');
  });
}
function scan(root=document){
  if(root instanceof HTMLElement&&root.matches('.native-detail-info-row'))enhanceRow(root);
  root.querySelectorAll?.('.native-detail-info-row').forEach(enhanceRow);
}
let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;scan(document)});
}
function start(){
  scan(document);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
