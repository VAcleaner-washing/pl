import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateMergeReadiness} from './check-merge-readiness.mjs';
import {browserRuntimePolicyErrors, engineOutcomeErrors, ENGINE_REQUIRED_STEPS} from './ci-browser-runtime-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const evaluator = path.join(root, 'scripts/check-merge-readiness.mjs');
const repository = 'VAcleaner-washing/pl';
const gates = ['validate', 'engines', 'operations'];
// Retain the old named canonical/WebKit failure domains while their native
// job results are now aggregated. Producer outcome tests remain lane-specific.
const failureDomains = ['validate', 'canonical', 'webkit', 'operations'];
const aggregateKey = name => ['canonical', 'webkit'].includes(name) ? 'engines' : name;
function fixture(eventName = 'pull_request', docsOnly = false) {
  const event = {repository: {full_name: repository}};
  let ref = 'refs/pull/101/merge', baseRef = 'main';
  if (eventName === 'pull_request') Object.assign(event, {action: 'opened', number: 101, pull_request: {number: 101, base: {ref: baseRef}, head: {sha: '1'.repeat(40)}}});
  else {
    baseRef = '';
    ref = eventName === 'push' ? 'refs/heads/main' : 'refs/heads/ci/readiness-test';
    if (eventName === 'push') Object.assign(event, {ref, deleted: false});
  }
  return {eventName, ref, baseRef, repository, event, workflowCancelled: 'false', needs: {
    classify: {result: 'success', outputs: {docs_only: String(docsOnly)}},
    ...Object.fromEntries(gates.map(name => [name, {result: docsOnly ? 'skipped' : 'success', outputs: {}}])),
  }};
}
const cases = [];
function accept(name, input, lane) { cases.push({name, input, lane}); }
function reject(name, mutate, input = fixture()) { mutate(input); cases.push({name, input, lane: null}); }
accept('real PR full lane', fixture(), 'full');
accept('real PR docs-only lane with skipped gates', fixture('pull_request', true), 'docs-only');
accept('main push full lane', fixture('push'), 'full');
accept('manual dispatch full lane', fixture('workflow_dispatch'), 'full');
const qa = fixture('push'); qa.ref = qa.event.ref = 'refs/heads/qa/readiness'; accept('existing qa push full lane', qa, 'full');
const tag = fixture('workflow_dispatch'); tag.ref = 'refs/tags/release-test'; tag.event.ref = 'release-test'; accept('dispatch tag stays full', tag, 'full');
for (const action of ['synchronize', 'reopened']) { const f = fixture('pull_request', true); f.event.action = action; accept('eligible PR action ' + action, f, 'docs-only'); }
const rehearsal = fixture('pull_request', true); rehearsal.baseRef = rehearsal.event.pull_request.base.ref = 'ip02a-rehearsal-base'; accept('reviewed workflow admits isolated rehearsal target', rehearsal, 'docs-only');

for (const event of ['push', 'workflow_dispatch']) reject(event + ' must never accept docs-only', x => {}, fixture(event, true));
for (const event of ['schedule', 'pull_request_target', 'merge_group', '', null, undefined]) reject('unknown event ' + event, x => { x.eventName = event; });
for (const flag of [true, false, '', 'TRUE', ' false', null, undefined, 0]) reject('unknown classifier output ' + String(flag), x => { x.needs.classify.outputs.docs_only = flag; });
reject('missing classifier outputs', x => { delete x.needs.classify.outputs; });
for (const result of ['failure', 'cancelled', 'skipped', 'neutral', '', null, undefined]) reject('classifier result ' + String(result), x => { x.needs.classify.result = result; });
for (const domain of ['classify', ...failureDomains]) {
  const gate = aggregateKey(domain);
  reject('missing dependency ' + domain, x => { delete x.needs[gate]; });
  reject('invalid dependency object ' + domain, x => { x.needs[gate] = null; });
  reject('unknown result ' + domain, x => { x.needs[gate].result = 'neutral'; });
}
reject('unknown extra dependency requires policy update', x => { x.needs.extra = {result: 'success'}; });
for (const value of [null, undefined, [], 'success']) reject('invalid needs object', x => { x.needs = value; });
for (const domain of failureDomains) {
  const gate = aggregateKey(domain);
  for (const result of ['failure', 'cancelled', 'skipped', 'neutral', null, undefined]) reject('full ' + domain + ':' + String(result), x => { x.needs[gate].result = result; });
  for (const result of ['success', 'failure', 'cancelled', 'neutral', null, undefined]) reject('docs ' + domain + ':' + String(result), x => { x.needs[gate].result = result; }, fixture('pull_request', true));
}
for (const f of [fixture(), fixture('pull_request', true), fixture('push'), fixture('workflow_dispatch')]) reject('explicit cancellation overrides otherwise green lane ' + f.eventName, x => { x.workflowCancelled = 'true'; }, f);
for (const value of [true, false, '', undefined, null, 'False']) reject('missing/unknown cancellation state', x => { x.workflowCancelled = value; });
reject('missing event payload', x => { x.event = null; });
reject('repository mismatch', x => { x.event.repository.full_name = 'another/product'; });
reject('missing repository', x => { delete x.repository; });
reject('PR number/ref mismatch', x => { x.ref = 'refs/pull/102/merge'; });
reject('PR is not a runner merge ref', x => { x.ref = 'refs/heads/main'; });
reject('missing PR metadata', x => { delete x.event.pull_request; });
reject('PR top-level number mismatch', x => { x.event.number = 102; });
reject('PR base mismatch', x => { x.event.pull_request.base.ref = 'another-base'; });
reject('PR head missing', x => { delete x.event.pull_request.head; });
reject('PR head malformed', x => { x.event.pull_request.head.sha = 'not-a-sha'; });
reject('unsupported PR action', x => { x.event.action = 'closed'; });
reject('main push missing exact payload ref', x => { delete x.event.ref; }, fixture('push'));
reject('deleted push ref', x => { x.event.deleted = true; }, fixture('push'));
reject('push outside configured branch selectors', x => { x.ref = x.event.ref = 'refs/heads/feature'; }, fixture('push'));
reject('push cannot masquerade as PR', x => { x.event.pull_request = {}; }, fixture('push'));
reject('dispatch cannot masquerade as PR', x => { x.event.pull_request = {}; }, fixture('workflow_dispatch'));
reject('dispatch ref mismatch', x => { x.event.ref = 'another-branch'; }, fixture('workflow_dispatch'));
reject('missing runner ref', x => { delete x.ref; });

// A stale independent-engine schema cannot be accepted by the new aggregate.
for (const old of ['browser', 'webkit']) reject('old extra gate ' + old, x => { x.needs[old] = {result: 'success'}; });
for (const lane of ['canonical', 'webkit']) {
  for (const outcome of ['failure', 'cancelled', 'skipped', 'neutral', undefined]) {
    const steps = Object.fromEntries(ENGINE_REQUIRED_STEPS[lane].map(id => [id, {outcome: 'success', conclusion: 'success'}]));
    steps[lane === 'canonical' ? 'canonical_qa' : 'webkit_qa'] = {outcome, conclusion: 'success'};
    assert.ok(engineOutcomeErrors({lane, cancelled: 'false', steps}).length, lane + ' actual producer failure must reject despite conclusion success');
    reject(lane + ' producer ' + String(outcome) + ' cannot admit release', x => { x.needs.engines.result = outcome; });
  }
}

function assertDecisions(evaluate) {
  for (const row of cases) {
    if (row.lane === null) assert.throws(() => evaluate(structuredClone(row.input)), undefined, row.name);
    else {
      const result = evaluate(structuredClone(row.input));
      assert.equal(result.accepted, true, row.name);
      assert.equal(result.lane, row.lane, row.name);
    }
  }
}
assertDecisions(evaluateMergeReadiness);
// The corpus must actually kill an always-green evaluator, not mirror its output.
assert.throws(() => assertDecisions(x => ({accepted: true, lane: x.needs.classify.outputs.docs_only === 'true' ? 'docs-only' : 'full'})), assert.AssertionError);

function job(source, name) {
  const start = source.indexOf('\n  ' + name + ':\n');
  assert.ok(start >= 0, 'missing job ' + name);
  const tail = source.slice(start + 1);
  const next = /^  [a-z][a-z0-9_-]*:\s*$/gm; next.lastIndex = ('  ' + name + ':\n').length;
  const end = next.exec(tail);
  return end ? tail.slice(0, end.index) : tail;
}
function assertWorkflow(source) {
  const classify = job(source, 'classify'), ready = job(source, 'readiness');
  assert.deepEqual(browserRuntimePolicyErrors(source, fs.readFileSync(path.join(root, 'requirements-ci.txt'), 'utf8')), [], 'both required engine producers and actual-outcome binding');
  const fixtures = classify.indexOf('node scripts/test-merge-readiness.mjs');
  assert.ok(fixtures >= 0 && fixtures < classify.indexOf('node scripts/ci-classify-pr.mjs'), 'negative fixtures must run before classification/full CI');
  assert.match(ready, /^    name: Release readiness\s*$/m);
  assert.match(ready, /^    if: \$\{\{ always\(\) \}\}\s*$/m);
  const needs = /^    needs: \[([^\]]+)\]/m.exec(ready);
  assert.ok(needs, 'readiness dependencies');
  assert.deepEqual(needs[1].split(',').map(x => x.trim()).sort(), ['classify', ...gates].sort());
  assert.doesNotMatch(ready, /continue-on-error|strategy:|matrix:|actions: write|pages: write|id-token: write/);
  assert.match(ready, /^      contents: read\s*$/m);
  assert.match(ready, /persist-credentials: false/);
  assert.match(ready, /^          READINESS_NEEDS: '\$\{\{ toJSON\(needs\) \}\}'\s*$/m);
  assert.match(ready, /^        id: decision\s*$/m);
  assert.match(ready, /^        if: \$\{\{ !cancelled\(\) && success\(\) \}\}\s*$/m);
  assert.match(ready, /^          READINESS_CANCELLED: 'false'\s*$/m);
  assert.match(ready, /^        if: \$\{\{ always\(\) && \(cancelled\(\) \|\| steps\.decision\.outcome != 'success'\) \}\}\s*$/m);
  assert.match(ready, /echo 'Release readiness rejected: cancelled or decision did not succeed' >&2\n          exit 1/);
  assert.match(ready, /^        run: node scripts\/check-merge-readiness\.mjs\s*$/m);
  assert.match(ready, /actions\/checkout@v4/);
  assert.match(ready, /node-version: 22/);
}
const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
assertWorkflow(workflow);
const mutations = [
  s => s.replace('node scripts/test-merge-readiness.mjs', 'node scripts/missing-fixtures.mjs'),
  s => s.replace('    name: Release readiness', '    name: Conditional readiness'),
  s => s.replace('if: ${{ always() }}\n    needs: [classify, validate, engines, operations]', 'if: ${{ !cancelled() }}\n    needs: [classify, validate, engines, operations]'),
  s => s.replace('needs: [classify, validate, engines, operations]', 'needs: [classify, validate, operations]'),
  s => s.replace('    name: Release readiness', '    name: Release readiness\n    continue-on-error: true'),
  s => s.replace('    name: Release readiness', '    name: Release readiness\n    strategy:\n      matrix:\n        probe: [1, 2]'),
  s => s.replace("READINESS_NEEDS: '${{ toJSON(needs) }}'", "READINESS_NEEDS: '${{ toJSON(inputs) }}'"),
  s => s.replace('if: ${{ !cancelled() && success() }}', 'if: ${{ success() }}'),
  s => s.replace("if: ${{ always() && (cancelled() || steps.decision.outcome != 'success') }}", "if: ${{ failure() }}"),
  s => s.replace("exit 1\n\n  deploy:", "exit 0\n\n  deploy:"),
  s => s.replace('run: node scripts/check-merge-readiness.mjs', 'run: node scripts/check-merge-readiness.mjs || true'),
];
for (const mutate of mutations) {
  const changed = mutate(workflow); assert.notEqual(changed, workflow, 'mutation applied');
  assert.throws(() => assertWorkflow(changed), assert.AssertionError, 'unsafe workflow mutation rejected');
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vacleaner-readiness-'));
try {
  const eventFile = path.join(temp, 'event.json');
  function cli(input, overrides = {}, args = []) {
    fs.writeFileSync(eventFile, JSON.stringify(input.event));
    const env = {...process.env, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: input.eventName, GITHUB_REF: input.ref,
      GITHUB_BASE_REF: input.baseRef ?? '', GITHUB_REPOSITORY: input.repository, GITHUB_EVENT_PATH: eventFile,
      READINESS_NEEDS: JSON.stringify(input.needs), READINESS_CANCELLED: input.workflowCancelled, ...overrides};
    const result = spawnSync(process.execPath, [evaluator, ...args], {env, encoding: 'utf8'});
    assert.ifError(result.error); assert.equal(result.signal, null);
    return result;
  }
  for (const input of [fixture(), fixture('pull_request', true), fixture('push'), fixture('workflow_dispatch')]) {
    const result = cli(input); assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).accepted, true);
  }
  const bad = [
    [fixture('push', true), {}], [fixture('workflow_dispatch', true), {}],
    [fixture(), {READINESS_CANCELLED: 'true'}], [fixture(), {READINESS_CANCELLED: ''}],
    [fixture(), {READINESS_NEEDS: '{broken'}], [fixture(), {READINESS_NEEDS: ''}],
    [fixture(), {GITHUB_EVENT_PATH: path.join(temp, 'missing.json')}], [fixture(), {GITHUB_ACTIONS: 'false'}],
    [fixture(), {GITHUB_EVENT_NAME: 'pull_request_target'}], [fixture(), {GITHUB_REF: 'refs/heads/main'}],
  ];
  for (const [input, overrides] of bad) {
    const result = cli(input, overrides); assert.equal(result.status, 1, result.stdout); assert.equal(result.stdout, ''); assert.equal(JSON.parse(result.stderr).accepted, false);
  }
  assert.equal(cli(fixture(), {}, ['--docs-only']).status, 1, 'CLI cannot override actual event/lane');
} finally { fs.rmSync(temp, {recursive: true, force: true}); }

console.log(JSON.stringify({policyCases: cases.length, positive: cases.filter(x => x.lane).length,
  negative: cases.filter(x => !x.lane).length, workflowMutationsRejected: mutations.length,
  alwaysGreenMutantRejected: true, cliCases: 15, automaticCiFixtures: true, failed: 0}));
