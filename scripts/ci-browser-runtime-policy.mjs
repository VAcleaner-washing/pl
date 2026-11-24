// Shared by the build gate and CI contract tests. This checks the job that
// actually runs canonical QA, rather than matching an image in another job.
export const BROWSER_IMAGE = 'mcr.microsoft.com/playwright/python:v1.65.1-noble@sha256:0ab41a37431309d72b7a26f40ef1fdb464a62740196b2143965a2f59dc090409';

export function browserRuntimePolicyErrors(workflow, requirements) {
  const errors = [];
  const job = /\n  browser:\n([\s\S]*?)(?=\n  [a-z][a-z0-9_-]*:\n|$)/.exec(workflow)?.[1] || '';
  if (!job) return ['Canonical browser job is missing'];
  if (!/^    runs-on: ubuntu-24\.04$/m.test(job)) errors.push('Browser runner must use Ubuntu 24.04');
  if (!/^    container:\n      image: (\S+)\n      options: --ipc=host$/m.test(job) || !job.includes(`      image: ${BROWSER_IMAGE}\n`)) errors.push('Browser runtime must use the reviewed immutable image and IPC settings');
  if (requirements.trim() !== 'playwright==1.65.1') errors.push('Playwright client must match the reviewed image');
  if (/actions\/(?:setup-python|cache)@|playwright install|(?:apt|apt-get) (?:install|update)/.test(job)) errors.push('Canonical browser bootstrap must not reinstall image runtimes or host dependencies');
  const pip = job.indexOf('python -m pip install --disable-pip-version-check -r requirements-ci.txt');
  const fixtures = job.indexOf("python -m unittest discover -s scripts -p 'test_ci_browser_runtime.py'");
  const startup = job.indexOf('python scripts/verify_ci_browser_runtime.py');
  const qa = job.indexOf('npm run qa:browser');
  if (!(pip >= 0 && fixtures > pip && startup > fixtures && qa > startup)) errors.push('Matching client, failure fixtures and both-engine startup must precede canonical browser QA');
  return errors;
}
