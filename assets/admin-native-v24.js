(()=>{
  'use strict';
  const ROUTE='/admin/bronuvannia-native-v24/';
  const syncOnline=()=>document.documentElement.classList.toggle('native-v24-offline',navigator.onLine===false);
  const patchLocalNotification=()=>{
    if(typeof window.sendLocalNotification!=='function'||window.sendLocalNotification.__nativeV24)return;
    const fn=async(title,body)=>{
      if(typeof notificationState==='function'&&!notificationState().enabled)return;
      try{
        const reg=await navigator.serviceWorker?.ready;
        if(reg)await reg.showNotification(title,{body,icon:'/admin/icon-192.png',badge:'/admin/icon-192.png',tag:'vacleaner-booking',data:{url:ROUTE}});
        else if('Notification' in window)new Notification(title,{body});
      }catch(e){console.warn('notification_failed',e)}
    };
    fn.__nativeV24=true;fn.__nativeV23=true;window.sendLocalNotification=fn;
  };
  const registerScopedSw=()=>{
    if(!('serviceWorker' in navigator)||!location.pathname.startsWith(ROUTE))return;
    navigator.serviceWorker.register('/admin/sw-native-v24.js?v=4247',{scope:ROUTE}).then(reg=>reg.update?.()).catch(err=>console.warn('native_v24_sw_failed',err));
  };
  const apply=()=>{
    if(!matchMedia('(max-width:900px)').matches)return;
    document.documentElement.classList.add('native-v24');
    syncOnline();
    patchLocalNotification();
  };
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('online',syncOnline,{passive:true});
  addEventListener('offline',syncOnline,{passive:true});
  addEventListener('resize',apply,{passive:true});
  addEventListener('DOMContentLoaded',()=>{registerScopedSw();apply()},{once:true});
  registerScopedSw();apply();
})();
