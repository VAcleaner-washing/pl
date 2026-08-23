import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
assert.ok(runtime.includes("let refreshPromise=null;"),'runtime declares one in-flight refresh promise');
assert.ok(runtime.includes("if(refreshPromise)return refreshPromise"),'parallel 401s reuse the in-flight refresh');
assert.ok(!runtime.includes('requestWithTimeout('),'hotfix must not reintroduce 4.1.21 request timeout layer');
assert.ok(!runtime.includes('bookingsLoaded'),'hotfix must not reintroduce 4.1.22 load-state rewrite');

const start=runtime.indexOf('async function refresh(){');
const end=runtime.indexOf('const invoke=(body',start);
assert.ok(start>0&&end>start,'refresh/invokeAt implementation found');
const implementation=runtime.slice(start,end);

let session={access_token:'old-access',refresh_token:'refresh-1'};
let refreshCalls=0;
let oldApiCalls=0;
let newApiCalls=0;
const context={
  console,
  navigator:{onLine:true},
  SUPABASE:'https://example.supabase.co',
  KEY:'anon',
  refreshPromise:null,
  getSession:()=>session,
  sessionPersistent:()=>true,
  saveSession:(next)=>{session=next;},
  fetch:async(url,options={})=>{
    if(String(url).includes('/auth/v1/token?grant_type=refresh_token')){
      refreshCalls++;
      await new Promise(resolve=>setTimeout(resolve,20));
      return new Response(JSON.stringify({access_token:'new-access',refresh_token:'refresh-2'}),{status:200,headers:{'content-type':'application/json'}});
    }
    const auth=options?.headers?.Authorization||'';
    if(auth==='Bearer old-access'){
      oldApiCalls++;
      return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{'content-type':'application/json'}});
    }
    if(auth==='Bearer new-access'){
      newApiCalls++;
      return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error(`unexpected auth: ${auth}`);
  },
  Response,
  setTimeout,
};
vm.createContext(context);
vm.runInContext(`${implementation};globalThis.__invokeAt=invokeAt;`,context);
const calls=Array.from({length:4},(_,i)=>context.__invokeAt(`https://api.example/${i}`,{action:'test'}));
const results=await Promise.all(calls);
assert.equal(refreshCalls,1,'four parallel 401 responses trigger exactly one refresh request');
assert.equal(oldApiCalls,4,'all initial parallel requests used the expired access token');
assert.equal(newApiCalls,4,'all four requests retry once with the same refreshed access token');
assert.ok(results.every(item=>item?.ok===true),'all callers recover successfully after the shared refresh');
assert.equal(session.refresh_token,'refresh-2','rotated refresh token is stored once as the current session');
console.log('Admin refresh single-flight QA passed: 9 assertions.');
