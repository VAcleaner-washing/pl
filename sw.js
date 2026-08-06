const CACHE='vacleaner-manager-v2960';
const CORE=['/admin/bronuvannia/','/assets/admin-v250.css?v=2.9.6.0','/assets/admin-v250.js?v=2.9.6.0','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  const isNavigation=event.request.mode==='navigate'||event.request.destination==='document';
  const isManagedAsset=url.pathname.startsWith('/assets/')||url.pathname.startsWith('/_next/static/');
  if(isNavigation||isManagedAsset){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus' in c)return c.focus()}if(clients.openWindow)return clients.openWindow(event.notification.data?.url||'/admin/bronuvannia/')}))});
self.addEventListener('push',event=>{let data={};try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():''}}const title=data.title||'VAcleaner';const options={body:data.body||'Нова подія в адмінці',icon:'/icon-192.png',badge:'/icon-192.png',tag:data.tag||'vacleaner-notification',renotify:true,data:data.data||{url:'/admin/bronuvannia/'}};event.waitUntil(self.registration.showNotification(title,options));});
