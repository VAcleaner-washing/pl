import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/ci-diagnostics.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vacleaner-ci-diagnostics-'));
const write = (file, content) => {
  const destination = path.join(temp, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
};
const run = (...args) => spawnSync(process.execPath, [script, ...args], {
  cwd: temp, encoding: 'utf8'
});
try {
  write('package.json', JSON.stringify({scripts: {
    'test:auth-recovery-browser': 'node auth.mjs',
    'test:one': 'node shared.mjs',
    'test:two': 'node shared.mjs'
  }}));
  write('config/qa-suites.json', JSON.stringify({
    static: ['test:one', 'test:two'],
    browser: ['test:auth-recovery-browser']
  }));
  write('.github/workflows/pages.yml', 'run: npm run test:auth-recovery-browser\n');
  const result = run('--json');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.counts, {static: 2, browser: 1});
  assert.deepEqual(report.missingScripts, []);
  assert.equal(report.identicalCommands.length, 1);
  assert.equal(report.identicalCommands[0].entries.length, 2);
  assert.equal(report.potentialDuplicateRuns[0].standaloneWorkflowStep, true);
  assert.equal(report.potentialDuplicateRuns[0].canonicalBrowserSuite, true);
  assert.equal(report.ownership.auth.length, 1);
  assert.match(run().stdout, /static: 2 suites/);
  write('config/qa-suites.json', JSON.stringify({static: ['test:missing'], browser: []}));
  const missing = run('--json');
  assert.equal(missing.status, 1);
  assert.deepEqual(JSON.parse(missing.stdout).missingScripts, [
    {group: 'static', name: 'test:missing'}
  ]);
  process.stdout.write('CI diagnostic fixture tests passed\n');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
