import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {generateKeyPairSync,sign} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {verifyWorkload,ciEmails,ciPassword} from '../staging/ci-auth/identity.mjs';

const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'qa-key',alg:'RS256',use:'sig'};
const config={repository:'VAcleaner-washing/pl',repositoryId:'945622350',repositoryOwnerId:'202554163',actorId:'202554163',
  ref:'refs/heads/audit/r61-connected-ui',workflowRef:'VAcleaner-washing/pl/.github/workflows/admin-r61-connected.yml@refs/heads/audit/r61-connected-ui',
  sha:'a'.repeat(40),runId:'43229999999',audience:'https://jdthhqxzfpvosfdxwfem.supabase.co/functions/v1/r61-ci-identities',issuedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()};
const now=Math.floor(Date.now()/1000);
const validClaims={iss:'https://token.actions.githubusercontent.com',aud:config.audience,iat:now-10,exp:now+290,
  repository:config.repository,repository_id:config.repositoryId,repository_owner_id:config.repositoryOwnerId,actor_id:config.actorId,
  workflow_ref:config.workflowRef,workflow_sha:config.sha,sha:config.sha,ref:config.ref,run_id:config.runId,run_attempt:'1',
  event_name:'push',runner_environment:'github-hosted',sub:'repo:'+config.repository+':ref:'+config.ref};
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(changes={},header={}){const body=enc({alg:'RS256',kid:jwk.kid,typ:'JWT',...header})+'.'+enc({...validClaims,...changes});return body+'.'+sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url')}
const verify=jwt=>verifyWorkload(jwt,config,{now,keys:async()=>[jwk]});
let passed=0;
async function check(name,run){await run();passed++;console.log('PASS:',name)}
await check('one correctly signed exact workload is accepted',async()=>assert.deepEqual(await verify(token()),{runId:config.runId,sha:config.sha}));
for(const [field,value]of Object.entries({iss:'https://attacker.invalid',aud:'authenticated',repository:'fork/pl',repository_id:'1',
  repository_owner_id:'1',actor_id:'1',workflow_ref:'other',workflow_sha:'b'.repeat(40),sha:'b'.repeat(40),ref:'refs/heads/main',run_id:'43229999998',
  run_attempt:'2',event_name:'pull_request',runner_environment:'self-hosted',sub:'other',exp:now-1,iat:now+100,nbf:now+100})){
  await check('reject signed wrong '+field,()=>assert.rejects(verify(token({[field]:value}))));
}
await check('reject an overly long token lifetime',()=>assert.rejects(verify(token({exp:now+2000}))));
await check('reject unsigned and algorithm-confused tokens',async()=>{await assert.rejects(verify(token({},{alg:'none'})));await assert.rejects(verify(token({},{alg:'HS256'})))});
await check('reject payload modification after signature',()=>{const jwt=token().split('.');jwt[1]=enc({...validClaims,actor_id:'1'});return assert.rejects(verify(jwt.join('.')))});
await check('reject malformed input before requesting a key',async()=>{let keys=0;await assert.rejects(verifyWorkload('invalid',config,{now,keys:async()=>{keys++;return[jwk]}}));assert.equal(keys,0)});
await check('temporary emails are fixed to this numeric run and invalid domain',()=>{assert.deepEqual(ciEmails(config.runId),['r61-ci-43229999999-a@vacleaner-r4.invalid','r61-ci-43229999999-b@vacleaner-r4.invalid']);assert.throws(()=>ciEmails('../owner'));});
await check('derived passwords are strong deterministic and separated by role/run',async()=>{const key='not-a-real-service-key-used-only-in-this-test';const a=await ciPassword(key,config.runId,'a');assert.equal(a,await ciPassword(key,config.runId,'a'));assert.notEqual(a,await ciPassword(key,config.runId,'b'));assert.notEqual(a,await ciPassword(key,'43229999998','a'));assert.match(a,/^R61-[a-f0-9]{48}$/);assert(!a.includes(key))});

const source=fs.readFileSync('staging/ci-auth/index.ts','utf8').replace(/^import .*;\s*$/gm,'');
function handler(overrides={}){
  const users=[{id:'owner',email:'manager-a@vacleaner-r4.invalid'},...(overrides.extraUsers||[])],roles=new Set(['owner']),calls=[],network=[];
  const admin={
    async listUsers(){calls.push('list');return{data:{users:[...users]},error:null}},
    async createUser(input){calls.push('create');assert.equal(input.email_confirm,true);const user={id:'ci'+users.length,email:input.email,app_metadata:input.app_metadata};users.push(user);return{data:{user},error:null}},
    async updateUserById(id,input){calls.push('update');assert.notEqual(id,'owner');return{data:{user:users.find(u=>u.id===id)},error:null}},
    async deleteUser(id){calls.push('delete');assert.notEqual(id,'owner');users.splice(users.findIndex(u=>u.id===id),1);return{error:null}},
  };
  const db={auth:{admin},from(table){assert.equal(table,'admin_users');return{
    async upsert(row){roles.add(row.user_id);return{error:null}},
    delete(){return{async eq(field,id){assert.equal(field,'user_id');assert.notEqual(id,'owner');roles.delete(id);return{error:null}}}},
  }}};
  let serve,clients=0,clientOptions;
  const context=vm.createContext({config:{...config,...overrides.config},Deno:{env:{get:name=>name==='SUPABASE_URL'?(overrides.origin||'https://jdthhqxzfpvosfdxwfem.supabase.co'):'not-a-real-service-key-used-only-in-tests'},serve:fn=>serve=fn},
    createClient(url,key,options){clients++;clientOptions=options;return db},verifyWorkload:(jwt,cfg)=>verifyWorkload(jwt,cfg,{now,keys:async()=>[jwk]}),ciEmails,ciPassword,
    Response,Request,URL,Date,console:{warn(){}},fetch(input,options){network.push({input,options});return Promise.resolve(new Response('{}'))}});
  vm.runInContext(stripTypeScriptTypes(source,{mode:'strip'}),context);
  return{users,roles,calls,network,clientOptions:()=>clientOptions,clients:()=>clients,request:(body,authorization=token(),headers={})=>serve(new Request('https://jdthhqxzfpvosfdxwfem.supabase.co/functions/v1/r61-ci-identities',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+authorization,...headers},body:JSON.stringify(body)}))};
}
await check('unauthorized requests construct no privileged client',async()=>{const h=handler();assert.equal((await h.request({action:'provision'},'bad-token')).status,401);assert.equal((await h.request({action:'provision'},token({run_id:'1'}))).status,401);assert.equal(h.clients(),0);assert.deepEqual(h.calls,[])});
await check('browser origin cannot access provisioner even with valid workload token',async()=>{const h=handler();assert.equal((await h.request({action:'provision'},token(),{Origin:'https://stage.test'})).status,403);assert.equal(h.clients(),0)});
await check('production or unpinned config refuses all privileged work',async()=>{for(const overrides of [{origin:'https://yweluzclearwrazdkahu.supabase.co'},{config:{sha:''}},{config:{runId:''}}]){const h=handler(overrides);assert.equal((await h.request({action:'provision'})).status,503);assert.equal(h.clients(),0)}});
await check('expired provisioner cannot create accounts',async()=>{const h=handler({config:{expiresAt:new Date(Date.now()-1000).toISOString()}});assert.equal((await h.request({action:'provision'})).status,410);assert.equal(h.clients(),0)});
await check('malformed or unknown actions create no accounts',async()=>{for(const body of [null,{}, {action:'signup'},{action:'delete',userId:'owner'}]){const h=handler();assert.equal((await h.request(body)).status,400);assert.equal(h.clients(),0)}});
await check('trusted CI receives only two temporary accounts and owns only their roles',async()=>{const h=handler();const response=await h.request({action:'provision'});assert.equal(response.status,200);const body=await response.json();assert.equal(body.accounts.length,2);assert.deepEqual(body.accounts.map(a=>a.email),ciEmails(config.runId));assert.equal(h.roles.size,3);assert.equal(h.users[0].id,'owner');assert(!JSON.stringify(body).includes('not-a-real-service-key'))});
await check('repeated provision is idempotent within the same pinned run',async()=>{const h=handler();await h.request({action:'provision'});await h.request({action:'provision'});assert.equal(h.users.length,3);assert.equal(h.roles.size,3)});
await check('cleanup ignores caller supplied IDs and preserves permanent owner',async()=>{const h=handler();await h.request({action:'provision'});const response=await h.request({action:'cleanup',userId:'owner',email:'manager-a@vacleaner-r4.invalid'});assert.equal(response.status,200);assert.equal((await response.json()).removedUsers,2);assert.deepEqual(h.users,[{id:'owner',email:'manager-a@vacleaner-r4.invalid'}]);assert.deepEqual([...h.roles],['owner'])});
await check('reserved email collision cannot update grant or delete an unowned identity',async()=>{const user={id:'collision',email:ciEmails(config.runId)[0],user_metadata:{vacleaner_ci:{version:1,runId:config.runId,sha:config.sha,repositoryId:config.repositoryId}}};const h=handler({extraUsers:[user]});assert.equal((await h.request({action:'provision'})).status,500);assert.equal((await h.request({action:'cleanup'})).status,200);assert(h.users.some(row=>row.id==='collision'));assert(!h.calls.includes('create'));assert(!h.calls.includes('update'));assert(!h.calls.includes('delete'));assert.deepEqual([...h.roles],['owner'])});
await check('metadata from another run does not establish ownership',async()=>{const h=handler({extraUsers:[{id:'collision',email:ciEmails(config.runId)[0],app_metadata:{vacleaner_ci:{version:1,runId:'other',sha:config.sha,repositoryId:config.repositoryId}}}]});assert.equal((await h.request({action:'provision'})).status,500);assert.equal(h.users.length,2);assert(!h.calls.includes('delete'))});
await check('unbounded operational expiry fails closed',async()=>{const h=handler({config:{expiresAt:new Date(Date.now()+7200000).toISOString()}});assert.equal((await h.request({action:'provision'})).status,503);assert.equal(h.clients(),0)});
await check('privileged SDK transport refuses foreign production and provider endpoints',async()=>{const h=handler();await h.request({action:'provision'});const guarded=h.clientOptions().global.fetch;for(const url of ['https://yweluzclearwrazdkahu.supabase.co/rest/v1/admin_users','https://attacker.invalid','https://jdthhqxzfpvosfdxwfem.supabase.co/functions/v1/vacleaner-sms-v2'])assert.throws(()=>guarded(url),/ci_transport_blocked/);assert.equal(h.network.length,0);await guarded('https://jdthhqxzfpvosfdxwfem.supabase.co/rest/v1/admin_users',{method:'POST'});assert.equal(h.network.length,1);assert.equal(h.network[0].options.redirect,'error')});
await check('GitHub key discovery uses only its fixed public URL with no Supabase credentials',async()=>{const original=globalThis.fetch,requests=[];globalThis.fetch=async(input,options)=>{requests.push({input,options});return new Response(JSON.stringify({keys:[jwk]}))};try{assert.deepEqual(await verifyWorkload(token(),config,{now}),{runId:config.runId,sha:config.sha});assert.equal(requests.length,1);assert.equal(requests[0].input,'https://token.actions.githubusercontent.com/.well-known/jwks');assert.equal(requests[0].options.redirect,'error');assert.equal(requests[0].options.headers,undefined)}finally{globalThis.fetch=original}});
console.log(JSON.stringify({mode:'temporary-stage-ci-workload-boundary',passed,realNetwork:false}));
