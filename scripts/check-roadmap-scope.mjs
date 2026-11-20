import fs from 'node:fs';

export function validateScope({body, files, number}) {
  const errors = [];
  // Historical PRs were created before this policy; never retroactively break their CI.
  if (number <= 86) return errors;
  const match = /^Roadmap:\s*(P[0-3])\s*[—-]\s*(\S[^\n]*)$/mi.exec(body || '');
  if (!match) errors.push('PR body must contain: Roadmap: P0|P1|P2|P3 — specific approved bullet');
  if (!/^Tests:\s*\S.+$/mi.test(body || '')) errors.push('PR body must contain: Tests: executed checks or explicit blocker');
  const phase = match?.[1];
  const forbidden = files.filter(file => /^(?:supabase\/|admin\/|public\/|src\/|assets\/|release\.json$|index\.html$|config\/admin-production-release\.json$)/.test(file));
  if (forbidden.length) errors.push('Product/runtime files require a separate approved product PR, not a process-roadmap PR: ' + forbidden.join(', '));
  if (phase === 'P3' && files.some(file => !file.startsWith('docs/') && !file.startsWith('.github/PULL_REQUEST_TEMPLATE'))) {
    errors.push('P3 is backlog documentation only; no code/workflow changes');
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const number = Number(process.env.PR_NUMBER);
  const body = process.env.PR_BODY || '';
  const files = fs.readFileSync(process.env.PR_FILES_FILE || 'pr-changed-files.txt', 'utf8').split('\n').map(x => x.trim()).filter(Boolean);
  const errors = validateScope({body, files, number});
  if (errors.length) {
    for (const error of errors) console.error('SCOPE GUARD: ' + error);
    process.exitCode = 1;
  } else console.log('Roadmap scope metadata and file boundary: OK');
}
