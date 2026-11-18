import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

// Execute the actual Edge handler with an isolated database boundary, never production.
const source=fs.readFileSync('supabase/functions/vacleaner-equipment-admin-v1/index.ts','utf8').replace(/^import .*;\n/gm,'');
let handler,actor,rpcCalls=[],adminAllowed=true,listFails=false,rpcError=null;
const db={auth:{async getUser(token){actor='11111111-1111-4111-8111-111111111111';return token==='valid'?{data:{user:{id:actor}},error:null}:{data:{user:null},error:{message:'invalid'}}}},
  from(table){const query={select(){return this},eq(){return this},order(){return this},limit(){return this},async maybeSingle(){return {data:adminAllowed?{user_id:actor}:null,error:null}},then(resolve){resolve({error:listFails?{code:'QA'}:null,data:table==='vacleaner_inventory'?[{resource_code:'jimmy',capacity:1}]:table==='vacleaner_equipment_units'?[{id:'unit',status:'repair'}]:[{vacleaner_booking_resources:[{resource_code:'jimmy',quantity:1}]}]})}};return query},
  async rpc(name,args){rpcCalls.push({name,args});return {data:{changed:true,capacity:1},error:rpcError}}};
vm.runInNewContext(stripTypeScriptTypes(source),{Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://qa.invalid':'server-only-qa'},serve:fn=>handler=fn},createClient:()=>db,Request,Response,console:{error(){}}});
let passed=0;
async function call(body,{token='valid',method='POST'}={}){return handler(new Request('https://qa.invalid/functions/v1/fleet',{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})}))}
async function check(name,fn){await fn();passed++;console.log('PASS',name)}
await check('preflight does not authenticate or mutate',async()=>assert.equal((await call(null,{method:'OPTIONS',token:''})).status,200));
await check('GET is rejected',async()=>assert.equal((await call(null,{method:'GET'})).status,405));
await check('missing and invalid tokens are rejected',async()=>{assert.equal((await call({action:'add_unit'},{token:''})).status,401);assert.equal((await call({action:'list'},{token:'invalid'})).status,401);assert.equal(rpcCalls.length,0)});
await check('authenticated non-admin cannot list or mutate',async()=>{adminAllowed=false;assert.equal((await call({action:'add_unit',resourceCode:'abir',requestId:'22222222-2222-4222-8222-222222222222'})).status,403);assert.equal(rpcCalls.length,0);adminAllowed=true});
await check('null and array bodies return explicit validation errors',async()=>{for(const body of [null,[],false])assert.equal((await call(body)).status,400)});
await check('list aggregates issued resources from the actual handler',async()=>{const r=await call({action:'list'});assert.equal(r.status,200);const data=await r.json();assert.equal(data.issued.jimmy,1);assert.equal(data.inventory[0].capacity,1)});
await check('list failure remains a visible service error',async()=>{listFails=true;assert.equal((await call({action:'list'})).status,503);listFails=false});
await check('malformed unit changes cannot reach privileged RPC',async()=>{const n=rpcCalls.length;for(const body of [{action:'set_status',unitId:'bad',status:'ready'},{action:'set_status',unitId:actor,status:'unknown'},{action:'add_unit',resourceCode:'unknown'}])assert.equal((await call(body)).status,400);assert.equal(rpcCalls.length,n)});
await check('status mutation derives the actor from verified Auth and trims notes',async()=>{const r=await call({action:'set_status',unitId:actor,status:'repair',note:'  broken  ',actorId:'attacker'});assert.equal(r.status,200);assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls.at(-1))),{name:'vacleaner_admin_set_equipment_unit_status',args:{p_unit_id:actor,p_status:'repair',p_note:'broken',p_actor_id:actor}})});
await check('booking conflict is returned without false success',async()=>{rpcError={message:'equipment_reserved_overlap:jimmy:1'};const r=await call({action:'set_status',unitId:actor,status:'repair'});assert.equal(r.status,409);assert.equal((await r.json()).error,'equipment_reserved_overlap');rpcError=null});
await check('unknown database errors do not expose SQL details',async()=>{rpcError={message:'secret SQL detail',code:'QA'};const r=await call({action:'add_unit',resourceCode:'abir',requestId:'22222222-2222-4222-8222-222222222222'});assert.equal(r.status,500);assert.equal((await r.json()).error,'equipment_save_failed');rpcError=null});
await check('authorized add uses the distinct transaction RPC',async()=>{assert.equal((await call({action:'add_unit',resourceCode:'abir',requestId:'22222222-2222-4222-8222-222222222222'})).status,200);assert.equal(rpcCalls.at(-1).name,'vacleaner_admin_add_equipment_unit');assert.equal(rpcCalls.at(-1).args.p_actor_id,actor);assert.equal(rpcCalls.at(-1).args.p_request_id,'22222222-2222-4222-8222-222222222222')});
console.log(JSON.stringify({passed,failed:0,productionRequests:0}));
