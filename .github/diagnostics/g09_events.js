(()=>{
 const journal=window.__g09=[];
 const desc=n=>n?{tag:n.tagName,id:n.id,cls:typeof n.className==='string'?n.className:'',type:n.type,name:n.name}:null;
 const rect=n=>n?.getBoundingClientRect().toJSON();
 const state=()=>{const b=document.querySelector('#equipmentBaselineForm [type=submit]'),f=b?.form,t=document.querySelector('.toast'),m=document.querySelector('.main'),notice=f?.querySelector('[data-lab-save-notice]');return{button:b?{...desc(b),disabled:b.disabled,inert:b.inert,ancestorInert:desc(b.closest('[inert]')),rect:rect(b)}:null,form:f?{saving:f.dataset.labSaving,inert:f.inert}:null,notice:notice?{rect:rect(notice)}:null,toast:t?{...desc(t),rect:rect(t),pointer:getComputedStyle(t).pointerEvents,opacity:getComputedStyle(t).opacity,transform:getComputedStyle(t).transform}:null,scroll:m?.scrollTop}};
 const log=(type,extra={})=>{if(document.querySelector('#equipmentBaselineForm'))journal.push({time:performance.now(),type,...extra,state:state()})};
 for(const name of ['pointerdown','pointerup','mousedown','mouseup','click','submit','invalid'])for(const capture of [true,false])document.addEventListener(name,e=>{
  if(!document.querySelector('#equipmentBaselineForm'))return;
  log(name,{capture,target:desc(e.target),trusted:e.isTrusted,defaultPrevented:e.defaultPrevented,x:e.clientX,y:e.clientY,hit:e.clientX===undefined?null:document.elementsFromPoint(e.clientX,e.clientY).slice(0,6).map(desc),submitter:desc(e.submitter)});
  if(capture)queueMicrotask(()=>log(name+':after',{target:desc(e.target),defaultPrevented:e.defaultPrevented}));
 },capture);
 document.addEventListener('scroll',e=>log('scroll',{target:desc(e.target)}),true);
 for(const name of ['transitionrun','transitionstart','transitionend','transitioncancel'])document.addEventListener(name,e=>{if(e.target.matches?.('.toast'))log(name,{property:e.propertyName,target:desc(e.target)})},true);
 new MutationObserver(ms=>{for(const m of ms){if(m.type==='attributes'&&(m.target.closest?.('#equipmentBaselineForm')||m.target.matches?.('.toast')))log('mutation',{target:desc(m.target),attribute:m.attributeName});if(m.type==='childList'&&[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&n.matches?.('.toast,[data-lab-save-notice]')))log('node-lifecycle',{added:[...m.addedNodes].map(desc),removed:[...m.removedNodes].map(desc)})}}).observe(document,{subtree:true,attributes:true,attributeFilter:['disabled','class','inert'],childList:true});
})();
