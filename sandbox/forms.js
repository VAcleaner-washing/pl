/* LAB interaction policy. Existing application handlers remain the only save owners. */
(()=>{'use strict';
if(document.documentElement.dataset.adminLab!=='synthetic')return;
const records=new WeakMap(),ownedInert=new Set();
let confirmation=null,menuReturnFocus=null,bypass=false,approvedReload=false,sequence=0;
const forms=(root=document)=>[...root.querySelectorAll('form')].filter(form=>form.id!=='authForm');
const fields=form=>[...form.elements].filter(field=>field.matches('input,select,textarea')&&!['submit','button','reset'].includes(field.type)&&(field.name||field.type==='file'||field.tagName==='TEXTAREA'));
const snapshot=form=>JSON.stringify(fields(form).map((field,index)=>[field.name||field.id||String(index),field.type,field.type==='file'?[...field.files].map(file=>[file.name,file.size,file.lastModified]):['checkbox','radio'].includes(field.type)?field.checked:field.value]));
function record(form){let value=records.get(form);if(!value){value={baseline:snapshot(form),interacted:false,edited:false,submitted:false,clicked:null,touched:new WeakSet(),frozen:new Set()};records.set(form,value)}return value}
const dirty=form=>record(form).edited&&record(form).baseline!==snapshot(form);
const busy=form=>{const value=record(form);return Boolean(value.clicked?.isConnected&&value.clicked.disabled||value.submitted&&[...form.elements].some(field=>field.type==='submit'&&field.disabled))};
function hydrate(){
 for(const form of forms()){
  record(form);
  for(const field of fields(form)){
   const caption=field.closest('label')?.querySelector(':scope > span');
   if(caption&&!field.hasAttribute('aria-label')&&!field.hasAttribute('aria-labelledby')){
    if(!caption.id)caption.id=`lab-field-label-${++sequence}`;
    field.setAttribute('aria-labelledby',caption.id);
   }
  }
  const value=record(form);
  // Native enhancements add proxy controls after the initial markup. Until the user
  // changes a field those are initialization, not an unsaved draft.
  if(!value.edited&&!value.interacted)value.baseline=snapshot(form);
  if(busy(form)){
   form.dataset.labSaving='1';status(form);
   for(const field of fields(form))if(!field.inert){field.inert=true;value.frozen.add(field)}
  }else{
   delete form.dataset.labSaving;value.submitted=false;value.clicked=null;
   for(const field of value.frozen)field.inert=false;value.frozen.clear();form.querySelector('[data-lab-save-notice]')?.remove();
  }
  const hasFault=Boolean(window.VA_LAB?.faults.read||window.VA_LAB?.faults.write);
  const recovery=form.querySelector('[data-lab-fault-recovery]');
  if(hasFault&&!busy(form)&&!recovery){
   const header=form.querySelector('header');
   if(header){const button=document.createElement('button');button.type='button';button.className='btn lab-fault-recovery';button.dataset.labFaultRecovery='';button.textContent='Вимкнути тестові помилки';button.onclick=()=>{
    window.VA_LAB.faults.read=false;window.VA_LAB.faults.write=false;
    for(const id of ['labReadError','labWriteError']){const checkbox=document.getElementById(id);if(checkbox)checkbox.checked=false}hydrate();
   };(header.querySelector(':scope > div')||header).append(button)}
  }else if((!hasFault||busy(form))&&recovery)recovery.remove();
 }
 document.querySelectorAll('#layer summary').forEach(summary=>{if(!summary.hasAttribute('tabindex'))summary.tabIndex=0});
 document.querySelectorAll('.modal-card button.close:not([aria-label])').forEach(button=>button.setAttribute('aria-label','Закрити форму'));
 const dialogOpen=Boolean(document.querySelector('#layer .modal,#layer .detail,#layer dialog[open]'));
 if(dialogOpen){
  document.querySelectorAll('#adminMount,.mobile-nav,.lab-banner,.lab-tools').forEach(node=>{if(!node.inert){node.inert=true;ownedInert.add(node)}});
 }else{for(const node of ownedInert)node.inert=false;ownedInert.clear()}
 if(confirmation&&!confirmation.dialog.isConnected)confirmation=null;
 if(menuReturnFocus&&!menuReturnFocus.isConnected)menuReturnFocus=null;
}
const observer=new MutationObserver(hydrate);
for(const root of [document.querySelector('#adminMount'),document.querySelector('#layer')])if(root)observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
document.addEventListener('vacleaner:lab-conditions',hydrate);
function status(form){
 if(form.querySelector('[data-lab-save-notice]'))return;
 const notice=document.createElement('p');notice.dataset.labSaveNotice='';notice.className='lab-save-notice';notice.setAttribute('role','status');notice.textContent='Збереження триває. Дочекайтеся відповіді, щоб не втратити результат.';
 const header=form.querySelector('header');(header?.querySelector(':scope > div')||header||form).append(notice);
}
function showLeave(selected,action,{reload=false}={}){
 if(confirmation)return;
 const returnFocus=document.activeElement,dialog=document.createElement('dialog');dialog.className='lab-leave-dialog';dialog.id='labLeaveDialog';dialog.setAttribute('aria-labelledby','labLeaveTitle');dialog.setAttribute('aria-describedby','labLeaveDescription');
 dialog.innerHTML='<h2 id="labLeaveTitle">Залишити незбережені зміни?</h2><p id="labLeaveDescription">Введені дані ще не збережено. Можна продовжити редагування або вийти без цих змін.</p><div class="lab-leave-actions"><button type="button" class="btn primary" data-lab-keep>Продовжити редагування</button><button type="button" class="btn danger" data-lab-discard>Вийти без збереження</button></div>';
 document.querySelector('#layer').append(dialog);confirmation={dialog,returnFocus};
 const keep=()=>{dialog.close();dialog.remove();confirmation=null;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});hydrate()};
 dialog.querySelector('[data-lab-keep]').onclick=keep;
 dialog.addEventListener('cancel',event=>{event.preventDefault();keep()});
 dialog.querySelector('[data-lab-discard]').onclick=()=>{
  dialog.close();dialog.remove();confirmation=null;if(reload)approvedReload=true;
  bypass=true;try{action()}finally{bypass=false}hydrate();
 };
 dialog.showModal();dialog.querySelector('[data-lab-keep]').focus({preventScroll:true});
}
function leave(event,selected,action,options){
 const saving=selected.filter(busy),changed=selected.filter(dirty);
 if(!saving.length&&!changed.length)return false;
 event.preventDefault();event.stopImmediatePropagation();
 if(saving.length){status(saving[0]);return true}
 showLeave(changed,action,options);return true;
}
function closeMenus(except=null){
 document.querySelectorAll('details.booking-action-more[open],details.campaign-more[open]').forEach(menu=>{if(menu!==except)menu.open=false});
}
document.addEventListener('click',event=>{
 if(bypass)return;
 const target=event.target instanceof Element?event.target:null;if(!target)return;
 if(target.closest('#labLeaveDialog'))return;
 const menu=target.closest('details.booking-action-more,details.campaign-more');
 if(menu&&target.closest('summary'))menuReturnFocus=menu.querySelector('summary');
 // Close before invoking the original action, including a dismissed native confirm.
 if(menu&&target.closest('button[data-action],.campaign-more button')){menu.open=false;menu.querySelector('summary')?.focus({preventScroll:true})}
 closeMenus(menu);
 const button=target.closest('button,a');if(!button)return;
 const form=button.closest('form');
 if(form&&event.isTrusted)record(form).interacted=true;
 if(form&&button.matches('[type="submit"],#saveProcess,#confirmProcess,#archiveExpense,#resetSlots,#resetDeposits'))record(form).clicked=button;
 let selected=null,reload=false;
 if(button.matches('[data-close],[data-layer-back],.modal-backdrop,.detail .back'))selected=forms(document.querySelector('#layer'));
 else if(button.matches('[data-view],[data-mobile-view],[data-more-view],[data-settings-open-finances],#logout'))selected=forms();
 else if(button.matches('#newBooking,#mobileNewBooking'))selected=forms();
 else if(button.matches('#resetSlots,#resetDeposits'))selected=form?[form]:[];
 else if(button.matches('.pwa-update-now')&&!forms(document.querySelector('#layer')).length){selected=forms();reload=true}
 if(selected)leave(event,selected,()=>{if(button.isConnected)button.click()},{reload});
},true);
document.addEventListener('keydown',event=>{
 if(bypass)return;
 if(confirmation){
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();confirmation.dialog.querySelector('[data-lab-keep]').click()}
  else if(event.key==='Tab')event.stopImmediatePropagation();
  return;
 }
 if(event.key!=='Escape')return;
 const sheet=document.querySelector('.native-v2-action-sheet-layer');
 if(sheet){event.preventDefault();event.stopImmediatePropagation();sheet.querySelector('.native-v2-sheet-close')?.click();menuReturnFocus?.focus({preventScroll:true});menuReturnFocus=null;return}
 const menu=document.querySelector('details.booking-action-more[open],details.campaign-more[open]');
 if(menu){event.preventDefault();event.stopImmediatePropagation();menu.open=false;menu.querySelector('summary')?.focus();return}
 const selected=forms(document.querySelector('#layer'));
 if(selected.length)leave(event,selected,()=>{
  const close=document.querySelector('.modal-card [data-close],.modal-card [data-layer-back]');
  if(close)close.click();
 });
 else{const back=document.querySelector('#layer .detail .back');if(back){event.preventDefault();event.stopImmediatePropagation();back.click()}}
},true);
function interaction(event){const form=event.target.closest?.('form');if(form&&form.id!=='authForm'&&event.isTrusted){const value=record(form);if(!value.edited&&!value.interacted)value.baseline=snapshot(form);value.interacted=true}}
document.addEventListener('pointerdown',interaction,true);
document.addEventListener('keydown',interaction,true);
document.addEventListener('focusin',event=>{if(event.target.matches?.('input,select,textarea'))interaction(event)},true);
document.addEventListener('submit',event=>{if(event.target instanceof HTMLFormElement&&event.target.id!=='authForm')record(event.target).submitted=true},true);
document.addEventListener('vacleaner:form-saved',event=>{if(event.target instanceof HTMLFormElement){const value=record(event.target);value.baseline=snapshot(event.target);value.edited=false}},true);
function errorText(field){const v=field.validity;if(v.valueMissing)return'Заповніть це поле.';if(v.rangeUnderflow)return`Мінімальне значення — ${field.min}.`;if(v.rangeOverflow)return`Максимальне значення — ${field.max}.`;return'Перевірте формат і значення поля.'}
function validate(field){
 if(!field.willValidate)return;
 const label=field.closest('label');if(!label)return;
 let error=label.querySelector('.lab-field-error');
 if(field.validity.valid){
  if(field.dataset.labInvalid){field.removeAttribute('aria-invalid');delete field.dataset.labInvalid}
  if(error){field.setAttribute('aria-describedby',(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==error.id).join(' '));error.remove()}
  return;
 }
 if(!error){error=document.createElement('span');error.className='lab-field-error';error.id=`lab-field-error-${++sequence}`;label.append(error);field.setAttribute('aria-describedby',[field.getAttribute('aria-describedby'),error.id].filter(Boolean).join(' '))}
 error.textContent=errorText(field);field.setAttribute('aria-invalid','true');field.dataset.labInvalid='1';
}
document.addEventListener('invalid',event=>{if(event.target.closest('form')&&event.target.closest('form').id!=='authForm')validate(event.target)},true);
document.addEventListener('input',event=>{
 const field=event.target,form=field.closest?.('form');if(!form||form.id==='authForm')return;
 if(!event.isTrusted&&!records.get(form)?.interacted&&!(field.type==='file'&&field.files?.length))return;
 approvedReload=false;const value=record(form);value.edited=true;if(!busy(form)){value.submitted=false;value.clicked=null}value.touched.add(field);if(field.dataset.labInvalid)validate(field);
},true);
document.addEventListener('change',event=>{const field=event.target,form=field.closest?.('form');if(form&&form.id!=='authForm'&&(event.isTrusted||records.get(form)?.interacted||field.type==='file'&&field.files?.length)){const value=record(form);value.edited=true;if(!busy(form)){value.submitted=false;value.clicked=null}}},true);
document.addEventListener('focusout',event=>{const field=event.target,form=field.closest?.('form');if(form&&form.id!=='authForm'&&record(form).touched.has(field))validate(field)},true);
window.addEventListener('beforeunload',event=>{if(!approvedReload&&forms().some(form=>busy(form)||dirty(form))){event.preventDefault();event.returnValue=''}});
const zoom=()=>{const value=Boolean(window.visualViewport&&window.visualViewport.scale>1.05);if(document.documentElement.hasAttribute('data-lab-zooming')!==value)document.documentElement.toggleAttribute('data-lab-zooming',value)};
window.visualViewport?.addEventListener('resize',zoom,{passive:true});zoom();hydrate();
})();
