import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/admin-v250.js','utf8').match(/^async function registerPwa\(.*$/m)[0];
const origin='https://fixture.local';
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes});return{promise,resolve}};
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS',name)}
function harness({activeUrl=origin+'/admin/sw.js?v=4346',scope=origin+'/admin/',existing=true,offline=false,registrationSource=source}={}){
  let updates=0,activations=0,rootRemovals=0,foreignRemovals=0,update=deferred();
  const registers=[],prompts=[],warnings=[],events={},online=[];
  const worker=(url,state='activated')=>({scriptURL:url,state,listeners:[],
    addEventListener(name,fn){if(name==='statechange')this.listeners.push(fn)},
    postMessage(){activations++},emit(){for(const fn of this.listeners)fn()}});
  const registration={scope,active:activeUrl?worker(activeUrl):null,installing:null,waiting:null,
    addEventListener:(name,fn)=>{events[name]=fn},
    update(){updates++;return offline?Promise.reject(new TypeError('offline')):update.promise}};
  const legacyRoot={scope:origin+'/',unregister:async()=>{rootRemovals++}},foreign={scope:origin+'/other/',unregister:async()=>{foreignRemovals++}};
  const list=existing?[legacyRoot,foreign,registration]:[legacyRoot,foreign];
  const context={URL,console:{warn:(...args)=>warnings.push(args)},location:{origin},pwaRegistration:null,pwaUpdateRequested:false,
    navigator:{serviceWorker:{controller:registration.active,getRegistrations:async()=>list,
      async register(url,options){registers.push({url,scope:options.scope});if(offline)throw new TypeError('offline');return registration},addEventListener(){}}},
    window:{addEventListener:(name,fn)=>{if(name==='online')online.push(fn)}},document:{visibilityState:'visible',addEventListener(){}},
    showPwaUpdatePrompt:w=>prompts.push(w),reloadPwaAfterUpdate(){throw Error('Unexpected automatic reload')}};
  const boot=async build=>{
    vm.createContext(context);
    vm.runInContext(registrationSource.replace(/\/admin\/sw\.js\?v=\d+/, '/admin/sw.js?v='+build)+';globalThis.run=registerPwa;',context);
    await context.run();
  };
  return{boot,registration,registers,prompts,warnings,online,worker,
    get updates(){return updates},get activations(){return activations},get rootRemovals(){return rootRemovals},get foreignRemovals(){return foreignRemovals},
    set offline(value){offline=value},
    install(build){
      const next=worker(registration.active.scriptURL,'installing');next.fixtureBuild=build;
      registration.installing=next;events.updatefound();
      next.state='installed';registration.waiting=next;next.emit();update.resolve();return next;
    },
    activate(){registration.active=registration.waiting;registration.active.state='activated';registration.waiting=null;registration.installing=null;update=deferred();}
  };
}

await check('actual pre-fix source recreates registration on both stamped app boots',async()=>{
  const before=fs.readFileSync('scripts/fixtures/pwa-register-before-reuse.js','utf8').match(/^async function registerPwa\(.*$/m)[0];
  const h=harness({registrationSource:before});await h.boot(4361);h.install(4361);h.activate();await h.boot(4362);
  assert.equal(h.registers.length,2);assert.equal(h.registers[0].url,'/admin/sw.js?v=4361');assert.equal(h.registers[1].url,'/admin/sw.js?v=4362');
});
await check('deferred upgrade uses the original registration and preserves explicit activation',async()=>{
  const h=harness();await h.boot(4361);
  assert.equal(h.registers.length,0);assert.equal(h.updates,1);assert.equal(h.prompts.length,0);
  const waiting=h.install(4361);await Promise.resolve();
  assert.equal(waiting.scriptURL,origin+'/admin/sw.js?v=4346');assert.equal(h.prompts[0],waiting);
  assert.equal(h.activations,0);assert.equal(h.registration.active.state,'activated');
});
await check('reloading a later stamped app cannot create a second version-URL worker',async()=>{
  const h=harness();await h.boot(4361);h.install(4361);h.activate();
  await h.boot(4362);
  assert.equal(h.registers.length,0);assert.equal(h.updates,2);assert.equal(h.registration.waiting,null);
  assert.equal(h.registration.active.scriptURL,origin+'/admin/sw.js?v=4346');assert.equal(h.activations,0);
});
await check('offline canonical registrations retain update listeners and online recovery',async()=>{
  const h=harness({offline:true});await h.boot(4361);
  assert.equal(h.registers.length,0);assert.equal(h.updates,1);assert.equal(h.online.length,1);
  h.offline=false;h.online[0]();assert.equal(h.updates,2);assert.equal(h.warnings.length,0);
});
for(const activeUrl of [origin+'/admin/other-worker.js?v=1','https://other.invalid/admin/sw.js?v=1','not a worker URL',null]){
  await check('a noncanonical or empty registration cannot bypass canonical registration: '+activeUrl,async()=>{
    const h=harness({activeUrl});await h.boot(4361);
    assert.equal(h.registers.length,1);assert.deepEqual(h.registers[0],{url:'/admin/sw.js?v=4361',scope:'/admin/'});
    assert.equal(h.activations,0);
  });
}
await check('canonical script at a different scope cannot be reused',async()=>{
  const h=harness({scope:origin+'/other/'});await h.boot(4361);assert.equal(h.registers.length,1);
});
await check('an unrelated pending worker prevents reuse of a mixed registration',async()=>{
  const h=harness();h.registration.waiting=h.worker(origin+'/admin/foreign.js','installed');
  await h.boot(4361);assert.equal(h.registers.length,1);assert.equal(h.activations,0);
});
await check('first install registers canonical URL; legacy root cleanup leaves unrelated scope intact',async()=>{
  const h=harness({existing:false});await h.boot(4361);
  assert.equal(h.registers.length,1);assert.equal(h.rootRemovals,1);assert.equal(h.foreignRemovals,0);
});
await check('offline first install remains a handled registration failure',async()=>{
  const h=harness({existing:false,offline:true});await h.boot(4361);
  assert.equal(h.registers.length,1);assert.equal(h.updates,0);assert.equal(h.warnings.length,1);
});
console.log(JSON.stringify({passed,failed:0,browserLaunched:false}));
