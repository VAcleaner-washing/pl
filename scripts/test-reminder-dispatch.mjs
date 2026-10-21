import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const sourcePath=process.argv.find(arg=>arg.startsWith('--source='))?.slice(9)||'supabase/functions/vacleaner-reminders-v1/index.ts';
const source=fs.readFileSync(sourcePath,'utf8');
const start=source.indexOf('async function sendClaimedToManagers('),end=source.indexOf('Deno.serve(',start);
assert.ok(start>=0&&end>start);
const implementation=stripTypeScriptTypes(source.slice(start,end));
function fixture(send){
  const claims=new Map(),finishes=[];let sends=0,claimError=null;
  const db={
    rpc:async(name,args)=>{
      if(name==='vacleaner_claim_notification_dispatch'){
        if(claimError)return{error:claimError};
        const prior=claims.get(args.p_event_key);
        if(prior?.locked||prior?.delivered)return{data:false,error:null};
        claims.set(args.p_event_key,{locked:true,delivered:false});return{data:true,error:null};
      }
      assert.equal(name,'vacleaner_finish_notification_dispatch');finishes.push(args);
      const prior=claims.get(args.p_event_key);prior.locked=false;prior.delivered ||= args.p_delivered;return{error:null};
    },
    from:table=>{assert.equal(table,'vacleaner_notification_dispatch_claims');let key;return{select(){return this},eq(_field,value){key=value;return this},async maybeSingle(){return{data:{delivered_at:claims.get(key)?.delivered?'fixture-delivered':null}}}}},
  };
  const context={sendToManagers:async(...args)=>{sends++;return send(...args)}};vm.createContext(context);
  vm.runInContext(`${implementation};globalThis.dispatch=sendClaimedToManagers`,context);
  return{dispatch:(key='public:new:fixture')=>context.dispatch(db,key,'fixture','new_booking',{title:'Fixture'}),claims,finishes,get sends(){return sends},setClaimError:error=>{claimError=error}};
}

let release;const provider=new Promise(resolve=>{release=resolve});
const concurrent=fixture(async()=>{await provider;return{delivered:1,attempted:1}});
const first=concurrent.dispatch();
await Promise.resolve();await Promise.resolve();
const second=await concurrent.dispatch();
assert.equal(concurrent.sends,1);assert.equal(second.alreadyDelivered,false);
release();await first;
assert.equal((await concurrent.dispatch()).alreadyDelivered,true);assert.equal(concurrent.sends,1);
console.log('PASS concurrent event sends once and later fallback recognizes delivery');

let attempt=0;const retry=fixture(async()=>({delivered:attempt++?1:0,attempted:1}));
assert.equal((await retry.dispatch()).delivered,0);assert.equal(retry.finishes[0].p_delivered,false);
assert.equal((await retry.dispatch()).delivered,1);assert.equal(retry.sends,2);
console.log('PASS failed provider send releases the event for retry');

const throwing=fixture(async()=>{throw new Error('fixture provider failure')});
await assert.rejects(throwing.dispatch(),/fixture provider failure/);assert.equal(throwing.finishes[0].p_delivered,false);
console.log('PASS thrown provider failure also releases the claim');

const unavailable=fixture(async()=>({delivered:1,attempted:1}));unavailable.setClaimError(new Error('fixture database unavailable'));
await assert.rejects(unavailable.dispatch(),/fixture database unavailable/);assert.equal(unavailable.sends,0);
console.log('PASS claim failure never sends without deduplication');

const distinct=fixture(async()=>({delivered:1,attempted:1}));
await distinct.dispatch('reminder:issue:fixture:2026-10-21');await distinct.dispatch('reminder:return:fixture:2026-10-21');assert.equal(distinct.sends,2);
console.log('PASS issue and return events use independent claims');
console.log(`Reminder dispatch: 5/5 · ${sourcePath}`);
