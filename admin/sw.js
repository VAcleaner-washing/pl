const CACHE='vacleaner-manager-4343';
const FALLBACK='/admin/bronuvannia/';
const CORE=[FALLBACK,'/assets/admin-v250.css?v=4343','/assets/admin-glass-test.css?v=4343','/assets/address-autocomplete.css?v=4343','/assets/admin-v430.css?v=4343','/assets/admin-v436.css?v=4343','/assets/admin-v437.css?v=4343','/assets/admin-v438.css?v=4343','/assets/admin-v4310.css?v=4343','/assets/admin-v4311.css?v=4343','/assets/admin-v4315.css?v=4343','/assets/admin-v4319.css?v=4343','/assets/admin-v4320.css?v=4343','/assets/admin-v4321.css?v=4343','/assets/admin-v4322.css?v=4343','/assets/admin-v4323.css?v=4343','/assets/admin-v4324.css?v=4343','/assets/admin-v4326.css?v=4343','/assets/admin-v4327.css?v=4343','/assets/admin-v4330.css?v=4343','/assets/vacleaner-core.js?v=4343','/assets/admin-v4319-triple-kit.js?v=4343','/assets/admin-v250.js?v=4343','/assets/admin-v4312.js?v=4343','/assets/admin-glass-test.js?v=4343','/assets/address-autocomplete.js?v=4343','/assets/admin-v430.js?v=4343','/assets/admin-v437.js?v=4343','/assets/admin-v438.js?v=4343','/assets/admin-v439.js?v=4343','/assets/admin-v4311.js?v=4343','/assets/admin-v4316.js?v=4343','/assets/admin-v4319-prepayment-waiver.js?v=4343','/assets/admin-v4321.js?v=4343','/assets/admin-v4322.js?v=4343','/assets/admin-v4330.js?v=4343','/admin/manifest.webmanifest','/admin/icon-192.png','/admin/icon-512.png','/admin/apple-touch-icon.png?v=4343'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
// Only exact, release-addressed JS/CSS is immutable. HTML stays network-first.
function isBuildAsset(url){return url.pathname.startsWith('/assets/')&&/\.(?:js|css)$/.test(url.pathname)&&url.search===`?v=${CACHE.slice('vacleaner-manager-'.length)}`;}
async function readCached(request){try{return await (await caches.open(CACHE)).match(request,{ignoreSearch:false})}catch{return undefined}}
async function storeResponse(request,response){try{const copy=response.clone();await (await caches.open(CACHE)).put(request,copy)}catch{/* Cache quota/unavailability must not discard a successful response. */}}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const documentRequest=request.mode==='navigate'||request.destination==='document';
  const managed=documentRequest||url.pathname.startsWith('/admin/')||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/_next/static/');
  if(!managed)return;
  event.respondWith((async()=>{
    if(!documentRequest&&isBuildAsset(url)){
      const cached=await readCached(request);
      if(cached)return cached;
    }
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response?.ok)event.waitUntil(storeResponse(request,response));
      return response;
    }catch{
      const cached=await readCached(request);
      if(cached)return cached;
      if(documentRequest){const fallback=await readCached(FALLBACK);if(fallback)return fallback;}
      return new Response('Офлайн',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
self.addEventListener('notificationclick',event=>{event.notification.close();const data=event.notification.data||{};const relative=data.url||'/admin/bronuvannia/';const target=new URL(relative,self.location.origin);if(data.bookingId&&!target.searchParams.get('booking'))target.searchParams.set('booking',String(data.bookingId));event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(client=>{try{return new URL(client.url).origin===self.location.origin}catch{return false}});if(existing){try{if('navigate' in existing)await existing.navigate(target.href)}catch{}try{existing.postMessage({type:'VACLEANER_OPEN_BOOKING',url:target.href,bookingId:data.bookingId||target.searchParams.get('booking')||''})}catch{}if('focus' in existing)await existing.focus();return;}const opened=await self.clients.openWindow?.(target.href);try{opened?.postMessage({type:'VACLEANER_OPEN_BOOKING',url:target.href,bookingId:data.bookingId||target.searchParams.get('booking')||''})}catch{}})());});
self.addEventListener('push',event=>{let data={};try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||''}}const notificationData=data.data&&typeof data.data==='object'?data.data:{url:'/admin/bronuvannia/'};event.waitUntil(self.registration.showNotification(data.title||'VAcleaner',{body:data.body||'Нова подія в адмінці',icon:'/admin/icon-192.png',badge:'/admin/icon-192.png',tag:data.tag||'vacleaner-notification',renotify:true,data:notificationData}));});
