const CACHE='vacleaner-manager-4236';
const FALLBACK='/admin/bronuvannia/';
const CORE=[FALLBACK,'/assets/vacleaner-core.js?v=4236','/assets/admin-v250.css?v=4236','/assets/admin-v250.js?v=4236','/assets/admin-glass-test.css?v=4236','/assets/admin-glass-test.js?v=4236','/admin/manifest.webmanifest','/admin/icon-192.png','/admin/icon-512.png','/admin/apple-touch-icon.png?v=4236'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const managed=event.request.mode==='navigate'||event.request.destination==='document'||url.pathname.startsWith('/admin/')||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/_next/static/');
  if(!managed)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response?.ok){
        const cache=await caches.open(CACHE);
        cache.put(event.request,response.clone());
      }
      return response;
    }catch{
      const cached=await caches.match(event.request,{ignoreSearch:false});
      if(cached)return cached;
      if(event.request.mode==='navigate'||event.request.destination==='document'){
        const fallback=await caches.match(FALLBACK);
        if(fallback)return fallback;
      }
      return new Response('Офлайн',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const data=event.notification.data||{};
  const relative=data.url||'/admin/bronuvannia/';
  const target=new URL(relative,self.location.origin);
  if(data.bookingId&&!target.searchParams.get('booking'))target.searchParams.set('booking',String(data.bookingId));
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>{
      try{return new URL(client.url).origin===self.location.origin}catch{return false}
    });
    if(existing){
      try{if('navigate' in existing)await existing.navigate(target.href)}catch{}
      try{existing.postMessage({type:'VACLEANER_OPEN_BOOKING',url:target.href,bookingId:data.bookingId||target.searchParams.get('booking')||''})}catch{}
      if('focus' in existing)await existing.focus();
      return;
    }
    const opened=await self.clients.openWindow?.(target.href);
    try{opened?.postMessage({type:'VACLEANER_OPEN_BOOKING',url:target.href,bookingId:data.bookingId||target.searchParams.get('booking')||''})}catch{}
  })());
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||''}}
  // Legacy public-booking push used a technical title/date payload.
  // Suppress it: the server reminder runner sends the human-friendly new-booking notification.
  if(data.title==='Нове бронювання VAcleaner')return;
  const notificationData=data.data&&typeof data.data==='object'?data.data:{url:'/admin/bronuvannia/'};
  event.waitUntil(self.registration.showNotification(data.title||'VAcleaner',{
    body:data.body||'Нова подія в адмінці',
    icon:'/admin/icon-192.png',
    badge:'/admin/icon-192.png',
    tag:data.tag||'vacleaner-notification',
    renotify:true,
    data:notificationData,
  }));
});
