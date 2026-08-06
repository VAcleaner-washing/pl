const CACHE='vacleaner-manager-3003';
const CORE=['/admin/bronuvannia/','/assets/vacleaner-core.js?v=3003','/assets/admin-v250.css?v=3003','/assets/admin-v250.js?v=3003','/admin/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith('/admin/')&&!url.pathname.startsWith('/assets/')&&!url.pathname.startsWith('/_next/static/'))return;
  const managed=event.request.mode==='navigate'||event.request.destination==='document'||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/_next/static/');
  if(!managed)return;
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
    if(response?.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
    return response;
  }).catch(()=>caches.match(event.request)));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus' in client)return client.focus()}return clients.openWindow?.(event.notification.data?.url||'/admin/bronuvannia/')}))});
self.addEventListener('push',event=>{let data={};try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||''}}event.waitUntil(self.registration.showNotification(data.title||'VAcleaner',{body:data.body||'Нова подія в адмінці',icon:'/icon-192.png',badge:'/icon-192.png',tag:data.tag||'vacleaner-notification',renotify:true,data:data.data||{url:'/admin/bronuvannia/'}}))});
