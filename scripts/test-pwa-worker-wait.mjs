import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('scripts/pwa_cache_qa.py','utf8');
const monitor=source.match(/WORKER_MONITOR_JS = r'''([\s\S]*?)'''/)[1];
const flag=source.match(/WORKER_FLAG_JS = r'''([\s\S]*?)'''/)[1];
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS',name)}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function harness(phase='ready',build=4346){
  const origin='https://fixture.invalid',frames=new Map(),stores=new Map();let serial=0,registration,controller,urls=[];
  const context={window:{},URL,location:{origin},
    navigator:{serviceWorker:{getRegistration:async()=>registration,get controller(){return controller}}},
    caches:{keys:async()=>[...stores.keys()],open:async key=>({match:async url=>stores.get(key)?.has(url)?{}:undefined})},
    document:{querySelectorAll:()=>urls.map(src=>({src}))},
    requestAnimationFrame:callback=>{frames.set(++serial,callback);return serial},cancelAnimationFrame:id=>frames.delete(id)};
  vm.createContext(context);
  const readFlag=vm.runInContext('('+flag+')',context);
  const begin=()=>vm.runInContext('('+monitor+')('+JSON.stringify({phase,build})+')',context);
  return {context,stores,frames,begin,flag:readFlag,get state(){return context.window.__vacPwaWorkerMonitor},
    configure(target,{count=35,cached=count,oldCache=false,scope=origin+'/admin/'}={}){
      urls=Array.from({length:count},(_,i)=>origin+'/assets/file-'+i+'.js?v='+target);
      registration={scope,active:{scriptURL:origin+'/admin/sw.js?v='+target,state:'activated'},waiting:null,installing:null};
      controller=registration.active;stores.clear();stores.set('vacleaner-manager-'+target,new Set(urls.slice(0,cached)));
      if(oldCache)stores.set('vacleaner-manager-'+(target-1),new Set());
      return registration;
    },
    set controller(value){controller=value},get registration(){return registration},
    async step(){const entry=frames.entries().next().value;assert(entry,'a pending readiness probe must schedule its next animation frame');frames.delete(entry[0]);entry[1]();await flush();}
  };
}

await check('old Playwright truthiness poll accepts Promise<false> without retrying',async()=>{
  let calls=0;const predicate=async()=>{calls++;return false};
  const success=predicate();assert.equal(Boolean(success),true);
  assert.equal(await new Promise(resolve=>{if(success)resolve(success)}),false);assert.equal(calls,1);
});
await check('new Playwright predicate is a synchronous boolean throughout asynchronous probing',async()=>{
  const h=harness();h.begin();assert.equal(h.flag(),false);assert.equal(typeof h.flag(),'boolean');
  await flush();assert.equal(h.state.ready,false);assert.equal(h.state.last.active,null);
  assert.equal(h.frames.size,1);
});
await check('an activated worker with an empty opened cache remains unready until all35 entries exist',async()=>{
  const h=harness();h.configure(4346,{cached:0});h.begin();await flush();
  assert.equal(h.flag(),false);assert.equal(h.state.last.missing.length,35);
  h.configure(4346);await h.step();assert.equal(h.flag(),true);assert.equal(h.frames.size,0);
});
await check('34 matching entries cannot replace the required35 canonical assets',async()=>{
  const h=harness();h.configure(4346,{count:34});h.begin();await flush();assert.equal(h.flag(),false);
});
await check('pending target cache cannot pass while an older manager cache still exists',async()=>{
  const h=harness('ready',4361);h.configure(4361,{count:38,oldCache:true});h.begin();await flush();
  assert.equal(h.flag(),false);assert.equal(h.state.last.olderCaches.length,1);
  h.stores.delete('vacleaner-manager-4360');await h.step();assert.equal(h.flag(),true);
});
await check('controller/active mismatch and foreign worker scope cannot pass',async()=>{
  const h=harness();h.configure(4346);h.controller={scriptURL:'https://fixture.invalid/admin/sw.js?v=4361',state:'activated'};
  h.begin();await flush();assert.equal(h.flag(),false);
  h.configure(4346,{scope:'https://fixture.invalid/'});await h.step();assert.equal(h.flag(),false);
});
await check('waiting condition requires an installed waiting worker, not a truthy Promise',async()=>{
  const h=harness('waiting',4361),reg=h.configure(4361);reg.waiting={scriptURL:reg.active.scriptURL,state:'installing'};
  h.begin();await flush();assert.equal(h.flag(),false);
  reg.waiting.state='installed';await h.step();assert.equal(h.flag(),true);
});
await check('settled condition retains both installing and waiting worker checks',async()=>{
  const h=harness('settled',4361),reg=h.configure(4361);reg.installing={scriptURL:reg.active.scriptURL,state:'installing'};
  h.begin();await flush();assert.equal(h.flag(),false);
  reg.installing=null;reg.waiting={scriptURL:reg.active.scriptURL,state:'installed'};await h.step();assert.equal(h.flag(),false);
  reg.waiting=null;await h.step();assert.equal(h.flag(),true);
});
await check('a superseded monitor cannot publish readiness after cancellation',async()=>{
  const h=harness();h.configure(4346);h.begin();const old=h.state;h.begin();await flush();
  assert.equal(old.cancelled,true);assert.equal(old.ready,false);assert.equal(h.flag(),true);
});
await check('no async truthiness predicates remain and30s Playwright deadline is preserved',async()=>{
  assert(!/wait_for_function\([^\n]*['"]async/.test(source));
  assert(source.includes('page.wait_for_function(WORKER_FLAG_JS, timeout=30000)'));
  assert(source.includes("wait_worker_state(page, 'ready', build)"));
});
console.log(JSON.stringify({passed,failed:0,browserLaunched:false}));
