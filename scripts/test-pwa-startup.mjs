import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/admin-v250.js','utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
let passed=0;
async function test(name,run){await run();console.log('PASS',name);passed++}
function startupHarness(){
  const settings=deferred(),reads=[],listeners=[],timers=new Set();let settingsCalls=0,recalculations=0,renders=0;
  const context={console,Date,JSON,Promise,
    state:{bookings:[],expenses:[],calendar:[],customers:[],campaigns:[],referrals:{},dataLoaded:false,view:'bookings'},
    initialDataLoadPromise:null,fullDataRefreshPromise:null,liveBookingSyncBusy:false,lastLiveBookingFingerprint:'',liveBookingSyncTimer:0,LIVE_BOOKING_SYNC_MS:15000,
    document:{visibilityState:'visible',addEventListener:(...args)=>listeners.push(args)},navigator:{onLine:true},
    window:{setInterval:fn=>{timers.add(fn);return fn},addEventListener:(...args)=>listeners.push(args)},clearInterval:fn=>timers.delete(fn),
    $:()=>null,getSession:()=>({access_token:'fixture'}),todayIso:()=> '2026-10-21',
    loadGlobalSlots:()=>{settingsCalls++;return settings.promise},
    recalcCalendarSlots:days=>{assert.equal(settings.ready,true,'settings must settle before calendar calculation');recalculations++;return days},renderBadges:()=>{},renderAfterLiveSync:()=>{renders++},renderLoadError:()=>{},toast:()=>{}};
  context.invokeData=context.invoke=body=>{const result=deferred();reads.push({body,...result});return result.promise};
  vm.createContext(context);
  const initial=source.slice(source.indexOf('async function load('),source.indexOf('let referralAnalyticsPromise='));
  const live=source.slice(source.indexOf('async function syncBookingsLive('),source.indexOf('const ico='));
  const fingerprint=source.match(/^function liveBookingFingerprint.*$/m)[0];
  vm.runInContext(`${initial}\n${fingerprint}\n${live}\nglobalThis.api={loadStartupData,syncBookingsLive,startLiveBookingSync};`,context);
  return{...context.api,context,settings,reads,listeners,timers,get settingsCalls(){return settingsCalls},get recalculations(){return recalculations},get renders(){return renders},complete(){settings.ready=true;settings.resolve();for(const read of reads)read.resolve({bookings:[{id:'fixture',status:'confirmed'}],expenses:[{amount:10}],days:[{date:'2026-10-21'}],customers:[{id:'customer'}],campaigns:[],rewards:[]})}};
}

await test('settings and all five reads begin together; repeated startup joins one promise',async()=>{
  const h=startupHarness(),first=h.loadStartupData();
  assert.equal(h.reads.length,5);assert.equal(h.settingsCalls,1);assert.equal(h.loadStartupData(),first);
  for(const read of h.reads)read.resolve({bookings:[{id:'fixture'}],days:[]});
  await Promise.resolve();await Promise.resolve();assert.equal(h.context.state.dataLoaded,false);
  h.settings.ready=true;h.settings.resolve();await first;
  assert.equal(h.context.state.dataLoaded,true);assert.equal(h.recalculations,1);
});
await test('focus, pageshow and interval cannot overlap startup; later focus remains live',async()=>{
  const h=startupHarness();h.startLiveBookingSync();const loading=h.loadStartupData();
  for(const [,listener]of h.listeners)listener();for(const timer of h.timers)timer();
  await h.syncBookingsLive();assert.equal(h.reads.length,5);assert.equal(h.settingsCalls,1);
  h.complete();await loading;
  const live=h.syncBookingsLive();assert.equal(h.reads.length,6);assert.equal(h.reads.at(-1).body.action,'list');
  h.reads.at(-1).resolve({bookings:h.context.state.bookings,expenses:h.context.state.expenses});await live;
  assert.equal(h.renders,0,'unchanged first live response must not redraw the initial view');
});
await test('repeated startup binds one set of activation handlers and one interval',async()=>{
  const h=startupHarness();h.startLiveBookingSync();h.startLiveBookingSync();h.startLiveBookingSync();
  assert.equal(h.listeners.length,3);assert.equal(h.timers.size,1);
});
await test('failed initial read preserves last good state and permits a complete retry',async()=>{
  const h=startupHarness(),first=h.loadStartupData();h.settings.ready=true;h.settings.resolve();
  h.reads[0].reject(new Error('outage'));for(const read of h.reads.slice(1))read.resolve({});
  await assert.rejects(first,/outage/);assert.equal(h.context.state.dataLoaded,false);
  const retry=h.loadStartupData();assert.equal(h.reads.length,10);assert.equal(h.settingsCalls,2);h.complete();await retry;
  assert.equal(h.context.state.dataLoaded,true);
});
await test('optional campaign/referral outages retain the established fallback',async()=>{
  const h=startupHarness(),loading=h.loadStartupData();h.settings.ready=true;h.settings.resolve();
  for(const read of h.reads)if(['campaigns','referrals_expiring'].includes(read.body.action))read.reject(new Error('optional outage'));else read.resolve({});
  await loading;assert.equal(h.context.state.dataLoaded,true);assert.equal(h.context.state.campaigns.length,0);
});

function registrationHarness({installing=null,waiting=null,offline=false,existing=true,controlled=true}={}){
  const events={},online=[],prompts=[],warnings=[];let updates=0,activation=0;
  const registration={scope:'https://fixture.local/admin/',installing,waiting,addEventListener:(name,fn)=>{events[name]=fn},update:async()=>{updates++;if(offline)throw new TypeError('offline')}};
  const context={console:{warn:(...args)=>warnings.push(args)},location:{origin:'https://fixture.local'},pwaRegistration:null,
    navigator:{serviceWorker:{controller:controlled?{}:null,getRegistrations:async()=>existing?[registration]:[],register:async()=>{if(offline)throw new TypeError('offline');return registration},addEventListener:()=>{}}},
    document:{visibilityState:'visible',addEventListener:()=>{}},window:{addEventListener:(name,fn)=>{if(name==='online')online.push(fn)}},showPwaUpdatePrompt:worker=>prompts.push(worker)};
  vm.createContext(context);vm.runInContext(source.match(/^async function registerPwa\(.*$/m)[0]+';globalThis.run=registerPwa;',context);
  const worker=(state='installing')=>({state,listeners:[],addEventListener(name,fn){if(name==='statechange')this.listeners.push(fn)},postMessage(){activation++},emit(){for(const fn of this.listeners)fn()}});
  return{run:context.run,registration,events,online,prompts,warnings,worker,get updates(){return updates},get activation(){return activation},set offline(value){offline=value}};
}
await test('registration observes a worker whose updatefound event already fired',async()=>{
  const h=registrationHarness(),worker=h.worker();h.registration.installing=worker;
  await h.run();assert.equal(h.prompts.length,0);worker.state='installed';worker.emit();
  assert.equal(h.prompts[0],worker);assert.equal(h.activation,0);
});
await test('an already-installed installing worker is inspected immediately',async()=>{
  const h=registrationHarness(),worker=h.worker('installed');h.registration.installing=worker;
  await h.run();assert.equal(h.prompts[0],worker);assert.equal(h.activation,0);
});
await test('a first install without an existing controller never becomes an update prompt',async()=>{
  const h=registrationHarness({controlled:false}),worker=h.worker('installed');h.registration.installing=worker;
  await h.run();assert.equal(h.prompts.length,0);assert.equal(h.activation,0);
});
await test('an existing waiting worker retains the explicit consent prompt',async()=>{
  const h=registrationHarness(),worker=h.worker('installed');h.registration.waiting=worker;
  await h.run();assert.equal(h.prompts[0],worker);assert.equal(h.activation,0);
});
await test('future updatefound events observe each worker only once',async()=>{
  const h=registrationHarness();await h.run();const worker=h.worker();h.registration.installing=worker;
  h.events.updatefound();h.events.updatefound();assert.equal(worker.listeners.length,1);
  worker.state='installed';worker.emit();assert.equal(h.prompts.length,1);assert.equal(h.activation,0);
});
await test('offline registration failure keeps existing admin lifecycle and online retry',async()=>{
  const h=registrationHarness({offline:true}),worker=h.worker();h.registration.installing=worker;
  await h.run();assert.equal(h.online.length,1);assert.equal(h.updates,1);
  h.offline=false;h.online[0]();await Promise.resolve();assert.equal(h.updates,2);
  worker.state='installed';worker.emit();assert.equal(h.prompts[0],worker);assert.equal(h.activation,0);
});
await test('failed registration without an existing admin worker remains a handled warning',async()=>{
  const h=registrationHarness({offline:true,existing:false});await h.run();
  assert.equal(h.prompts.length,0);assert.equal(h.updates,0);assert.equal(h.warnings.length,1);
});

const worker=fs.readFileSync('admin/sw.js','utf8'),build=worker.match(/vacleaner-manager-(\d+)/)[1];
await test('install precache covers every shipped admin JS/CSS without a second online launch',async()=>{
  const context={self:{addEventListener:()=>{}}};vm.runInNewContext(worker+';globalThis.core=CORE;',context);
  const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
  const required=[...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css)\?v=\d+)["']/g)].map(match=>match[1]);
  assert.ok(required.length>=35);assert.deepEqual(required.filter(url=>!context.core.includes(url)),[]);
});
function swHarness(){
  const handlers={},entries=new Map(),network=[],waiting=[];let offline=false,quota=false;
  const key=request=>new URL(typeof request==='string'?request:request.url,'https://fixture.local').href;
  const cache={match:async request=>entries.get(key(request))?.clone(),put:async(request,response)=>{if(quota)throw new Error('quota');entries.set(key(request),response)},addAll:async()=>{}};
  const context={URL,Response,console,caches:{open:async()=>cache},self:{location:{origin:'https://fixture.local'},addEventListener:(event,fn)=>{handlers[event]=fn}},fetch:async(request,options)=>{network.push({url:key(request),options});if(offline)throw new TypeError('offline');return new Response('network '+key(request),{status:200})}};
  vm.runInNewContext(worker,context);
  return{entries,network,set offline(value){offline=value},set quota(value){quota=value},async request(path,options={}){let response;
    handlers.fetch({request:{url:key(path),method:'GET',...options},respondWith:value=>{response=value},waitUntil:value=>waiting.push(value)});
    const result=await response;await Promise.all(waiting.splice(0));return result;
  },seed:(path,text)=>entries.set(key(path),new Response(text))};
}
await test('warm current-build JS and CSS use exact cached bytes without network',async()=>{
  const h=swHarness();for(const file of ['admin-v250.js','admin-v430.css']){
    const path=`/assets/${file}?v=${build}`;await h.request(path);const count=h.network.length;
    assert.match(await (await h.request(path)).text(),/network/);assert.equal(h.network.length,count);
  }
});
await test('HTML always attempts network and offline navigation uses the current shell',async()=>{
  const h=swHarness();h.seed('/admin/bronuvannia/','old shell');
  assert.match(await(await h.request('/admin/bronuvannia/',{mode:'navigate'})).text(),/^network/);assert.equal(h.network.length,1);
  h.offline=true;assert.match(await(await h.request('/admin/unknown/',{mode:'navigate'})).text(),/^network/);
});
await test('different builds, unversioned assets and additional query parameters are network-first',async()=>{
  const h=swHarness();for(const path of ['/assets/admin-v250.js',`/assets/admin-v250.js?v=${Number(build)+1}`,`/assets/admin-v250.js?v=${build}&extra=1`]){
    h.seed(path,'cached');const count=h.network.length;assert.match(await(await h.request(path)).text(),/^network/);assert.equal(h.network.length,count+1);
  }
});
await test('API, cross-origin GETs and all mutations bypass the worker cache',async()=>{
  const h=swHarness();for(const [url,options]of [['/functions/v1/finance',{}],['https://api.example/read',{}],['/admin/action',{method:'POST'}]])assert.equal(await h.request(url,options),undefined);
  assert.equal(h.network.length,0);assert.equal(h.entries.size,0);
});
await test('offline cache miss is an explicit 503, never another build asset',async()=>{
  const h=swHarness();h.offline=true;h.seed('/assets/admin-v250.js?v=1','wrong build');
  assert.equal((await h.request(`/assets/admin-v250.js?v=${build}`)).status,503);
});
await test('cache write failure retains a successful network response',async()=>{
  const h=swHarness();h.quota=true;assert.equal((await h.request(`/assets/admin-v250.js?v=${build}`)).status,200);
});
await test('runtime response is cloned before asynchronous cache open and browser consumption',async()=>{
  const gate=deferred(),handlers={},waiting=[];let cached,response;
  const network=new Response('runtime bytes');
  vm.runInNewContext(worker,{URL,Response,console,
    caches:{open:async()=>{await gate.promise;return{put:async(_request,copy)=>{cached=await copy.text()}}}},
    self:{location:{origin:'https://fixture.local'},addEventListener:(name,handler)=>{handlers[name]=handler}},fetch:async()=>network});
  handlers.fetch({request:{method:'GET',url:'https://fixture.local/assets/runtime.js'},respondWith:value=>{response=value},waitUntil:value=>waiting.push(value)});
  assert.equal(await(await response).text(),'runtime bytes');
  gate.resolve();await Promise.all(waiting);assert.equal(cached,'runtime bytes');
});
console.log(`PWA startup/cache: ${passed}/${passed}`);
