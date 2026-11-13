import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const option=name=>process.argv.find(arg=>arg.startsWith(name+'='))?.slice(name.length+1);
const runtimePath=option('--runtime')||'assets/admin-v250.js';
const source=fs.readFileSync(runtimePath,'utf8');
function extract(name){const start=source.indexOf(`function ${name}(`);assert(start>=0,name);const ends=['\nfunction ','\nasync function '].map(token=>source.indexOf(token,start+1)).filter(i=>i>=0);return source.slice(start,Math.min(...ends));}
const results=[];
async function check(name,run){try{await run();results.push({name,passed:true});console.log('PASS:',name);}catch(error){results.push({name,passed:false,error:error.message});console.error('FAIL:',name,error.message);}}
function harness(){
  let resolveLookup,rejectLookup;
  const pending=new Promise((resolve,reject)=>{resolveLookup=resolve;rejectLookup=reject;});
  const requests=[],toasts=[],markup=[];
  class Field{
    constructor(name,value='',checked=false){this.name=name;this.value=value;this.checked=checked;this.disabled=false;this.listeners=new Map();this.style={};this.scrollHeight=320;this.textContent='';this.innerHTML='';}
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
    focus(){}
  }
  const form={dataset:{},isConnected:true,listeners:new Map(),
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}};
  for(const [name,value] of [['customerName','Original booking name'],['customerPhone','+380000006001'],['customerAddress',''],['documentType','Паспорт'],['documentNumber',''],['confirmationMessage','']])form[name]=new Field(name,value);
  for(const name of ['identityVerified','contacted','confirmationSent','prepaymentPaid'])form[name]=new Field(name,'on',false);
  const preview=form.confirmationMessage;
  const nodes={'#processForm':form,'#confirmPreview':preview,'#resetConfirmMessage':new Field('reset'),
    '#sendTelegram':null,'#sendInstagram':null,'#documentProfileState':new Field('profile'),
    '#saveProcess':new Field('save'),'#confirmProcess':new Field('confirm'),
    '#identityLabel':new Field('label'),'#identityHint':new Field('hint'),'#copyConfirm':new Field('copy')};
  nodes['#documentProfileState'].className='document-profile-state loading';
  class FormData{
    constructor(target){this.values=new Map(Object.entries(target).filter(([,v])=>v instanceof Field).map(([name,f])=>[name,['identityVerified','contacted','confirmationSent','prepaymentPaid'].includes(name)?(f.checked?'on':null):f.value]));}
    get(name){return this.values.get(name)??null;}
  }
  const booking={id:'00000000-0000-4000-8000-000000006101',booking_code:'R61-SYNTHETIC-PROFILE',status:'waiting_payment',customer_name:'Original booking name',customer_phone:'+380000006001',deposit_amount:1000,product_code:'puzzi',start_date:'2031-08-04',return_date:'2031-08-05',fulfillment:'pickup',extras:{}};
  const context=vm.createContext({console,FormData,
    $:selector=>nodes[selector]??null,h:value=>String(value??''),
    clientFromBooking:()=>({phone:booking.customer_phone,preferredContact:'phone'}),processMetaFromNote:()=>null,
    modal:html=>markup.push(html),money:n=>`${n} грн`,depositFor:()=>1000,
    telegramContactLink:()=>'',instagramContactLink:()=>'',
    confirmationMessage:(_b,f)=>`Name:${f.customerName.value};Doc:${f.documentNumber.value};Paid:${f.prepaymentPaid.checked}`,
    invoke:payload=>{requests.push(payload);return payload.action==='lookup_customer'?pending:Promise.resolve({});},
    cleanManagerNote:value=>String(value||''),processMarker:()=>'',getSlots:()=>({}),tval:()=>'',
    bookingCustomerComment:()=>'',bookingAccessDetail:()=>'',storedManualDiscount:()=>({type:'none',value:0,reason:''}),getSelectedExtras:()=>[],
    closeLayer:()=>{form.isConnected=false;},loadAfterMutation:()=>Promise.resolve(),render:()=>{},toast:text=>toasts.push(text),
  });
  vm.runInContext(extract('normalizePhone')+'\n'+extract('openProcessBooking'),context);
  context.openProcessBooking(booking);
  function change(name,value,type='input'){
    const field=form[name];assert(field,name);
    if(name==='identityVerified'||['contacted','confirmationSent','prepaymentPaid'].includes(name))field.checked=value;
    else field.value=value;
    const event={target:field,isTrusted:true};
    for(const fn of field.listeners.get(type)||[])fn(event);
    for(const fn of form.listeners.get(type)||[])fn(event);
    form['on'+type]?.(event);
  }
  return{form,nodes,requests,toasts,markup,change,
    async resolve(customer){resolveLookup({customer});await pending;await Promise.resolve();},
    async reject(){rejectLookup(new Error('synthetic lookup failure'));await pending.catch(()=>{});await Promise.resolve();await Promise.resolve();}};
}
const profile={phone:'+380000006001',name:'Stored profile name',address:'Stored address',documentType:'ID-картка',documentNumber:'STORED-1001',documentVerifiedAt:'2026-11-13T12:00:00Z',hasDocument:true,isRepeatCustomer:true,completedOrders:2,addressDetail:'Stored detail'};
await check('untouched fields still receive the completed profile and repeat-document exemption',async()=>{
  const h=harness();assert.equal(h.form.dataset.documentsRequired,'1');await h.resolve(profile);
  assert.equal(h.form.customerName.value,profile.name);assert.equal(h.form.customerAddress.value,profile.address);
  assert.equal(h.form.documentType.value,profile.documentType);assert.equal(h.form.documentNumber.value,profile.documentNumber);
  assert.equal(h.form.identityVerified.checked,true);assert.equal(h.form.dataset.documentsRequired,'0');
  assert.match(h.nodes['#documentProfileState'].innerHTML,/Номер підтягнуто автоматично/);
});
for(const [name,value,type] of [['customerName','Manual name','input'],['customerAddress','Manual address','input'],['documentType','Водійське посвідчення','change'],['documentNumber','MANUAL-6101','input'],['identityVerified',false,'change']]){
  await check(`late profile preserves edited ${name} and still fills untouched fields`,async()=>{
    const h=harness();h.change(name,value,type);await h.resolve(profile);
    assert.equal(name==='identityVerified'?h.form[name].checked:h.form[name].value,value);
    if(name!=='customerName')assert.equal(h.form.customerName.value,profile.name);
    if(name!=='documentNumber')assert.equal(h.form.documentNumber.value,profile.documentNumber);
    assert.match(h.nodes['#documentProfileState'].innerHTML,/Ваші ручні зміни збережено/);
    assert.doesNotMatch(h.nodes['#documentProfileState'].innerHTML,/Номер підтягнуто автоматично/);
  });
}
await check('manually cleared name/document remain empty and are not refilled silently',async()=>{
  const h=harness();h.change('customerName','');h.change('documentNumber','');await h.resolve(profile);
  assert.equal(h.form.customerName.value,'');assert.equal(h.form.documentNumber.value,'');
});
await check('existing redraw/payment state and manually edited message remain active',async()=>{
  const h=harness();h.change('customerName','Manual preview name');assert.match(h.form.confirmationMessage.value,/Manual preview name/);
  h.change('confirmationMessage','Manual confirmation copy');h.change('contacted',true,'change');h.change('confirmationSent',true,'change');h.change('prepaymentPaid',true,'change');
  assert.equal(h.nodes['#confirmProcess'].disabled,false);await h.resolve(profile);
  assert.equal(h.form.confirmationMessage.value,'Manual confirmation copy');assert.equal(h.nodes['#confirmProcess'].disabled,false);
});
await check('late original-phone response cannot populate a different current phone',async()=>{
  const h=harness();h.change('customerPhone','+380000006102');h.change('customerName','New person');h.change('documentNumber','NEW-PERSON');await h.resolve(profile);
  assert.equal(h.form.customerName.value,'New person');assert.equal(h.form.documentNumber.value,'NEW-PERSON');
  assert.equal(h.form.customerAddress.value,'');assert.equal(h.form.identityVerified.checked,false);
  assert.equal(h.form.dataset.documentsRequired,'1');assert.match(h.nodes['#documentProfileState'].innerHTML,/поточного номера/);
});
await check('equivalent formatting of the same phone still accepts its profile',async()=>{
  const h=harness();h.change('customerPhone','000 000 60 01');await h.resolve(profile);
  assert.equal(h.form.customerName.value,profile.name);assert.equal(h.form.dataset.documentsRequired,'0');
});
await check('phone change after autofill removes automatic verification and repeat metadata',async()=>{
  const h=harness();await h.resolve(profile);h.change('customerPhone','+380000006103');
  assert.equal(h.form.dataset.documentsRequired,'1');assert.equal(h.form.identityVerified.checked,false);
  h.change('contacted',true,'change');h.change('confirmationSent',true,'change');
  await h.nodes['#saveProcess'].onclick();
  const saved=h.requests.find(row=>row.action==='edit');assert.equal(saved.processing.customer_kind,'new');assert.equal(saved.processing.documents_required,true);assert.equal(saved.customerAddressDetail,'');
});
await check('save owner receives preserved manual fields and explicit unchecked verification',async()=>{
  const h=harness();h.change('customerName','Manual saved name');h.change('customerAddress','Manual saved address');h.change('documentType','Водійське посвідчення','change');h.change('documentNumber','MANUAL-SAVED');h.change('identityVerified',false,'change');await h.resolve(profile);
  h.change('contacted',true,'change');h.change('confirmationSent',true,'change');await h.nodes['#saveProcess'].onclick();
  const saved=h.requests.find(row=>row.action==='edit');assert(saved);
  assert.equal(saved.customerName,'Manual saved name');assert.equal(saved.customerAddress,'Manual saved address');assert.equal(saved.documentType,'Водійське посвідчення');assert.equal(saved.documentNumber,'MANUAL-SAVED');assert.equal(saved.identityVerified,false);
});
await check('closed form lookup does not update detached fields or current modal labels',async()=>{
  const h=harness();h.form.isConnected=false;h.nodes['#identityLabel'].textContent='Current modal label';await h.resolve(profile);
  assert.equal(h.form.customerName.value,'Original booking name');assert.equal(h.nodes['#identityLabel'].textContent,'Current modal label');
});
await check('lookup rejection keeps manual input and a visible manual-recovery state',async()=>{
  const h=harness();h.change('documentNumber','MANUAL-ON-ERROR');await h.reject();
  assert.equal(h.form.documentNumber.value,'MANUAL-ON-ERROR');assert.equal(h.form.dataset.documentsRequired,'1');assert.match(h.nodes['#documentProfileState'].textContent,/Дані можна внести вручну/);
});
const report={runtime:runtimePath,passed:results.filter(row=>row.passed).length,failed:results.filter(row=>!row.passed).length,checks:results};
if(option('--output'))fs.writeFileSync(option('--output'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));
if(report.failed)process.exitCode=1;
