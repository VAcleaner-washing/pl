// Shared by build validation, source mutations and the actual engine witness.
// These are execution prerequisites, not a parallel application suite registry.
export const BROWSER_IMAGE = 'mcr.microsoft.com/playwright/python:v1.65.1-noble@sha256:0ab41a37431309d72b7a26f40ef1fdb464a62740196b2143965a2f59dc090409';
export const ENGINE_REQUIRED_STEPS = Object.freeze({
  canonical: Object.freeze(['checkout', 'setup_node', 'canonical_client', 'canonical_contracts', 'canonical_startup', 'download_artifact', 'extract_artifact', 'canonical_qa']),
  webkit: Object.freeze(['checkout', 'setup_node', 'webkit_client', 'webkit_contracts', 'webkit_startup', 'download_artifact', 'extract_artifact', 'webkit_artifact', 'webkit_retry', 'webkit_qa']),
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function engineOutcomeErrors({lane, jobStatus, steps}) {
  const errors = [];
  if (jobStatus !== 'success') errors.push('Engine job status must be success; failure/cancelled/missing/unknown is rejected');
  if (!Object.hasOwn(ENGINE_REQUIRED_STEPS, lane)) return [...errors, 'Missing or unknown engine lane'];
  if (!object(steps)) return [...errors, 'Missing engine step outcomes'];
  for (const id of ENGINE_REQUIRED_STEPS[lane]) {
    // outcome is the actual result before continue-on-error; conclusion is not evidence.
    if (!object(steps[id]) || steps[id].outcome !== 'success') errors.push(`${id} actual outcome must be success`);
  }
  return errors;
}

export function workflowJob(workflow, name) {
  return new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z0-9_-]*:\\n|$(?![\\s\\S]))`, 'm').exec(workflow)?.[0] || '';
}
export function workflowSteps(job) {
  return (job.split('    steps:\n')[1] || '').split(/(?=^      - )/m).filter(step => /^      - /m.test(step));
}
export function stepRun(step) {
  const match = /^        run: (.*)\n?/m.exec(step);
  if (!match) return '';
  if (match[1] !== '|') return match[1].trimEnd();
  return step.slice(match.index + match[0].length).split('\n').filter(line => line.startsWith('          ')).map(line => line.slice(10)).join('\n').trimEnd();
}
const laneIf = lane => `matrix.lane == '${lane}'`;
const field = (step, name) => new RegExp(`^        ${name}: (.*)$`, 'm').exec(step)?.[1];
const pip = 'python -m pip install --disable-pip-version-check -r requirements-ci.txt';
const rules = {
  canonical_client: [pip, 'canonical', '5'],
  canonical_contracts: ["python -m unittest discover -s scripts -p 'test_ci_browser_runtime.py'", 'canonical'],
  canonical_startup: ['python scripts/verify_ci_browser_runtime.py', 'canonical', '2'],
  canonical_qa: ['npm run qa:browser', 'canonical'],
  webkit_client: [pip + '\npython -m playwright --version', 'webkit', '15'],
  webkit_contracts: ["python -m unittest discover -s scripts -p 'test_public_hydration_retry.py'", 'webkit'],
  webkit_startup: [`mkdir -p webkit-test-results
python - <<'PY' 2>&1 | tee webkit-test-results/browser-startup.log
import platform
from playwright.sync_api import sync_playwright
print('Pinned runtime Python:', platform.python_version())
with sync_playwright() as p:
    browser = p.webkit.launch(headless=True)
    page = browser.new_page()
    page.goto("about:blank")
    print("WebKit startup smoke: OK")
    browser.close()
PY`, 'webkit'],
  webkit_artifact: ['npm run verify:artifact', 'webkit'],
  webkit_retry: ['python scripts/public_hydration_qa.py --root dist --browser webkit --booking-only --retry-injection recover --artifacts webkit-test-results/retry-recover\npython scripts/public_hydration_qa.py --root dist --browser webkit --booking-only --retry-injection fail-second --artifacts webkit-test-results/retry-fail-second', 'webkit', '12'],
  webkit_qa: ['npm run test:webkit', 'webkit', '20'],
};

export function browserRuntimePolicyErrors(workflow, requirements) {
  const errors = [], job = workflowJob(workflow, 'engines');
  if (!job) return ['Required engines job is missing'];
  if (!/^    runs-on: ubuntu-24\.04$/m.test(job)) errors.push('Engine runner must use Ubuntu 24.04');
  if (!/^    container:\n      image: (\S+)\n      options: --ipc=host$/m.test(job) || !job.includes(`      image: ${BROWSER_IMAGE}\n`)) errors.push('Engine runtime must use the reviewed immutable image and IPC settings');
  if (requirements.trim() !== 'playwright==1.65.1') errors.push('Playwright client must match the reviewed image');
  if (/actions\/(?:setup-python|cache)@|playwright install|(?:apt|apt-get) (?:install|update)/.test(job)) errors.push('Engine bootstrap must not reinstall image runtimes or host dependencies');
  // Exact reviewed matrix shape fails closed on new axes/excludes/serial caps.
  const strategy = /^    strategy:\n([\s\S]*?)(?=^    [a-z]|$(?![\s\S]))/m.exec(job)?.[1]?.trimEnd();
  if (strategy !== `      fail-fast: true
      matrix:
        include:
          - lane: canonical
            name: Browser QA aggregate gate
          - lane: webkit
            name: WebKit / mobile forms gate`) errors.push('Exactly canonical and WebKit matrix entries with native fail-fast required');
  if (!/^    name: \$\{\{ matrix\.name \}\}$/m.test(job) || !/^    needs: \[classify, validate\]$/m.test(job)) errors.push('Both engines must independently depend on classification and validated artifacts');
  if (!/^    if: needs\.classify\.outputs\.docs_only != 'true'$/m.test(job)) errors.push('Engine matrix must retain the classified lane predicate');
  if (!/^    permissions:\n      contents: read$/m.test(job) || /continue-on-error|actions: write/.test(job)) errors.push('Engines cannot bypass failure or gain cancellation write permission');

  const steps = workflowSteps(job), byId = new Map();
  for (const step of steps) {
    const id = field(step, 'id');
    if (id && byId.has(id)) errors.push('Duplicate engine step ' + id);
    if (id) byId.set(id, step);
  }
  for (const [id, [command, lane, timeout]] of Object.entries(rules)) {
    const step = byId.get(id) || '';
    if (stepRun(step) !== command || field(step, 'if') !== laneIf(lane) || field(step, 'timeout-minutes') !== timeout) errors.push(id + ' must retain its command, lane and timeout');
  }
  for (const lane of Object.keys(ENGINE_REQUIRED_STEPS)) {
    const expected = ENGINE_REQUIRED_STEPS[lane];
    const actual = steps.map(step => field(step, 'id')).filter(id => expected.includes(id));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(lane + ' setup/artifact/QA order is required');
  }
  for (const id of ['checkout', 'setup_node', 'download_artifact', 'extract_artifact']) {
    if (!byId.has(id) || field(byId.get(id), 'if') !== undefined) errors.push('Unconditional shared prerequisite required: ' + id);
  }
  if (!byId.get('checkout')?.includes('uses: actions/checkout@v4')) errors.push('Engine checkout required');
  if (!byId.get('setup_node')?.includes('uses: actions/setup-node@v4') || !byId.get('setup_node')?.includes('node-version: 22')) errors.push('Engine Node22 setup required');
  const download = byId.get('download_artifact') || '';
  if (!download.includes('uses: actions/download-artifact@v4') || !/^          name: github-pages$/m.test(download) || !/^          path: \.pages-artifact$/m.test(download) || /run-id:|repository:/.test(download)) errors.push('Both engines must download current-run canonical C');
  if (stepRun(byId.get('extract_artifact') || '') !== 'test ! -e dist\nmkdir dist\ntar -xf .pages-artifact/artifact.tar -C dist') errors.push('Validated C must be extracted without rebuilding');
  if (!byId.get('webkit_retry')?.includes("PYTHONUNBUFFERED: '1'") || !byId.get('webkit_qa')?.includes("PYTHONUNBUFFERED: '1'") || !byId.get('webkit_qa')?.includes('DEBUG: pw:browser')) errors.push('WebKit diagnostic environment must remain intact');

  const witness = byId.get('engine_witness') || '';
  if (field(witness, 'if') !== '${{ always() }}' || !witness.includes('ENGINE_LANE: ${{ matrix.lane }}') || !witness.includes('ENGINE_JOB_STATUS: ${{ job.status }}') || !witness.includes("ENGINE_STEPS: '${{ toJSON(steps) }}'")) errors.push('Witness must unconditionally bind actual lane/job status/step outcomes');
  const witnessRun = stepRun(witness);
  if (!witnessRun.includes('engineOutcomeErrors({lane, jobStatus: process.env.ENGINE_JOB_STATUS, steps: JSON.parse(process.env.ENGINE_STEPS)})') || !witnessRun.includes('process.exitCode = 1;') || /\|\| true|exit 0|\.conclusion/.test(witnessRun)) errors.push('Witness must fail closed on actual outcomes');
  if (steps.indexOf(witness) <= Math.max(...Object.keys(rules).map(id => steps.indexOf(byId.get(id))))) errors.push('Witness must follow both complete QA paths');
  const uploads = steps.filter(step => !field(step, 'id'));
  if (uploads.length !== 2) errors.push('Only the two owned evidence uploads may omit an engine step ID');
  for (const [lane, name] of [['canonical', 'browser'], ['webkit', 'webkit']]) {
    const upload = uploads.find(step => step.includes(`name: vacleaner-${name}-test-results`)) || '';
    if (field(upload, 'if') !== `\${{ always() && matrix.lane == '${lane}' }}` || !upload.includes('uses: actions/upload-artifact@v4') || steps.indexOf(upload) <= steps.indexOf(witness)) errors.push(lane + ' must retain its always-upload evidence after the witness');
  }
  const owned = new Set([...Object.values(ENGINE_REQUIRED_STEPS).flat(), 'engine_witness']);
  for (const id of byId.keys()) if (!owned.has(id)) errors.push('Unreviewed engine step ' + id);
  // Build validation and classifier fixtures must reject an unsafe consumer,
  // even when the engine producer itself is correctly pinned and complete.
  const deploy = workflowJob(workflow, 'deploy');
  const deployIf = /^    if: (.*)$/m.exec(deploy)?.[1];
  if (!/^    needs: \[validate, engines, operations\]$/m.test(deploy) ||
      deployIf !== "${{ always() && github.event_name == 'push' && github.ref == 'refs/heads/main' && needs.validate.result == 'success' && needs.engines.result == 'success' && needs.operations.result == 'success' }}") errors.push('Deployment must require every validated aggregate and remain main-push-only');
  if (!/^          artifact_name: production-pages$/m.test(deploy)) errors.push('Deployment must select the exact reviewed normal artifact');
  return errors;
}
