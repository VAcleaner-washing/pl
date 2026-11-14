import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {verifyStable4346,verifyRollbackRequest} from './verify-stable-4346.mjs';

let passed=0;
function check(name,run){run();passed++;console.log('PASS',name)}
const request={eventName:'workflow_dispatch',repository:'VAcleaner-washing/pl',ref:'refs/heads/main',mode:'restore_4346',confirmation:'ROLLBACK-4346'};
check('exact manual main restore request is accepted without executing a deployment',()=>assert.equal(verifyRollbackRequest(request).restoreRequested,true));
for(const [key,value] of [['eventName','pull_request'],['eventName','push'],['repository','other/pl'],['ref','refs/heads/qa/test'],['confirmation','rollback-4346'],['confirmation','ROLLBACK-4346 '],['confirmation',''],['mode','RESTORE_4346']]){
  check('invalid restore request refused: '+key+'='+value,()=>assert.throws(()=>verifyRollbackRequest({...request,[key]:value})));
}
check('default and explicit verify-only remain read-only on PRs',()=>{
  assert.equal(verifyRollbackRequest({eventName:'pull_request'}).restoreRequested,false);
  assert.equal(verifyRollbackRequest({...request,mode:'verify_only',confirmation:''}).restoreRequested,false);
});
const workflow=fs.readFileSync('.github/workflows/rollback-4346.yml','utf8');
const match=workflow.match(/  deploy:\n[\s\S]*?    if: >-\n([\s\S]*?)    runs-on:/);
assert(match,'Explicit restore deployment guard must exist');
const expression=match[1].trim().replace(/\n\s*/g,' ');
check('deployment guard rejects every incomplete combination of required conditions',()=>{
  for(let mask=0;mask<64;mask++){
    const context={github:{repository:mask&1?request.repository:'other/pl',ref:mask&2?request.ref:'refs/heads/qa/test',event_name:mask&4?request.eventName:'pull_request'},
      inputs:{mode:mask&8?request.mode:'verify_only',confirmation:mask&16?request.confirmation:''},needs:{prepare:{result:mask&32?'success':'failure'}}};
    assert.equal(Boolean(vm.runInNewContext(expression,context)),mask===63,'guard context '+mask);
  }
});
check('exact-case preflight and verified artifact protect the restore route',()=>{
  assert(workflow.includes('node scripts/verify-stable-4346.mjs --check-request'));
  assert(workflow.includes("ROLLBACK_MODE: ${{ inputs.mode || 'verify_only' }}"));
  assert(workflow.includes('ROLLBACK_CONFIRMATION: ${{ inputs.confirmation }}'));
  assert(workflow.includes('ref: 15bf61dc4da4cf63405a25887353e6ec7178dce8'));
  assert(workflow.includes('artifact_name: rollback-pages-4346'));
  assert(workflow.includes('group: pages-${{ github.ref }}'));
  assert(workflow.includes('name: github-pages'));
});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'va-4346-verifier-'));
try{
  const source=path.join(temp,'source');fs.mkdirSync(source);
  const archive=execFileSync('git',['archive','--format=tar','15bf61dc4da4cf63405a25887353e6ec7178dce8'],{maxBuffer:64*1024*1024});
  execFileSync('tar',['-xf','-','-C',source],{input:archive});
  execFileSync(process.execPath,['scripts/stamp-build.mjs'],{cwd:source});
  execFileSync(process.execPath,['scripts/build-pages.mjs'],{cwd:source});
  const artifact=path.join(source,'dist'),cname=path.join(artifact,'CNAME'),original=fs.readFileSync(cname);
  check('immutable source builds the exact reviewed270-file artifact',()=>assert.equal(verifyStable4346(artifact).files,270));
  check('changed file contents are rejected',()=>{fs.writeFileSync(cname,'wrong.invalid\n');assert.throws(()=>verifyStable4346(artifact));fs.writeFileSync(cname,original)});
  check('missing or added files are rejected',()=>{
    fs.unlinkSync(cname);assert.throws(()=>verifyStable4346(artifact));fs.writeFileSync(cname,original);
    const extra=path.join(artifact,'unexpected.txt');fs.writeFileSync(extra,'extra');assert.throws(()=>verifyStable4346(artifact));fs.unlinkSync(extra);
  });
  check('symlink substitutions are rejected',()=>{fs.unlinkSync(cname);fs.symlinkSync('release.json',cname);assert.throws(()=>verifyStable4346(artifact));fs.unlinkSync(cname);fs.writeFileSync(cname,original)});
  check('changing the manifest cannot redefine the approved baseline',()=>{
    const corrupt=path.join(temp,'manifest.json');fs.writeFileSync(corrupt,'{}');assert.throws(()=>verifyStable4346(artifact,corrupt),/manifest bytes changed/);
  });
}finally{fs.rmSync(temp,{recursive:true,force:true})}
console.log(JSON.stringify({passed,failed:0,deployments:0}));
