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
  const registers=[],prompts=[],warnings=[],events={},online=[],serviceEvents={},reloads=[];
  const worker=(url,state='activated')=>({scriptURL:url,state,listeners:[],
    addEventListener(name,fn){if(name==='statechange')this.listeners.push(fn)},
    removeEventListener(name,fn){if(name==='statechange')this.listeners=this.listeners.filter(listener=>listener!==fn)},
    postMessage(){activations++},emit(){for(const fn of this.listeners)fn()}});
  const registration={scope,active:activeUrl?worker(activeUrl):null,installing:null,waiting:null,
    addEventListener:(name,fn)=>{events[name]=fn},
    update(){updates++;return offline?Promise.reject(new TypeError('offline')):update.promise}};
  const legacyRoot={scope:origin+'/',unregister:async()=>{rootRemovals++}},foreign={scope:origin+'/other/',unregister:async()=>{foreignRemovals++}};
  const list=existing?[legacyRoot,foreign,registration]:[legacyRoot,foreign];
  const context={URL,console:{warn:(...args)=>warnings.push(args)},location:{origin},pwaRegistration:null,pwaUpdateRequested:false,pwaWaitingWorker:registration.active,
    navigator:{serviceWorker:{controller:registration.active,getRegistrations:async()=>list,
      async register(url,options){registers.push({url,scope:options.scope});if(offline)throw new TypeError('offline');return registration},addEventListener(name,callback){serviceEvents[name]=callback}}},
    window:{addEventListener:(name,fn)=>{if(name==='online')online.push(fn)}},document:{visibilityState:'visible',addEventListener(){}},
    showPwaUpdatePrompt:w=>prompts.push(w),reloadPwaAfterUpdate(){if(!context.pwaUpdateRequested)throw Error('Unexpected automatic reload');reloads.push(context.navigator.serviceWorker.controller?.state)}};
  const boot=async build=>{
    vm.createContext(context);
    vm.runInContext(registrationSource.replace(/\/admin\/sw\.js\?v=\d+/, '/admin/sw.js?v='+build)+';globalThis.run=registerPwa;',context);
    await context.run();
  };
  return{boot,registration,registers,prompts,warnings,online,worker,reloads,context,
    controllerChange(){serviceEvents.controllerchange()},
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

await check('baseline controllerchange reproduces reload while the controller is still activating',async()=>{
  const before=fs.readFileSync('scripts/fixtures/pwa-register-before-activation-guard.js','utf8').match(/^async function registerPwa\(.*$/m)[0];
  const h=harness({registrationSource:before});await h.boot(4367);
  h.context.pwaUpdateRequested=true;h.registration.active.state='activating';h.controllerChange();
  assert.deepEqual(h.reloads,['activating']);
});
for(const state of ['installing','installed','activating','redundant']){
  await check('requested controllerchange cannot reload a '+state+' controller',async()=>{
    const h=harness();await h.boot(4368);h.context.pwaUpdateRequested=true;
    h.registration.active.state=state;h.controllerChange();assert.deepEqual(h.reloads,[]);
    h.registration.active.state='activated';h.controllerChange();assert.deepEqual(h.reloads,['activated']);
  });
}
await check('an unrequested controllerchange cannot reload an activated controller',async()=>{
  const h=harness();await h.boot(4368);h.controllerChange();assert.deepEqual(h.reloads,[]);
});
await check('a controllerchange without a controller cannot reload or throw',async()=>{
  const h=harness({activeUrl:null});await h.boot(4368);h.context.pwaUpdateRequested=true;
  h.controllerChange();assert.deepEqual(h.reloads,[]);
});
await check('an activated foreign controller cannot acknowledge the requested worker',async()=>{
  const h=harness();await h.boot(4368);h.context.pwaUpdateRequested=true;
  const target=h.worker(h.registration.active.scriptURL,'activated');h.context.pwaWaitingWorker=target;
  h.controllerChange();assert.deepEqual(h.reloads,[]);
  h.context.navigator.serviceWorker.controller=target;h.controllerChange();assert.deepEqual(h.reloads,['activated']);
});
await check('a missing requested target cannot be acknowledged by an activated controller',async()=>{
  const h=harness();await h.boot(4368);h.context.pwaUpdateRequested=true;h.context.pwaWaitingWorker=null;
  h.controllerChange();assert.deepEqual(h.reloads,[]);
});

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
// Run the actual prompt handlers with explicit worker events and a virtual
// deadline. No browser, network, real storage or wall-clock sleep is involved.
async function promptHarness({legacyTimeout=false}={}){
  const h=harness();await h.boot(4369);
  const storage=new Map([['synthetic-draft','preserve-me']]),timers=new Map(),toasts=[],navigation=[],messages=[];
  const classes=()=>{const values=new Set();return{add:(...items)=>items.forEach(x=>values.add(x)),remove:(...items)=>items.forEach(x=>values.delete(x)),contains:x=>values.has(x)}};
  let current=null,serial=0,formOpen=false,postError=false;
  const target=h.worker(h.registration.active.scriptURL,'installed');
  target.postMessage=message=>{messages.push(message);if(postError)throw new Error('synthetic postMessage failure')};
  Object.assign(h.context,{PWA_BUILD:'4369',PWA_UPDATE_FALLBACK_MS:8000,pwaWaitingWorker:null,pwaReloading:false,pwaUpdateRequested:false,pwaUpdateFallbackTimer:0,
    clearTimeout:id=>timers.delete(id),toast:message=>toasts.push(message),sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
  h.context.location.reload=()=>navigation.push(h.context.navigator.serviceWorker.controller);
  h.context.window.setTimeout=(fn,ms)=>{timers.set(++serial,{fn,ms});return serial};
  Object.assign(h.context.document,{
    documentElement:{classList:classes()},
    querySelector:selector=>selector==='.pwa-update-prompt'?current:selector==='#layer form'&&formOpen?{}:null,
    createElement:()=>{const later={disabled:false,textContent:'Пізніше'},now={disabled:false,textContent:'Оновити зараз'},node={classList:classes(),style:{},isConnected:false,setAttribute(){},querySelector:selector=>selector==='.pwa-update-later'?later:now,remove(){node.isConnected=false;if(current===node)current=null}};return node},
    body:{appendChild:node=>{current=node;node.isConnected=true}}
  });
  let promptSource=fs.readFileSync('assets/admin-v250.js','utf8');
  promptSource=promptSource.slice(promptSource.indexOf('function removePwaUpdatePrompt('),promptSource.indexOf('async function registerPwa('));
  if(legacyTimeout){
    const currentTimeout='window.setTimeout(()=>{reloadWhenActivated();if(!pwaReloading)recover()},PWA_UPDATE_FALLBACK_MS)';
    assert.equal(promptSource.split(currentTimeout).length,2);
    promptSource=promptSource.replace(currentTimeout,'window.setTimeout(reloadPwaAfterUpdate,PWA_UPDATE_FALLBACK_MS)');
  }
  vm.runInContext(promptSource,h.context);h.context.showPwaUpdatePrompt(target);
  return{...h,target,storage,timers,toasts,navigation,messages,get node(){return current},
    get now(){return current.querySelector('.pwa-update-now')},get later(){return current.querySelector('.pwa-update-later')},
    set formOpen(value){formOpen=value},set postError(value){postError=value},
    expire(){assert.equal(timers.size,1);const[id,timer]=timers.entries().next().value;assert.equal(timer.ms,8000);timers.delete(id);timer.fn()},
    controlTarget(){h.context.navigator.serviceWorker.controller=target},
    assertRecovered(){assert.equal(navigation.length,0,'unconfirmed activation must not reload');assert.equal(h.context.pwaUpdateRequested,false);assert.equal(timers.size,0);assert.equal(target.listeners.length,0);assert.equal(current.querySelector('.pwa-update-now').disabled,false);assert.equal(current.querySelector('.pwa-update-later').disabled,false);assert.equal(h.context.document.documentElement.classList.contains('pwa-update-transition'),false);assert.match(toasts.at(-1),/Оновлення не завершено/);assert.equal(storage.get('synthetic-draft'),'preserve-me')}
  };
}
await check('the original unconditional fallback violates the no-unconfirmed-navigation contract',async()=>{
  const h=await promptHarness({legacyTimeout:true});h.now.onclick();h.expire();
  assert.throws(()=>h.assertRecovered(),/unconfirmed activation must not reload/);assert.equal(h.navigation.length,1);
});
await check('Later dismisses without activation and suppresses the same waiting-worker prompt',async()=>{
  const h=await promptHarness();h.later.onclick();assert.equal(h.node,null);assert.equal(h.messages.length,0);assert.equal(h.timers.size,0);
  h.context.showPwaUpdatePrompt(h.target);assert.equal(h.node,null);assert.equal(h.storage.get('synthetic-draft'),'preserve-me');
});
await check('rapid duplicate update callbacks dispatch one activation and reload once after target acknowledgement',async()=>{
  const h=await promptHarness();h.now.onclick();h.now.onclick();assert.equal(h.messages.length,1);assert.equal(h.messages[0].type,'SKIP_WAITING');assert.equal(h.now.disabled,true);assert.equal(h.later.disabled,true);
  assert.equal(h.node.style.pointerEvents,'auto','pending panel must shield underlying business actions from the next tap');
  h.target.state='activating';h.controlTarget();h.target.emit();h.controllerChange();assert.equal(h.navigation.length,0);
  h.target.state='activated';h.target.emit();h.controllerChange();assert.equal(h.navigation.length,1);assert.equal(h.timers.size,0);assert.equal(h.target.listeners.length,0);
});
await check('missing activation at the unchanged deadline restores a usable prompt without navigation',async()=>{
  const h=await promptHarness();h.now.onclick();h.expire();h.assertRecovered();assert.equal(h.node.style.pointerEvents,'');h.later.onclick();assert.equal(h.node,null);assert.equal(h.navigation.length,0);
});
await check('an explicit retry after timeout succeeds without accumulating activation listeners',async()=>{
  const h=await promptHarness();h.now.onclick();h.expire();h.assertRecovered();h.now.onclick();h.now.onclick();assert.equal(h.messages.length,2);assert.equal(h.target.listeners.length,1);
  h.target.state='activated';h.controlTarget();h.target.emit();assert.equal(h.navigation.length,1);assert.equal(h.target.listeners.length,0);
});
await check('late activation after timeout cannot reload; an already-activated target needs explicit acceptance',async()=>{
  const h=await promptHarness();h.now.onclick();h.expire();h.assertRecovered();h.target.state='activated';h.controlTarget();h.target.emit();h.controllerChange();assert.equal(h.navigation.length,0);
  h.now.onclick();assert.equal(h.navigation.length,1);assert.equal(h.messages.length,1);assert.equal(h.target.listeners.length,0);
});
await check('postMessage failure recovers honestly and allows a new attempt',async()=>{
  const h=await promptHarness();h.postError=true;h.now.onclick();h.assertRecovered();assert.equal(h.warnings.length,1);
  h.postError=false;h.now.onclick();assert.equal(h.messages.length,2);h.target.state='activated';h.controlTarget();h.target.emit();assert.equal(h.navigation.length,1);
});
await check('an activated waiting reference cannot acknowledge a different activated controller at timeout',async()=>{
  const h=await promptHarness();h.now.onclick();h.target.state='activated';h.target.emit();h.controllerChange();assert.equal(h.navigation.length,0);h.expire();h.assertRecovered();
});
await check('a redundant worker cannot turn a failed attempt into reload',async()=>{
  const h=await promptHarness();h.now.onclick();h.target.state='redundant';h.controlTarget();h.target.emit();h.controllerChange();h.expire();h.assertRecovered();
});
await check('an open layer form retains the existing update protection and dispatches nothing',async()=>{
  const h=await promptHarness();h.formOpen=true;h.now.onclick();assert.equal(h.messages.length,0);assert.equal(h.navigation.length,0);assert.equal(h.timers.size,0);assert.match(h.toasts.at(-1),/Закрийте або збережіть/);
});
console.log(JSON.stringify({passed,failed:0,browserLaunched:false}));
