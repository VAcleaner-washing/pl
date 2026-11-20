import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const script = path.resolve('scripts/qa-timing-report.mjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vacleaner-qa-timing-'));
const file = path.join(dir, 'summary.json');
const run = (...args) => spawnSync(process.execPath, [script, file, ...args], {encoding:'utf8'});
try {
  assert.equal(run().status, 2, 'Missing summary must not appear successful');
  fs.writeFileSync(file, 'invalid');
  assert.equal(run().status, 2, 'Malformed JSON must fail');
  fs.writeFileSync(file, JSON.stringify({mode:'static',results:[{name:'bad',durationMs:-1}]}));
  assert.equal(run().status, 2, 'Negative durations must fail');
  fs.writeFileSync(file, JSON.stringify({mode:'static',blockedBy:'test:slow',results:[
    {name:'test:fast',durationMs:1500,status:'success'},
    {name:'test:slow',durationMs:10500,status:'failure'}
  ]}));
  const result = run('--json');
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.totalSeconds, 12);
  assert.equal(data.slowest[0].suite, 'test:slow');
  assert.equal(data.blockedBy, 'test:slow');
  assert.equal(data.executed, 2);
  console.log('QA timing report fixture tests passed');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
