/* VAcleaner v3.0.27 — legacy root service-worker retirement sentinel.
   Public pages are NOT a PWA. The only supported PWA scope is /admin/.
   This worker exists temporarily so old /sw.js registrations can update,
   switch to network-only, unregister themselves, and stop breaking public navigation. */
const RETIRE_MARKER='VACLEANER_ROOT_SW_RETIRE';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  try{await self.clients.claim()}catch{}
  try{await self.registration.unregister()}catch{}
  try{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients)client.postMessage({type:RETIRE_MARKER});
  }catch{}
})())});
self.addEventListener('fetch',event=>{event.respondWith(fetch(event.request))});
