(()=>{
'use strict';
const ENDPOINT='https://yweluzclearwrazdkahu.supabase.co/functions/v1/vacleaner-address-v1';
const APIKEY='sb_publishable_-UdAKDf5jzIP6N9rBp927g_VhyJKeog';
const DETAILS_SEPARATOR=' · ';
const attached=new WeakMap();
let activeAdmin=null,activePublic=null,publicReady=false;

const nativeValueSetter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
function setInputValue(input,value){
  if(!input)return;
  if(nativeValueSetter)nativeValueSetter.call(input,value);else input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
function esc(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function splitStored(value){
  const raw=String(value||'').trim();
  const i=raw.indexOf(DETAILS_SEPARATOR);
  return i>0?{base:raw.slice(0,i).trim(),details:raw.slice(i+DETAILS_SEPARATOR.length).trim()}:{base:raw,details:''};
}
function compose(ctx,fallback=''){
  if(!ctx)return String(fallback||'').trim();
  const base=String(ctx.input?.value||fallback||'').trim();
  const details=String(ctx.details?.value||'').trim().replace(/\s+/g,' ');
  return base+(details?`${DETAILS_SEPARATOR}${details}`:'');
}
function hasHouseNumber(value){
  const base=splitStored(value).base.replace(/^полтава\s*,?/i,'').trim();
  return /(?:^|[\s,])\d+[\p{L}\p{N}\/-]*\s*$/u.test(base)||/\d+[\p{L}\p{N}\/-]*(?:\s*,\s*)?$/.test(base);
}
function isDeliveryContext(ctx){
  if(ctx.mode==='public')return Boolean(ctx.input.closest('.booking-delivery-address'));
  const form=ctx.input.closest('form');return form?.querySelector('[name="fulfillment"]')?.value==='delivery';
}
function setStatus(ctx,type,text){
  if(!ctx.status)return;
  ctx.status.className=`vac-address-status ${type||''}`.trim();
  ctx.status.innerHTML=`<span>${esc(text)}</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>`;
}
function closeList(ctx){
  ctx.items=[];ctx.active=-1;ctx.list.hidden=true;ctx.input.setAttribute('aria-expanded','false');ctx.list.innerHTML='';
}
function renderList(ctx,items){
  ctx.items=items||[];ctx.active=-1;
  if(!ctx.items.length){closeList(ctx);return}
  ctx.list.innerHTML=ctx.items.map((item,i)=>`<button type="button" role="option" data-vac-address-index="${i}" aria-selected="false"><strong>${esc(item.label)}</strong>${item.meta?`<small>${esc(item.meta)}</small>`:''}</button>`).join('');
  ctx.list.hidden=false;ctx.input.setAttribute('aria-expanded','true');
  ctx.list.querySelectorAll('[data-vac-address-index]').forEach(btn=>btn.addEventListener('mousedown',e=>{e.preventDefault();selectItem(ctx,Number(btn.dataset.vacAddressIndex))}));
}
function selectItem(ctx,index){
  const item=ctx.items[index];if(!item)return;
  ctx.setting=true;
  setInputValue(ctx.input,item.address);
  ctx.setting=false;
  ctx.selected=item.houseNumber?item.address:'';
  if(item.houseNumber){ctx.input.dataset.vacAddressSelected='1';setStatus(ctx,'ok','Адресу знайдено. Доставка — до під’їзду. За потреби додайте орієнтир.');closeList(ctx);ctx.details?.focus()}
  else{delete ctx.input.dataset.vacAddressSelected;setStatus(ctx,'hint','Вулицю знайшли — допишіть номер будинку.');closeList(ctx);ctx.input.focus();const len=ctx.input.value.length;ctx.input.setSelectionRange?.(len,len)}
}
function setActive(ctx,index){
  const buttons=[...ctx.list.querySelectorAll('[role="option"]')];if(!buttons.length)return;
  ctx.active=(index+buttons.length)%buttons.length;
  buttons.forEach((b,i)=>{b.classList.toggle('active',i===ctx.active);b.setAttribute('aria-selected',i===ctx.active?'true':'false')});
  buttons[ctx.active]?.scrollIntoView({block:'nearest'});
}
async function search(ctx){
  const q=String(ctx.input.value||'').trim();
  if(q.length<3){closeList(ctx);setStatus(ctx,'hint','Почніть вводити адресу — підкажемо Полтаву та передмістя.');return}
  ctx.abort?.abort();ctx.abort=new AbortController();
  setStatus(ctx,'loading','Шукаємо адресу…');
  try{
    const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':APIKEY},body:JSON.stringify({q}),signal:ctx.abort.signal});
    if(!res.ok)throw new Error('address_lookup_failed');
    const data=await res.json();
    if(data.providerUnavailable){closeList(ctx);setStatus(ctx,'warn','Підказки тимчасово недоступні. Адресу можна ввести вручну.');return}
    const items=Array.isArray(data.suggestions)?data.suggestions:[];
    if(!items.length){closeList(ctx);setStatus(ctx,'warn','Не знайшли точну адресу. Перевірте написання або введіть її вручну.');return}
    renderList(ctx,items);
    setStatus(ctx,'hint','Оберіть адресу зі списку — так маршрут відкриється точно.');
  }catch(err){
    if(err?.name==='AbortError')return;
    closeList(ctx);setStatus(ctx,'warn','Підказки недоступні. Адресу можна ввести вручну.');
  }
}
function validate(ctx,show=true){
  if(!ctx||!isDeliveryContext(ctx))return true;
  const value=String(ctx.input.value||'').trim();
  if(value.length<5||!hasHouseNumber(value)){
    if(show)setStatus(ctx,'error','Вкажіть вулицю і номер будинку.');
    ctx.input.setCustomValidity('Вкажіть вулицю і номер будинку');
    return false;
  }
  ctx.input.setCustomValidity('');
  if(!ctx.input.dataset.vacAddressSelected&&show)setStatus(ctx,'warn','Адресу введено вручну — менеджер перевірить її перед доставкою.');
  return true;
}
function bindSubmit(ctx){
  const form=ctx.input.closest('form');if(!form||form.dataset.vacAddressSubmitBound)return;
  form.dataset.vacAddressSubmitBound='1';
  form.addEventListener('submit',e=>{
    const current=ctx.mode==='admin'?activeAdmin:activePublic;
    if(!current||!isDeliveryContext(current))return;
    if(!validate(current,true)){
      e.preventDefault();e.stopImmediatePropagation();current.input.focus();current.input.reportValidity?.();
    }
  },true);
}
function attach(input,mode){
  if(!input||attached.has(input))return;
  const original=splitStored(input.value);
  if(original.details&&original.base!==input.value)setInputValue(input,original.base);
  input.autocomplete='street-address';input.spellcheck=false;
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  input.placeholder='Почніть вводити: Соборності 45';

  const wrap=document.createElement('div');wrap.className='vac-address-input-wrap';
  input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
  const list=document.createElement('div');list.className='vac-address-list';list.setAttribute('role','listbox');list.hidden=true;wrap.appendChild(list);
  const status=document.createElement('div');status.className='vac-address-status hint';wrap.insertAdjacentElement('afterend',status);
  const detailBox=document.createElement('div');detailBox.className='vac-address-details';
  detailBox.innerHTML='<span>Під’їзд / орієнтир <small>необов’язково</small></span><input type="text" data-vac-address-detail="1" maxlength="120" autocomplete="off" placeholder="Наприклад: 2 під’їзд, зі сторони двору" aria-label="Під’їзд або орієнтир для доставки"><small class="vac-address-delivery-note">Доставка техніки — до під’їзду.</small>';
  status.insertAdjacentElement('afterend',detailBox);
  const details=detailBox.querySelector('input');details.value=original.details;
  const ctx={input,mode,wrap,list,status,detailBox,details,items:[],active:-1,selected:'',timer:0,abort:null,setting:false};
  attached.set(input,ctx);if(mode==='admin')activeAdmin=ctx;else activePublic=ctx;
  setStatus(ctx,'hint','Почніть вводити адресу — підкажемо Полтаву та передмістя.');
  if(original.base&&hasHouseNumber(original.base))setStatus(ctx,'hint','Збережена адреса. За потреби оберіть її зі списку ще раз.');
  input.addEventListener('input',()=>{
    if(ctx.setting)return;
    ctx.selected='';delete input.dataset.vacAddressSelected;input.setCustomValidity('');
    clearTimeout(ctx.timer);ctx.timer=setTimeout(()=>search(ctx),420);
  });
  input.addEventListener('focus',()=>{if(ctx.items.length)renderList(ctx,ctx.items)});
  input.addEventListener('blur',()=>setTimeout(()=>{closeList(ctx);if(input.value.trim())validate(ctx,false)},140));
  input.addEventListener('keydown',e=>{
    if(ctx.list.hidden)return;
    if(e.key==='ArrowDown'){e.preventDefault();setActive(ctx,ctx.active+1)}
    else if(e.key==='ArrowUp'){e.preventDefault();setActive(ctx,ctx.active-1)}
    else if(e.key==='Enter'&&ctx.active>=0){e.preventDefault();selectItem(ctx,ctx.active)}
    else if(e.key==='Escape'){e.preventDefault();closeList(ctx)}
  });
  bindSubmit(ctx);
}
function scan(){
  if(publicReady)document.querySelectorAll('.booking-delivery-address input[type="text"]:not([data-vac-address-detail])').forEach(input=>attach(input,'public'));
  document.querySelectorAll('.delivery-address-field input[name="deliveryAddress"]').forEach(input=>attach(input,'admin'));
}
function installGlobals(){
  window.__VAC_DELIVERY_ADDRESS__=(fallback='')=>compose(activePublic,fallback);
  window.__VAC_ADMIN_DELIVERY_ADDRESS__=(fallback='')=>compose(activeAdmin,fallback);
  window.__VAC_SET_ADMIN_DELIVERY_ADDRESS__=(value='')=>{
    if(!activeAdmin)return false;
    const parsed=splitStored(value);
    activeAdmin.setting=true;setInputValue(activeAdmin.input,parsed.base);activeAdmin.setting=false;
    activeAdmin.details.value=parsed.details;activeAdmin.selected='';delete activeAdmin.input.dataset.vacAddressSelected;
    setStatus(activeAdmin,'hint','Збережена адреса. За потреби оберіть її зі списку ще раз.');
    return true;
  };
}
installGlobals();scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
const enablePublic=()=>setTimeout(()=>{publicReady=true;scan()},100);
if(document.readyState==='complete')enablePublic();else window.addEventListener('load',enablePublic,{once:true});
document.addEventListener('click',e=>{
  for(const ctx of [activePublic,activeAdmin])if(ctx&&!ctx.wrap.contains(e.target))closeList(ctx);
});
})();
