/* One pinned GitHub workload may provision its own temporary stage identities. */
const ISSUER='https://token.actions.githubusercontent.com';
const JWKS=ISSUER+'/.well-known/jwks';
const decode=value=>{
  if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('invalid_token');
  return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4)),char=>char.charCodeAt(0));
};
let cachedKeys=null,cachedUntil=0;
async function githubKeys(){
  if(cachedKeys&&Date.now()<cachedUntil)return cachedKeys;
  const response=await fetch(JWKS,{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('identity_keys_unavailable');
  const body=await response.json();
  if(!Array.isArray(body.keys)||body.keys.length>20)throw Error('identity_keys_unavailable');
  cachedKeys=body.keys;cachedUntil=Date.now()+300000;return cachedKeys;
}
export async function verifyWorkload(token,config,{now=Math.floor(Date.now()/1000),keys=githubKeys}={}){
  if(typeof token!=='string'||token.length>16000)throw Error('invalid_token');
  const pieces=token.split('.');if(pieces.length!==3)throw Error('invalid_token');
  let header,claims;
  try{header=JSON.parse(new TextDecoder().decode(decode(pieces[0])));claims=JSON.parse(new TextDecoder().decode(decode(pieces[1])));}catch{throw Error('invalid_token')}
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>128)throw Error('invalid_token');
  const key=(await keys()).find(key=>key.kid===header.kid&&key.kty==='RSA'&&(!key.alg||key.alg==='RS256')&&(!key.use||key.use==='sig'));
  if(!key)throw Error('invalid_token');
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(pieces[2]),new TextEncoder().encode(pieces[0]+'.'+pieces[1]));
  if(!valid)throw Error('invalid_token');
  if(claims.iss!==ISSUER||claims.aud!==config.audience||!Number.isInteger(claims.exp)||!Number.isInteger(claims.iat)||
     claims.exp<=now||claims.iat>now+30||claims.exp-claims.iat>600||now-claims.iat>600||
     claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30))throw Error('invalid_token');
  const expected={repository:config.repository,repository_id:config.repositoryId,repository_owner_id:config.repositoryOwnerId,
    actor_id:config.actorId,workflow_ref:config.workflowRef,workflow_sha:config.sha,sha:config.sha,ref:config.ref,
    run_id:config.runId,run_attempt:'1',event_name:'push',runner_environment:'github-hosted',
    sub:'repo:'+config.repository+':ref:'+config.ref};
  for(const [field,value]of Object.entries(expected))if(!value||String(claims[field])!==value)throw Error('ci_context_mismatch');
  return {runId:String(claims.run_id),sha:String(claims.sha)};
}
export function ciEmails(runId){
  if(!/^\d{6,20}$/.test(runId))throw Error('invalid_run');
  return ['a','b'].map(role=>`r61-ci-${runId}-${role}@vacleaner-r4.invalid`);
}
export async function ciPassword(serviceKey,runId,role){
  if(!['a','b'].includes(role)||serviceKey.length<20)throw Error('invalid_identity_context');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(serviceKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('vacleaner-r61-ci-v1:'+runId+':'+role)));
  return 'R61-'+Array.from(bytes.slice(0,24),byte=>byte.toString(16).padStart(2,'0')).join('');
}
