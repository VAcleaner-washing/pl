import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),out=path.join(root,'lab-test-results/dist');
// Static QA runs before the pipeline's final build on a clean checkout.
// This contract owns both artifacts instead of depending on a previous local run.
execFileSync(process.execPath,['scripts/build-pages.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/build-admin-lab.mjs',out],{stdio:'inherit'});
assert(!fs.existsSync('dist/sandbox'),'LAB source must not enter the normal artifact');
assert(!fs.readFileSync('dist/admin/bronuvannia/index.html','utf8').includes('admin-lab'),'Normal entrypoint must not activate LAB');
const html=fs.readFileSync(path.join(out,'admin/bronuvannia/index.html'),'utf8');
assert(html.indexOf('admin-lab-bootstrap')<html.indexOf('admin-v250.js'),'Adapter must run before admin');
assert(html.includes("connect-src 'self'"));assert(html.includes("form-action 'self'"));
const viewport=html.match(/<meta name="viewport" content="([^"]+)"/)[1];
assert(!/user-scalable|maximum-scale/.test(viewport),'LAB must permit user zoom');
assert(html.includes('/assets/admin-lab-forms.js'),'LAB form safety must load');
assert(!/supabase\.co|sb_publishable_/.test(fs.readFileSync(path.join(out,'assets/admin-v250.js'),'utf8')));
const sw=fs.readFileSync(path.join(out,'admin/sw.js'),'utf8');
assert(sw.includes("key.startsWith('vacleaner-lab-')"));assert(sw.includes('admin-lab-bootstrap'));
assert(sw.includes('admin-lab-forms.js')&&sw.includes('admin-lab-forms.css'),'Offline shell must retain form safety');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'admin/manifest.webmanifest'),'utf8'));assert.equal(manifest.id,'/admin/lab/');assert.equal(manifest.short_name,'VA LAB');
const store=new Map();let quota=false,network=[];
function runtime(){
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>{if(quota&&k==='vacleaner_lab_state_v1')throw Error('quota');store.set(k,String(v))},removeItem:k=>store.delete(k)};
 const context={console,Response,URL,Date,Math,JSON,DOMException,structuredClone,crypto:webcrypto,setTimeout,clearTimeout,localStorage:storage,sessionStorage:storage,location:{origin:'https://lab.invalid',href:'https://lab.invalid/admin/bronuvannia/',reload(){}},document:{documentElement:{dataset:{}},addEventListener(){}},alert(){}};
 context.window=context;context.open=()=>null;context.fetch=async(...args)=>{network.push(args);return new Response('static')};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(out,'assets/admin-lab-bootstrap.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(out,'assets/vacleaner-core.js'),'utf8'),context);return context;
}
let app=runtime();
async function call(action,data={},endpoint='vacleaner-admin-bookings-v4'){
 const response=await app.fetch(`/sandbox-api/functions/v1/${endpoint}`,{method:'POST',body:JSON.stringify({action,...data})});return{status:response.status,...await response.json()};
}
assert.equal((await call('list')).bookings.length,12);
await assert.rejects(()=>app.fetch('https://production.invalid/api'),/external network blocked/);
await assert.rejects(()=>app.fetch('/unhandled-write',{method:'POST'}),/non-simulated write blocked/);
assert.equal(network.length,0);
let before=store.get('vacleaner_lab_state_v1');
assert.equal((await call('sms_send',{},'vacleaner-sms-v2')).status,409);
assert.equal(store.get('vacleaner_lab_state_v1'),before,'Unsupported writes must not mutate state');
const start=new Date();start.setDate(start.getDate()+10);const end=new Date(start);end.setDate(end.getDate()+1);const iso=d=>d.toISOString().slice(0,10);
const request={clientRequestId:webcrypto.randomUUID(),productCode:'puzzi',startDate:iso(start),returnDate:iso(end),pickupWindow:'morning',returnWindow:'morning',pickupTime:'08:00',returnTime:'10:00',customerName:'LAB lifecycle',customerPhone:'+380000000099',fulfillment:'pickup',selectedExtras:['spot_lifter'],prepaymentPaid:false,source:'instagram'};
app.VA_LAB.faults.write=true;assert.equal((await call('create',request)).status,503);assert.equal(store.get('vacleaner_lab_state_v1'),before);app.VA_LAB.faults.write=false;
quota=true;assert.equal((await call('create',request)).status,507);assert.equal(store.get('vacleaner_lab_state_v1'),before);quota=false;
let result=await call('create',request);assert.equal(result.status,200);const bookingId=result.booking.id;
assert.equal((await call('create',request)).booking.id,bookingId,'Create idempotency');
assert.equal((await call('list')).bookings.filter(b=>b.id===bookingId).length,1);
assert.equal((await call('update',{bookingId,status:'confirmed'})).status,409,'Prepayment guard');
await call('edit',{...request,bookingId,prepaymentPaid:true});
assert.equal((await call('update',{bookingId,status:'confirmed'})).booking.status,'confirmed');
assert.equal((await call('update',{bookingId,status:'issued'})).status,409,'Deposit guard');
assert.equal((await call('save_finance',{bookingId,depositAmount:1500,depositPaid:true,usedPackets:0})).booking.deposit_paid,true);
assert.equal((await call('update',{bookingId,status:'issued'})).booking.status,'issued');
const extended=new Date(end);extended.setDate(extended.getDate()+1);
result=await call('',{bookingId,returnDate:iso(extended),returnWindow:'morning',returnTime:'10:00'},'vacleaner-extend-rental-v1');assert.equal(result.booking.return_date,iso(extended));assert.equal(result.booking.deposit_amount,1500,'Extension preserves actual deposit');
result=await call('save_finance',{bookingId,depositAmount:1500,depositPaid:true,usedPackets:3,storyMention:true,storyGiftChoice:'chemistry2',manualChargeAmount:50,manualChargeReason:'LAB'});
assert.equal(result.finance.usedPackets,3);assert.equal(result.finance.freePackets,2);assert.equal(result.finance.chemistryAmount,50);
const finance=result.finance;
assert.equal((await call('save_deposit_return',{bookingId,returned:true})).status,409,'Settlement confirmation required');
result=await call('save_deposit_return',{bookingId,returned:true,settlementConfirmed:true,refundPaid:finance.refundAmount>0,duePaid:finance.dueAmount>0});assert.equal(result.booking.status,'completed');assert.equal(result.booking.extras.settlement.completed,true);
assert.equal((await call('audit_log',{bookingId})).entries.length>0,true);
app=runtime();result=await call('list');assert.equal(result.bookings.find(b=>b.id===bookingId).status,'completed','Reload reads persisted final state');
app.VA_LAB.faults.read=true;assert.equal((await call('list')).status,503);app.VA_LAB.faults.read=false;
assert.equal((await call('list')).bookings.find(b=>b.id===bookingId).total_amount,finance.totalAmount);
console.log('LAB isolation, persistence, failure recovery and canonical pricing/settlement contracts passed');
