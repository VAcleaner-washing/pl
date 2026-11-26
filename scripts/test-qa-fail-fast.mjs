import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=mkdtempSync(path.join(tmpdir(),'vacleaner-qa-gate-'));
try{
  mkdirSync(path.join(root,'scripts'));
  mkdirSync(path.join(root,'config'));
  cpSync(new URL('./qa-full.mjs',import.meta.url),path.join(root,'scripts','qa-full.mjs'));
  writeFileSync(path.join(root,'config','qa-suites.json'),JSON.stringify({static:['pass','fail','after-failure'],browser:['browser-suite']}));
  writeFileSync(path.join(root,'package.json'),JSON.stringify({scripts:{stamp:'true',pass:'true',fail:'false','after-failure':'true',build:'true','verify:artifact':'true','browser-suite':'true'}}));
  const bin=path.join(root,'bin');mkdirSync(bin);
  const fakeNpm=path.join(bin,'npm');
  writeFileSync(fakeNpm,'#!/bin/sh\necho "$*" >> "$QA_CALL_LOG"\ncase "$*" in "run fail") exit 9;; esac\nexit 0\n',{mode:0o755});
  const log=path.join(root,'calls.log');
  const run=spawnSync(process.execPath,['scripts/qa-full.mjs','full'],{cwd:root,encoding:'utf8',env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,QA_CALL_LOG:log}});
  assert.equal(run.status,1,run.stdout+'\n'+run.stderr);
  const calls=readFileSync(log,'utf8');
  assert.match(calls,/run stamp/);
  assert.match(calls,/run pass/);
  assert.match(calls,/run fail/);
  for(const skipped of ['after-failure','build','verify:artifact','browser-suite'])assert.doesNotMatch(calls,new RegExp('run '+skipped));
  const summary=JSON.parse(readFileSync(path.join(root,'qa-release-summary.json'),'utf8'));
  assert.equal(summary.blockedBy,'fail');
  assert.equal(summary.failed,1);
  assert.equal(summary.total,3);
  assert.ok(summary.skipped);
  writeFileSync(path.join(root,'config','qa-suites.json'),JSON.stringify({static:['pass'],browser:['browser-suite']}));
  writeFileSync(fakeNpm,'#!/bin/sh\necho "$*" >> "$QA_CALL_LOG"\ncase "$*" in "run verify:artifact") exit 9;; esac\nexit 0\n',{mode:0o755});
  writeFileSync(log,'');
  const browser=spawnSync(process.execPath,['scripts/qa-full.mjs','browser'],{cwd:root,encoding:'utf8',env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,QA_CALL_LOG:log}});
  assert.equal(browser.status,1,browser.stdout+'\n'+browser.stderr);
  const browserCalls=readFileSync(log,'utf8');
  assert.match(browserCalls,/run verify:artifact/);
  assert.doesNotMatch(browserCalls,/run browser-suite/);
  const browserSummary=JSON.parse(readFileSync(path.join(root,'qa-release-summary.json'),'utf8'));
  assert.equal(browserSummary.blockedBy,'verify:artifact');
  console.log('QA fail-fast regression passed (static and browser prerequisite)');

  // Exercise the unchanged runner with the real registry, faking only npm's
  // suite processes. A hand-written mini-registry cannot prove actual order.
  const canonical=JSON.parse(readFileSync(new URL('../config/qa-suites.json',import.meta.url),'utf8')).browser;
  const auth='test:auth-recovery-browser';
  assert.equal(canonical[0],auth);
  assert.equal(canonical.filter(name=>name===auth).length,1);
  assert.ok(canonical.length>1,'need a later suite to verify auth fail-fast');
  writeFileSync(path.join(root,'config','qa-suites.json'),JSON.stringify({static:[],browser:canonical}));
  writeFileSync(path.join(root,'package.json'),JSON.stringify({scripts:Object.fromEntries(['verify:artifact',...canonical].map(name=>[name,'true']))}));
  writeFileSync(fakeNpm,'#!/bin/sh\necho "$*" >> "$QA_CALL_LOG"\nif [ "$*" = "run $QA_FAIL_SUITE" ]; then exit 9; fi\nexit 0\n',{mode:0o755});
  for(const failure of ['', 'verify:artifact',auth,canonical[1]]){
    writeFileSync(log,'');
    const result=spawnSync(process.execPath,['scripts/qa-full.mjs','browser'],{cwd:root,encoding:'utf8',env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,QA_CALL_LOG:log,QA_FAIL_SUITE:failure}});
    assert.equal(result.status,failure?1:0,result.stdout+'\n'+result.stderr);
    const expected=['verify:artifact',...canonical];
    if(failure)expected.splice(expected.indexOf(failure)+1);
    const actual=readFileSync(log,'utf8').trim().split('\n');
    assert.deepEqual(actual,expected.map(name=>'run '+name),`exact dispatch order through ${failure||'full success'}`);
    assert.equal(actual.filter(command=>command==='run '+auth).length,failure==='verify:artifact'?0:1,'auth dispatched once after artifact verification, never retried');
    const evidence=JSON.parse(readFileSync(path.join(root,'qa-release-summary.json'),'utf8'));
    assert.equal(evidence.blockedBy,failure||null);
    assert.equal(evidence.failed,failure?1:0);
    assert.equal(evidence.passed,expected.length-(failure?1:0));
    assert.equal(evidence.total,expected.length);
    assert.deepEqual(evidence.results.map(item=>item.name),expected);
    assert.deepEqual(evidence.results.map(item=>item.status),expected.map(name=>name===failure?'failure':'success'));
    assert.equal(evidence.skipped,failure?'Remaining suites skipped after first failing prerequisite':null);
    if(failure){
      assert.equal(evidence.results.at(-1).exitCode,9);
      assert.match(result.stderr,/FULL QA NOT GREEN/);
    }else assert.match(result.stdout,/FULL QA GREEN/);
  }
  console.log('QA canonical browser ownership regression passed (full order, artifact/auth/later failure, summary and exit status)');
}finally{rmSync(root,{recursive:true,force:true});}
