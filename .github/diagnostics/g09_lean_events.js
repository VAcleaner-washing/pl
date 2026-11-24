(()=>{
 const journal=window.__g09=[];
 const desc=n=>n?{tag:n.tagName,id:n.id,cls:typeof n.className==='string'?n.className:'',type:n.type}:null;
 // No computed-style, geometry or hit-test reads: control for instrumentation cost.
 for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','submit','invalid'])for(const capture of [true,false])document.addEventListener(type,e=>{
  const f=document.getElementById('equipmentBaselineForm');if(!f)return;
  const b=f.querySelector('[type=submit]');
  journal.push({time:performance.now(),type,capture,target:desc(e.target),trusted:e.isTrusted,defaultPrevented:e.defaultPrevented,x:e.clientX,y:e.clientY,button:b?{disabled:b.disabled,inert:b.inert,ancestorInert:desc(b.closest('[inert]'))}:null,toastClass:document.querySelector('.toast')?.className});
 },capture);
})();
