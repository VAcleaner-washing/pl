import {createClient} from 'npm:@supabase/supabase-js@2.112.0';
import {verifyWorkload,ciEmails,ciPassword} from './identity.mjs';
import {config} from './config.ts';

const PROJECT='jdthhqxzfpvosfdxwfem';
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,
  headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const ownership=()=>({version:1,runId:config.runId,sha:config.sha,repositoryId:config.repositoryId});
const owns=(user:any)=>{const marker=user.app_metadata?.vacleaner_ci;return marker&&marker.version===1&&marker.runId===config.runId&&marker.sha===config.sha&&marker.repositoryId===config.repositoryId};
async function ownedUsers(db:any,emails:string[],strict=true){
  const found=[];
  for(let page=1;page<=10;page++){
    const {data,error}=await db.auth.admin.listUsers({page,perPage:100});
    if(error)throw Error('identity_lookup_failed');
    for(const user of data.users)if(emails.includes(String(user.email||'')))found.push(user);
    if(data.users.length<100){if(strict&&found.some(user=>!owns(user)))throw Error('identity_collision');return found.filter(owns)}
  }
  throw Error('identity_lookup_limit');
}
async function cleanup(db:any,emails:string[]){
  const users=await ownedUsers(db,emails,false);let removed=0;
  for(const user of users){
    if(!emails.includes(user.email))throw Error('identity_scope_mismatch');
    const {error:roleError}=await db.from('admin_users').delete().eq('user_id',user.id);
    if(roleError)throw Error('identity_role_cleanup_failed');
    const {error}=await db.auth.admin.deleteUser(user.id);
    if(error)throw Error('identity_cleanup_failed');removed++;
  }
  return removed;
}

Deno.serve(async request=>{
  const url=Deno.env.get('SUPABASE_URL')||'',serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  const issued=Date.parse(config.issuedAt),expires=Date.parse(config.expiresAt);
  if(url!==`https://${PROJECT}.supabase.co`||!serviceKey||!config.sha||!config.runId||!Number.isFinite(issued)||!Number.isFinite(expires)||expires<=issued||expires-issued>3600000||issued>Date.now()+60000)return json({error:'ci_not_configured'},503);
  const expired=Date.now()>=Date.parse(config.expiresAt);
  if(request.method==='GET')return expired?json({error:'ci_expired'},410):json({ready:true,mode:'pinned-ci-workload'});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(request.headers.has('Origin'))return json({error:'browser_access_denied'},403);
  let identity;
  try{identity=await verifyWorkload((request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,''),config);}catch(error){
    return json({error:error instanceof Error&&error.message==='identity_keys_unavailable'?'ci_identity_unavailable':'unauthorized'},401);
  }
  const parsed=await request.json().catch(()=>({}));
  const body=parsed&&typeof parsed==='object'?parsed:{};
  if(!['provision','cleanup'].includes(body.action))return json({error:'invalid_action'},400);
  if(expired&&body.action!=='cleanup')return json({error:'ci_expired'},410);
  if(expired&&Date.now()-Date.parse(config.expiresAt)>3600000)return json({error:'ci_expired'},410);
  const emails=ciEmails(identity.runId);
  const guardedFetch=(input:any,options:any={})=>{
    const target=new URL(input instanceof Request?input.url:String(input));
    if(target.origin!==url||!(target.pathname.startsWith('/auth/v1/admin/users')||target.pathname==='/rest/v1/admin_users'))throw Error('ci_transport_blocked');
    return fetch(input,{...options,redirect:'error'});
  };
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:guardedFetch}});
  if(body.action==='cleanup'){
    try{return json({removedUsers:await cleanup(db,emails),providerMessages:0});}
    catch{return json({error:'ci_cleanup_failed'},500);}
  }
  try{
    const existing=await ownedUsers(db,emails),accounts=[];
    for(const [index,email]of emails.entries()){
      const password=await ciPassword(serviceKey,identity.runId,index===0?'a':'b');
      const previous=existing.find(user=>user.email===email);
      const {data,error}=previous?await db.auth.admin.updateUserById(previous.id,{password,email_confirm:true}):
        await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{vacleaner_ci:ownership()}});
      if(error||!data.user?.id)throw Error('ci_user_create_failed');
      const {error:roleError}=await db.from('admin_users').upsert({user_id:data.user.id,email});
      if(roleError)throw Error('ci_user_role_failed');
      accounts.push({email,password});
    }
    return json({projectRef:PROJECT,origin:url,runId:identity.runId,cohort:'R61-CI-'+identity.runId,accounts});
  }catch{
    try{await cleanup(db,emails);}catch{console.warn('ci_partial_cleanup_required');}
    return json({error:'ci_provision_failed'},500);
  }
});
