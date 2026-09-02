(()=>{
  'use strict';
  const ROUTE='/admin/bronuvannia-native-v23/';
  const mobile=()=>matchMedia('(max-width:900px)').matches;
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};

  function enhanceAudit(){
    const panel=document.querySelector('.detail .audit-panel');
    if(!panel||panel.dataset.v23Bound==='1')return;
    panel.dataset.v23Bound='1';
    const head=panel.querySelector('.audit-panel-head');
    if(!head)return;
    head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded','false');
    const toggle=()=>{const open=panel.classList.toggle('native-v23-audit-open');head.setAttribute('aria-expanded',String(open))};
    head.addEventListener('click',e=>{if(e.target.closest('#auditReload'))return;toggle()});
    head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  }

  function syncConnection(node){
    if(!node)return;const online=navigator.onLine!==false;
    node.classList.toggle('offline',!online);node.querySelector('span').textContent=online?'Онлайн':'Офлайн';
  }
  function enhanceMore(){
    const menu=document.querySelector('.mobile-more-menu');
    if(!menu)return;
    let row=menu.querySelector('.native-v23-connection');
    if(!row){
      row=document.createElement('div');row.className='native-v23-connection';row.setAttribute('aria-live','polite');row.innerHTML='<i aria-hidden="true"></i><span>Онлайн</span>';
      const profile=menu.querySelector('.native-profile-card');
      profile?.insertAdjacentElement('afterend',row);
    }
    syncConnection(row);
  }

  function registerScopedSw(){
    if(!('serviceWorker' in navigator)||!location.pathname.startsWith(ROUTE))return;
    navigator.serviceWorker.register('/admin/sw-native-v23.js?v=4247',{scope:ROUTE}).then(reg=>reg.update?.()).catch(err=>console.warn('native_v23_sw_failed',err));
  }

  function patchLocalNotification(){
    if(typeof window.sendLocalNotification!=='function'||window.sendLocalNotification.__nativeV23)return;
    const fn=async(title,body)=>{
      if(typeof notificationState==='function'&&!notificationState().enabled)return;
      try{
        const reg=await navigator.serviceWorker?.ready;
        if(reg)await reg.showNotification(title,{body,icon:'/admin/icon-192.png',badge:'/admin/icon-192.png',tag:'vacleaner-booking',data:{url:ROUTE}});
        else if('Notification' in window)new Notification(title,{body});
      }catch(e){console.warn('notification_failed',e)}
    };
    fn.__nativeV23=true;window.sendLocalNotification=fn;
  }

  function apply(){
    if(!mobile())return;
    document.documentElement.classList.add('native-v23');
    enhanceAudit();enhanceMore();patchLocalNotification();
  }

  new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('resize',queue,{passive:true});
  addEventListener('online',()=>{syncConnection(document.querySelector('.native-v23-connection'))},{passive:true});
  addEventListener('offline',()=>{syncConnection(document.querySelector('.native-v23-connection'))},{passive:true});
  addEventListener('DOMContentLoaded',()=>{registerScopedSw();queue()},{once:true});
  registerScopedSw();queue();
})();
