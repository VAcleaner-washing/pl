import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
assert.match(workflow, /classify:\n    name: PR change classification/);
assert.match(workflow, /node scripts\/test-classify-pr-changes\.mjs/);
assert.match(workflow, /node scripts\/ci-classify-pr\.mjs/);
for (const job of ['validate', 'browser', 'webkit', 'operations']) {
  const start = workflow.indexOf('\n  ' + job + ':');
  const nextJob = /^  [a-z][a-z-]*:\s*$/gm;
  nextJob.lastIndex = start + ('\n  ' + job + ':').length;
  const next = nextJob.exec(workflow);
  const end = next ? next.index : -1;
  assert.ok(start > -1, job + ' missing');
  const section = workflow.slice(start, end < 0 ? undefined : end);
  assert.match(section, /if: needs\.classify\.outputs\.docs_only != 'true'/, job + ' must be guarded');
}
assert.match(workflow, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
assert.match(workflow, /needs\.validate\.result == 'success' && needs\.browser\.result == 'success' && needs\.webkit\.result == 'success' && needs\.operations\.result == 'success'/);
assert.match(workflow, /needs: \[validate, browser, webkit, operations\]/);
console.log('P2 selective PR CI and full release gate contract passed');
