// Preflight only: these checks do not certify live Auth/RLS/RPC or persistence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=process.cwd(),output=fs.mkdtempSync(path.join(root,'staging/preflight-'));
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS:',name)};
const generate=(...args)=>spawnSync(process.execPath,['scripts/prepare-admin-staging.mjs',...args],{encoding:'utf8'});
try{
 for(const ref of ['yweluzclearwrazdkahu','', 'https://other.supabase.co']){
  const target=path.join(output,'denied');const result=generate('--project-ref',ref,'--output',target);
  check('reject forbidden/invalid target '+JSON.stringify(ref),()=>{assert.equal(result.status,1,String(result.error||result.signal));assert.match(result.stderr,/Production is forbidden/);assert(!fs.existsSync(target))});
 }
 const escape=generate('--project-ref','local','--output',path.join(root,'dist'));
 check('reject output outside staging before writes',()=>{assert.equal(escape.status,1,String(escape.error||escape.signal));assert.match(escape.stderr,/Output must stay inside staging/)});
 const result=generate('--project-ref','local','--output',output);assert.equal(result.status,0,result.stderr);
 const catalog=JSON.parse(fs.readFileSync('staging/catalog-snapshot.json','utf8'));
 const sql=fs.readFileSync(path.join(output,'bootstrap.generated.sql'),'utf8');
 check('bootstrap refuses existing business tables before its first DDL',()=>{
  assert(sql.indexOf('do $guard$')<sql.indexOf('create schema'));
  assert(sql.includes("to_regclass('public.vacleaner_bookings') is not null"));
  assert(sql.includes("to_regclass('public.admin_users') is not null"));
 });
 check('all 22 tables retain enabled RLS and direct-grant revocation',()=>{
  assert.equal(catalog.tables.length,22);
  for(const t of catalog.tables){assert(t.rls);assert(sql.includes(`alter table public."${t.name}" enable row level security;`));assert(sql.includes(`revoke all on public."${t.name}" from PUBLIC, anon, authenticated, service_role;`))}
 });
 check('only synthetic inventory/settings/identity are seeded',()=>{
  const inserts=[...sql.matchAll(/^insert into ([\w.]+)/gm)].map(m=>m[1]);
  assert.equal(inserts.length,9);
  assert(inserts.every(name=>['vacleaner_stage.identity','public.vacleaner_inventory','public.vacleaner_settings'].includes(name)));
 });
 const manifest=JSON.parse(fs.readFileSync(path.join(output,'manifest.generated.json'),'utf8'));
 check('all 6 handlers, auth checks and pure financial modules are copied unchanged',()=>{
  assert.equal(Object.keys(manifest.functions).length,6);
  for(const [name,files] of Object.entries(manifest.functions))for(const [file,digest] of Object.entries(files)){
   const original=fs.readFileSync(path.join(root,'supabase/functions',name,file));
   const copied=fs.readFileSync(path.join(output,'supabase/functions',name,file==='index.ts'?'canonical.ts':file));
   assert(original.equals(copied));assert.equal(crypto.createHash('sha256').update(copied).digest('hex'),digest);
  }
 });
 const policy=fs.readFileSync(path.join(output,'supabase/functions/vacleaner-admin-bookings-v4/isolation.ts'),'utf8');
 let calls=0;
 const context=vm.createContext({URL,Request,Response,Deno:{env:{get:()=> 'http://127.0.0.1:56421'}},console:{warn:()=>{}},fetch:async()=>{calls++;return new Response('{}',{status:200})}});
 vm.runInContext(policy,context);
 for(const url of ['https://yweluzclearwrazdkahu.supabase.co/rest/v1/vacleaner_bookings','https://example.invalid/sms','http://127.0.0.1:56421/functions/v1/vacleaner-push','http://127.0.0.1:56421/functions/v1/vacleaner-sms-v2']){
  const response=await context.fetch(url);
  check('transport guard rejects without a request: '+url,()=>{assert.equal(response.status,503);assert.equal(calls,0)});
 }
 const allowed=await context.fetch('http://127.0.0.1:56421/rest/v1/vacleaner_bookings');
 check('transport guard permits the selected API origin',()=>{assert.equal(allowed.status,200);assert.equal(calls,1)});
 check('runtime refuses production even if a local bundle is misconfigured',()=>{
  const bad=vm.createContext({URL,Request,Response,Deno:{env:{get:()=> 'https://yweluzclearwrazdkahu.supabase.co'}},console,fetch:()=>{throw Error('must not run')}});
  assert.throws(()=>vm.runInContext(policy,bad),/STAGING_TARGET_MISMATCH/);
 });
 const build=spawnSync(process.execPath,['scripts/build-pages.mjs'],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);
 check('normal Pages does not ship staging source, runtime or generated credentials',()=>assert(!fs.existsSync('dist/staging')));
 const contaminated=path.join(root,'dist/staging');fs.mkdirSync(contaminated);
 try{
  fs.writeFileSync(path.join(contaminated,'credentials.json'),'TEST_CANARY_NOT_A_SECRET');
  const verify=spawnSync(process.execPath,['scripts/verify-pages-artifact.mjs'],{encoding:'utf8'});
  check('artifact verifier independently rejects a contaminated deployment',()=>{assert.equal(verify.status,1,String(verify.error||verify.signal));assert.match(verify.stderr,/development path leaked.*staging/)});
 }finally{fs.rmSync(contaminated,{recursive:true,force:true})}
 const verify=spawnSync(process.execPath,['scripts/verify-pages-artifact.mjs'],{encoding:'utf8'});
 check('clean canonical artifact remains valid',()=>assert.equal(verify.status,0,verify.stderr));
 console.log(JSON.stringify({mode:'preflight-only',passed,liveIntegration:'not_run'}));
}finally{fs.rmSync(output,{recursive:true,force:true})}
