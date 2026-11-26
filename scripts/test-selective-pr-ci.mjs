import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workflowJob, browserRuntimePolicyErrors} from './ci-browser-runtime-policy.mjs';
const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
const requirements = readFileSync(new URL('../requirements-ci.txt', import.meta.url), 'utf8');
function assertWorkflow(source) {
  assert.match(source, /classify:\n    name: PR change classification/);
  assert.match(source, /node scripts\/test-classify-pr-changes\.mjs/);
  assert.match(source, /node scripts\/ci-classify-pr\.mjs/);
  for (const job of ['validate', 'engines', 'operations']) {
    const section = workflowJob(source, job);
    assert.ok(section, job + ' missing');
    assert.match(section, /^    if: needs\.classify\.outputs\.docs_only != 'true'$/m, job + ' must be guarded');
  }
  assert.deepEqual(browserRuntimePolicyErrors(source, requirements), [], 'both full engine producers remain mandatory');
  const ready = workflowJob(source, 'readiness'), deploy = workflowJob(source, 'deploy');
  assert.match(ready, /^    if: \$\{\{ always\(\) \}\}$/m);
  assert.match(ready, /^    needs: \[classify, validate, engines, operations\]$/m);
  assert.match(deploy, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(deploy, /needs\.validate\.result == 'success' && needs\.engines\.result == 'success' && needs\.operations\.result == 'success'/);
  assert.match(deploy, /^    needs: \[validate, engines, operations\]$/m);
  assert.match(deploy, /^          artifact_name: production-pages$/m);
}
assertWorkflow(workflow);
const mutations = [
  s=>s.replace("if: needs.classify.outputs.docs_only != 'true'",'if: true'),
  s=>s.replace("    needs: [classify, validate]\n    if: needs.classify.outputs.docs_only != 'true'","    needs: [classify, validate]\n    if: false"),
  s=>s.replace('needs: [classify, validate, engines, operations]','needs: [classify, validate, operations]'),
  s=>s.replace("needs.engines.result == 'success' && ",''),
  s=>s.replace(" && needs.operations.result == 'success'",''),
  s=>s.replace("github.event_name == 'push'","github.event_name == 'pull_request'"),
  s=>s.replace("github.ref == 'refs/heads/main'","github.ref != 'refs/heads/main'"),
  s=>s.replace('needs: [validate, engines, operations]','needs: [validate, operations]'),
  s=>s.replace('artifact_name: production-pages','artifact_name: github-pages'),
];
for (const mutate of mutations) {
  const changed=mutate(workflow);assert.notEqual(changed,workflow,'mutation applied');
  assert.throws(()=>assertWorkflow(changed),assert.AssertionError,'unsafe lane/deployment mutation rejected');
}
console.log(`P2 selective PR CI and full release gate contract passed; ${mutations.length} unsafe lane/deployment mutations rejected`);
