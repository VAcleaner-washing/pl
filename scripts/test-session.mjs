import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const match=runtime.match(/const SESSION_KEY=[\s\S]*?(?=async function login\()/);
assert.ok(match,'session implementation not found');

class StorageMock {
  constructor(){this.map=new Map()}
  getItem(key){return this.map.has(String(key))?this.map.get(String(key)):null}
  setItem(key,value){this.map.set(String(key),String(value))}
  removeItem(key){this.map.delete(String(key))}
}

function createApi(){
  const localStorage=new StorageMock(),sessionStorage=new StorageMock();
  const context={localStorage,sessionStorage,console};
  vm.createContext(context);
  vm.runInContext(`${match[0]};globalThis.sessionApi={getSession,saveSession,clearSession,sessionPersistent,state,SESSION_IDLE_MS};`,context);
  return {...context.sessionApi,localStorage,sessionStorage};
}

{
  const api=createApi();
  assert.equal(api.sessionPersistent(),true,'trusted-device mode should be default');
  api.saveSession({access_token:'a',refresh_token:'r'},true);
  assert.ok(api.localStorage.getItem('vacleaner_session'));
  assert.equal(api.sessionStorage.getItem('vacleaner_session'),null);
  assert.equal(api.getSession().access_token,'a');
}

{
  const api=createApi();
  api.saveSession({access_token:'temporary'},false);
  assert.ok(api.sessionStorage.getItem('vacleaner_session'));
  assert.equal(api.localStorage.getItem('vacleaner_session'),null);
}

{
  const api=createApi();
  api.sessionStorage.setItem('vacleaner_session',JSON.stringify({access_token:'migrated'}));
  const session=api.getSession();
  assert.equal(session.access_token,'migrated');
  assert.ok(api.localStorage.getItem('vacleaner_session'));
  assert.equal(api.sessionStorage.getItem('vacleaner_session'),null);
}

{
  const api=createApi();
  api.localStorage.setItem('vacleaner_session_persistent','1');
  api.localStorage.setItem('vacleaner_session',JSON.stringify({access_token:'expired'}));
  api.localStorage.setItem('vacleaner_session_seen',String(Date.now()-api.SESSION_IDLE_MS-1));
  assert.equal(api.getSession(),null);
  assert.equal(api.localStorage.getItem('vacleaner_session'),null);
}

console.log('Session tests passed: 4 scenarios.');
