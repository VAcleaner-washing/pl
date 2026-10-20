import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const waiverRuntime=fs.readFileSync(new URL('../assets/admin-v4319-prepayment-waiver.js',import.meta.url),'utf8');
const implementation=runtime.slice(runtime.indexOf('async function refreshNetwork('),runtime.indexOf('const invoke=(body'));
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
function harness(fetcher,initial={access_token:'old-access',refresh_token:'refresh-1'},options={}){
  const storage=options.storage||{session:initial};
  const calls=[];
  const context={console,Response,Headers,Date,atob,setTimeout,navigator:{onLine:true,locks:options.locks},window:{},SUPABASE:'https://auth.example',KEY:'public-test-key',refreshPromise:null,
    SETTINGS_API:'https://api.example/settings',DOCUMENT_API:'https://api.example/documents',PUSH_API:'https://api.example/push',
    saveCatalogLocal:()=>{},saveSlots:()=>{},saveDepositRulesLocal:()=>{},saveDeliveryPricingLocal:v=>v,saveEquipmentBaselinesLocal:v=>v,
    currentAdminAlias:()=> 'vacleaner',pushDeviceId:()=> 'fixture-device',normalizePhone:phone=>phone,validateDocumentFile:()=>'',documentMime:()=> 'image/jpeg',
    getSession:()=>storage.session,sessionPersistent:()=>true,saveSession:next=>{storage.session=next},
    fetch:async(url,options={})=>{calls.push({url,options});return fetcher(url,options)}};
  vm.createContext(context);
  const adapters=['saveGlobalCatalog','saveGlobalSlots','saveGlobalDepositRules','saveGlobalDeliveryPricing','saveGlobalEquipmentBaselines','documentRequest','pushInvoke'];
  const source=adapters.map(name=>runtime.match(new RegExp(`^async function ${name}\\(.*$`,'m'))?.[0]).join('\n');
  const waiverExport=runtime.match(/^window.VACLEANER_CONFIRM_WITHOUT_PREPAYMENT=.*$/m)?.[0]||'';
  const waiverAdapter=waiverRuntime.match(/^async function confirmWithoutPrepayment\(.*$/m)?.[0]||'';
  vm.runInContext(`${implementation};${source};${waiverExport};${waiverAdapter};globalThis.api={invokeAt,refresh,${adapters.join(',')},waiver:confirmWithoutPrepayment};`,context);
  return{...context.api,calls,getSession:()=>storage.session,setSession:next=>{storage.session=next}};
}
const cases=[];
const test=async(name,run)=>{try{await run();cases.push({name,ok:true});console.log('PASS',name)}catch(error){cases.push({name,ok:false});console.error('FAIL',name,error.message)}};

await test('late 401 reuses the token already refreshed by a sibling request',async()=>{
  const late=deferred();let refreshes=0;
  const api=harness(async(url,options)=>{
    if(url.includes('grant_type=refresh_token')){refreshes++;return json({access_token:'new-access',refresh_token:'refresh-2'})}
    if(options.headers.Authorization==='Bearer old-access'){if(url.endsWith('/slow'))await late.promise;return json({error:'unauthorized'},401)}
    return json({ok:true});
  });
  const slow=api.invokeAt('https://api.example/slow',{action:'list'});
  await api.invokeAt('https://api.example/fast',{action:'list'});
  late.resolve();await slow;
  assert.equal(refreshes,1,'a delayed response must not rotate the newly stored refresh token again');
});
await test('terminal refresh rejection reaches the existing sign-in path as status 401',async()=>{
  const api=harness(async url=>url.includes('grant_type=refresh_token')?json({error:'invalid_grant',error_code:'refresh_token_not_found'},400):json({error:'unauthorized'},401));
  await assert.rejects(api.invokeAt('https://api.example/list',{action:'list'}),error=>error.status===401);
});
await test('temporary auth outage preserves the remembered session and does not replay a mutation',async()=>{
  let writes=0;
  const api=harness(async url=>{if(url.includes('grant_type=refresh_token'))return json({error:'unexpected_failure'},503);writes++;return json({error:'unauthorized'},401)});
  await assert.rejects(api.invokeAt('https://api.example/create',{action:'create'}),error=>error.status===503);
  assert.equal(api.getSession().refresh_token,'refresh-1');assert.equal(writes,1);
});
await test('an in-flight refresh must not restore a session after logout',async()=>{
  const response=deferred(),started=deferred();
  const api=harness(async()=>{started.resolve();await response.promise;return json({access_token:'new-access',refresh_token:'refresh-2'})});
  const refresh=api.refresh();await started.promise;api.setSession(null);response.resolve();
  await refresh.catch(()=>{});assert.equal(api.getSession(),null);
});

await test('an in-flight refresh does not replace a newly signed-in account',async()=>{
  const response=deferred(),started=deferred(),replacement={access_token:'other-account',refresh_token:'other-refresh'};
  const api=harness(async()=>{started.resolve();await response.promise;return json({access_token:'new-access',refresh_token:'refresh-2'})});
  const refresh=api.refresh();await started.promise;api.setSession(replacement);response.resolve();
  await assert.rejects(refresh,error=>error.status===409);assert.equal(api.getSession(),replacement);
});
for(const expiry of ['expires_at','jwt'])await test(`expired ${expiry} is refreshed before sending a protected request`,async()=>{
  const exp=Math.floor(Date.now()/1000)-60,token=expiry==='jwt'?`header.${Buffer.from(JSON.stringify({exp})).toString('base64url')}.signature`:'old-access';
  const api=harness(async(url,options)=>{if(url.includes('grant_type=refresh_token'))return json({access_token:'new-access',refresh_token:'refresh-2'});assert.equal(options.headers.Authorization,'Bearer new-access');return json({ok:true})},{access_token:token,refresh_token:'refresh-1',...(expiry==='expires_at'?{expires_at:exp}:{})});
  await api.invokeAt('https://api.example/edit',{action:'edit',bookingId:'fixture'});
  assert.equal(api.calls.filter(c=>c.url.includes('grant_type=refresh_token')).length,1);
  assert.equal(api.calls.filter(c=>c.url.includes('/edit')).length,1);
});
await test('a fresh access token never triggers a refresh',async()=>{
  const api=harness(async url=>{assert.ok(!url.includes('grant_type=refresh_token'));return json({ok:true})},{access_token:'fresh',refresh_token:'refresh-1',expires_at:Date.now()/1000+3600});
  await api.invokeAt('https://api.example/list',{action:'list'});assert.equal(api.calls.length,1);
});
await test('a second 401 is returned without an endless retry loop',async()=>{
  const api=harness(async url=>url.includes('grant_type=refresh_token')?json({access_token:'new-access',refresh_token:'refresh-2'}):json({error:'unauthorized'},401));
  await assert.rejects(api.invokeAt('https://api.example/list',{}),error=>error.status===401);
  assert.equal(api.calls.length,3);
});
for(const status of [403,500,503])await test(`protected ${status} response is never automatically replayed`,async()=>{
  const api=harness(async()=>json({error:'service_error'},status));
  await assert.rejects(api.invokeAt('https://api.example/create',{action:'create'}),error=>error.status===status);assert.equal(api.calls.length,1);
});
await test('lost mutation response is not replayed and session survives',async()=>{
  const api=harness(async()=>{throw new TypeError('fixture disconnected')});
  await assert.rejects(api.invokeAt('https://api.example/create',{action:'create'}),error=>error.status===0);
  assert.equal(api.calls.length,1);assert.equal(api.getSession().refresh_token,'refresh-1');
});
for(const status of [429,503])await test(`proactive refresh ${status} prevents any mutation and keeps the session`,async()=>{
  const api=harness(async url=>{assert.ok(url.includes('grant_type=refresh_token'));return json({error:'temporary_failure'},status)},{access_token:'expired',refresh_token:'refresh-1',expires_at:1});
  await assert.rejects(api.invokeAt('https://api.example/create',{action:'create'}),error=>error.status===status);
  assert.equal(api.calls.length,1);assert.equal(api.getSession().refresh_token,'refresh-1');
});
await test('a malformed successful refresh cannot overwrite stored tokens',async()=>{
  const api=harness(async()=>json({access_token:'partial'}));
  await assert.rejects(api.refresh(),error=>error.status===502);assert.equal(api.getSession().refresh_token,'refresh-1');
});
await test('persistent tabs serialize refreshes and reuse the same rotated token',async()=>{
  let queue=Promise.resolve(),refreshes=0;
  const locks={request:(_name,_options,run)=>{const next=queue.then(run);queue=next.catch(()=>{});return next}};
  const storage={session:{access_token:'old-access',refresh_token:'refresh-1'}};
  const fetcher=async(url,options)=>{
    if(url.includes('grant_type=refresh_token')){refreshes++;await new Promise(r=>setTimeout(r,5));return json({access_token:'new-access',refresh_token:'refresh-2'})}
    return options.headers.Authorization==='Bearer old-access'?json({error:'unauthorized'},401):json({ok:true});
  };
  const first=harness(fetcher,undefined,{storage,locks}),second=harness(fetcher,undefined,{storage,locks});
  await Promise.all([first.invokeAt('https://api.example/list',{}),second.invokeAt('https://api.example/list',{})]);
  assert.equal(refreshes,1);assert.equal(storage.session.refresh_token,'refresh-2');
});
for(const data of [{code:'refresh_token_already_used'},{error:'invalid_grant'},{error_code:'session_not_found'}])await test(`terminal Auth format ${JSON.stringify(data)} reaches sign-in`,async()=>{
  const api=harness(async()=>json(data,400));await assert.rejects(api.refresh(),error=>error.status===401);
});
for(const [name,args] of [
  ['saveGlobalCatalog',[{products:{}}]],['saveGlobalSlots',[{morningStart:'08:00'}]],['saveGlobalDepositRules',[{puzzi:1000}]],
  ['saveGlobalDeliveryPricing',[{local:250}]],['saveGlobalEquipmentBaselines',[{puzzi:{amount:1000}}]],
  ['documentRequest',['upload',{phone:'380000000000',file:{name:'fixture.jpg'}}]],['pushInvoke',[{action:'rename',deviceLabel:'Fixture'}]],
  ['waiver',[{action:'confirm_without_prepayment',bookingCode:'FIXTURE',reason:'same_day_or_agreement'}]],
])await test(`${name} shares recovery and preserves the submitted payload`,async()=>{
  const bodies=[];
  const api=harness(async(url,options)=>{
    if(url.includes('grant_type=refresh_token'))return json({access_token:'new-access',refresh_token:'refresh-2'});
    bodies.push(options.body);
    return options.headers.Authorization==='Bearer old-access'?json({error:'unauthorized'},401):json({ok:true});
  });
  await api[name](...args);
  assert.equal(api.calls.filter(c=>c.url.includes('grant_type=refresh_token')).length,1);
  assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);
});

console.log(`Session recovery: ${cases.filter(t=>t.ok).length}/${cases.length}`);
if(cases.some(t=>!t.ok))process.exitCode=1;
