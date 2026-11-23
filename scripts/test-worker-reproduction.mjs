import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Exercise the actual workflow shell with an inert Python substitute. This
// checks aggregation behavior; it never launches a browser or accesses an API.
const workflow = fs.readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
const section = workflow.split('      - name: Repeat unmodified worker test with fresh processes and retain every failure\n')[1];
assert.ok(section, 'diagnostic step exists');
const block = section.match(/        run: \|\n((?:          .*\n)+)/)?.[1];
assert.ok(block, 'diagnostic command exists');
const command = block.split('\n').filter(Boolean).map(line => line.slice(10)).join('\n');

for (const failedIteration of [0, 3]) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-worker-contract-'));
  try {
    const bin = path.join(directory, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'python'), `#!/usr/bin/env bash
fixture_artifact="\${!#}"
if [[ "$VAC_WORKER_FIXTURE_FAILURE" != "0" && "$fixture_artifact" == */run-"$VAC_WORKER_FIXTURE_FAILURE" ]]; then
  printf '%s\\n' '{"fixture":true,"passed":false}'
  exit 7
fi
printf '%s\\n' '{"fixture":true,"passed":true}'
`, {mode: 0o755});
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', command], {
      cwd: directory,
      env: {...process.env, PATH: bin + path.delimiter + process.env.PATH,
        VAC_WORKER_FIXTURE_FAILURE: String(failedIteration)},
      encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, failedIteration ? 1 : 0, result.stderr);
    const statuses = fs.readFileSync(path.join(directory, 'worker-repro-results/exit-status.tsv'), 'utf8').trim().split('\n');
    assert.equal(statuses.length, 10, 'all attempts retained, including attempts after failure');
    for (let index = 0; index < 10; index++) {
      assert.equal(statuses[index], `${index + 1}\t${index + 1 === failedIteration ? 7 : 0}`);
      assert.ok(fs.existsSync(path.join(directory, `worker-repro-results/run-${index + 1}.log`)));
    }
    console.log(`PASS diagnostic aggregation: ${failedIteration ? 'failure 3 remains failure after seven later successes' : 'ten successes'}`);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}
