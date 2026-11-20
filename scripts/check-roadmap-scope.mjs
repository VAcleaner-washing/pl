import fs from 'node:fs';

const PROCESS_PATHS = [
  /^docs\\/DEVELOPMENT-ROADMAP\\.md$/,
  /^docs\\/CI-DIAGNOSTICS\\.md$/,
  /^scripts\\/(?:check-roadmap-scope|test-roadmap-scope|ci-diagnostics|test-ci-diagnostics|qa-timing-report|test-qa-timing-report)\\.mjs$/,
  /^\\.github\\/workflows\\/roadmap-scope\\.yml$/,
];
const PRODUCT_PATH = /^(?:supabase\\/|admin\\/|public\\/|src\\/|assets\\/|release\\.json$|index\\.html$|config\\/admin-production-release\\.json$)/;

export function validateScope({body, files, number}) {
  const errors = [];
  if (number <= 86) return errors; // Pre-policy PRs remain unaffected.
  const process = /^Initiative:\\s*process-modernization\\s*$/mi.test(body || '');
  const touchesProcess = files.some(file => PROCESS_PATHS.some(re => re.test(file)));
  // Ordinary product PRs are not subject to the temporary process initiative.
  if (!process && !touchesProcess) return errors;
  if (!process) errors.push('Process files require Initiative: process-modernization');
  const match = /^Roadmap:\\s*(P[0-3])\\s*[—-]\\s*(\\S[^\\n]*)$/mi.exec(body || '');
  if (!match) errors.push('Process PR must contain Roadmap: P0|P1|P2|P3 — approved bullet');
  if (!/^Tests:\\s*\\S.+$/mi.test(body || '')) errors.push('Process PR must contain Tests: executed checks or explicit blocker');
  const forbidden = files.filter(file => PRODUCT_PATH.test(file));
  if (forbidden.length) errors.push('Process PR cannot change product/runtime paths: ' + forbidden.join(', '));
  if (match?.[1] === 'P3' && files.some(file => !file.startsWith('docs/') && !file.startsWith('.github/PULL_REQUEST_TEMPLATE'))) {
    errors.push('P3 is backlog documentation only; no code/workflow changes');
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const number = Number(process.env.PR_NUMBER);
  const body = process.env.PR_BODY || '';
  const files = fs.readFileSync(process.env.PR_FILES_FILE || 'pr-changed-files.txt', 'utf8').split('\\n').map(x => x.trim()).filter(Boolean);
  const errors = validateScope({body, files, number});
  if (errors.length) {
    for (const error of errors) console.error('SCOPE GUARD: ' + error);
    process.exitCode = 1;
  } else console.log('Roadmap scope policy: OK');
}
