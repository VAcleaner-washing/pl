import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const arg=name=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1);
const runtimePath=arg('--runtime')||'assets/admin-v250.js';
const source=fs.readFileSync(runtimePath,'utf8'), lines=source.split('\n');
const names=['settingsSaveErrorMessage','saveGlobalCatalog','saveGlobalSlots','saveGlobalDepositRules'];
const implementation=names.map(name=>{
  const line=lines.find(value=>value.startsWith('function '+name+'(')||value.startsWith('async function '+name+'('));
  assert(line,'shipped function exists: '+name);return line;
}).join('\n');
const generic='Не вдалося зберегти налаштування. Спробуйте ще раз.';
const modules=[
  {name:'catalog',fn:'saveGlobalCatalog',writer:'saveCatalogLocal',fallback:'Не вдалося зберегти ціни',
    invalid:'invalid_catalog',message:generic,
    value:{products:{puzzi:{weekday:700,weekend:900}},extras:{},puzziPacketPrice:50}},
  {name:'slots',fn:'saveGlobalSlots',writer:'saveSlots',fallback:'Не вдалося зберегти слоти',
    invalid:'invalid_slots',message:'Перевірте часові слоти.',
    value:{morningStart:'08:30',morningEnd:'10:00',eveningStart:'17:30',eveningEnd:'20:00'}},
  {name:'depositRules',fn:'saveGlobalDepositRules',writer:'saveDepositRulesLocal',fallback:'Не вдалося зберегти залогові платежі',
    invalid:'invalid_deposit_rules',message:'Перевірте залогові платежі.',
    value:{oneUnit:{day:1000,weekend:1500},twoUnits:{day:1500,weekend:2000},general:{day:2000,weekend:2500},elite:{day:2500,weekend:3000}}},
];
let transport, session, writes, requests;
const context=vm.createContext({
  SETTINGS_API:'https://example.invalid/settings',KEY:'public-test-key',
  getSession:()=>session,
  adminFetch:async(url,options)=>{requests.push({url,...options});return transport();},
  ...Object.fromEntries(modules.map(row=>[row.writer,value=>writes.push({name:row.name,value:structuredClone(value)})])),
});
vm.runInContext(implementation+';globalThis.saveFunctions={saveGlobalCatalog,saveGlobalSlots,saveGlobalDepositRules}',context);
function reset(status=503,body={error:'service_error'}) {
  writes=[];requests=[];session={access_token:'synthetic-test-token'};
  transport=async()=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(body)});
}
const results=[];
async function check(name,run) {
  try {await run();results.push({name,passed:true});console.log('PASS:',name);}
  catch(error){results.push({name,passed:false,error:error.message});console.error('FAIL:',name,error.message);}
}
for(const row of modules){
  const save=context.saveFunctions[row.fn];
  await check(row.name+': HTTP503 service_error is human-readable and never writes locally',async()=>{
    reset();const input=structuredClone(row.value);
    await assert.rejects(save(input),error=>error.message===generic);
    assert.equal(writes.length,0);assert.deepEqual(input,row.value);
    assert.deepEqual(JSON.parse(requests[0].body),{[row.name]:row.value});
    assert.equal(requests[0].method,'POST');
    assert.equal(requests[0].headers.Authorization,'Bearer synthetic-test-token');
  });
  await check(row.name+': known invalid payload is explained without local persistence',async()=>{
    reset(400,{error:row.invalid});await assert.rejects(save(row.value),error=>error.message===row.message);
    assert.equal(writes.length,0);
  });
  await check(row.name+': a server-provided human message is preserved',async()=>{
    const message='Збереження тимчасово недоступне. Повторіть пізніше.';
    reset(409,{error:message});await assert.rejects(save(row.value),error=>error.message===message);
    assert.equal(writes.length,0);
  });
  await check(row.name+': malformed error JSON keeps the original human fallback',async()=>{
    reset();transport=async()=>({ok:false,status:503,json:async()=>{throw new SyntaxError('invalid JSON');}});
    await assert.rejects(save(row.value),error=>error.message===row.fallback);assert.equal(writes.length,0);
  });
  await check(row.name+': successful save persists and returns the exact acknowledged value',async()=>{
    const acknowledged={...structuredClone(row.value),acknowledgedByServer:true};
    reset(200,{[row.name]:acknowledged});
    assert.deepEqual(await save(row.value),acknowledged);
    assert.deepEqual(writes,[{name:row.name,value:acknowledged}]);assert.equal(requests.length,1);
  });
  await check(row.name+': successful legacy response still persists submitted data',async()=>{
    reset(200,{});assert.deepEqual(await save(row.value),row.value);
    assert.deepEqual(writes,[{name:row.name,value:row.value}]);
  });
  await check(row.name+': missing authentication still rejects before transport',async()=>{
    reset();session=null;await assert.rejects(save(row.value),error=>error.message==='Потрібен повторний вхід');
    assert.equal(requests.length,0);assert.equal(writes.length,0);
  });
}

// Execute the original submit handlers as well: on a failed HTTP request they
// must show the mapped error, re-enable Save, and preserve the entered draft.
const originalHandlers={
  catalog:source.slice(source.indexOf('f.onsubmit=async e=>{',source.indexOf('id="catalogForm"')),
    source.indexOf('\n\nfunction analyticsCustomerKey')).replace(/}\s*$/,''),
  slots:source.slice(source.indexOf('form.onsubmit=async e=>{',source.indexOf("const form=$('#slotsForm')")),
    source.indexOf("\n  $('#resetSlots')")),
  depositRules:source.slice(source.indexOf('df.onsubmit=async e=>{',source.indexOf("const df=$('#depositRulesForm')")),
    source.indexOf("\n  $('#resetDeposits')")),
};
for(const row of modules){
  await check(row.name+': the original caller retains its draft and exposes the human error after rejection',async()=>{
    reset();const messages=[],button={disabled:false};let closes=0,rerenders=0,saved=0;
    const fields=row.name==='catalog'?{puzzi_weekday:'701',puzzi_weekend:'901',packet:'51'}:
      row.name==='slots'?{morningStart:'08:30',morningEnd:'10:30',eveningStart:'17:30',eveningEnd:'20:30'}:
      {oneUnitDay:'1001',oneUnitWeekend:'1501',twoUnitsDay:'1501',twoUnitsWeekend:'2001',generalDay:'2001',generalWeekend:'2501',eliteDay:'2501',eliteWeekend:'3001'};
    const before=structuredClone(fields),form={fields,querySelector:()=>button};
    Object.assign(context,{f:form,form,df:form,c:structuredClone(modules[0].value),activeExtras:[],
      structuredClone,FormData:class{constructor(current){this.current=current;}get(key){return this.current.fields[key];}},
      read:name=>Number(form.fields[name]),toast:message=>messages.push(message),
      closeLayer:()=>closes++,renderEquipment:()=>rerenders++,announceFormSaved:()=>saved++});
    assert(originalHandlers[row.name].includes('onsubmit=async'),'actual caller found');
    vm.runInContext(originalHandlers[row.name],context);
    await form.onsubmit({preventDefault(){}});
    assert.equal(button.disabled,false);assert.deepEqual(fields,before);
    assert.deepEqual(messages,[generic]);assert.equal(writes.length,0);
    assert.equal(closes,0);assert.equal(rerenders,0);assert.equal(saved,0);
  });
}
const report={runtime:runtimePath,passed:results.filter(row=>row.passed).length,failed:results.filter(row=>!row.passed).length,results};
if(arg('--output')){const out=path.resolve(arg('--output'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));
if(report.failed)process.exitCode=1;
