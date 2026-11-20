import assert from 'node:assert/strict';
import {classifyPullRequestChanges as classify} from './classify-pr-changes.mjs';
const file = (filename, status = 'modified') => ({filename, status});
assert.deepEqual(classify([file('docs/FAQ.md'), file('docs/guides/usage.md', 'added')]), {docsOnly: true, reason: 'ordinary-docs-only'});
for (const changes of [
  [], null, [file('docs/FAQ.md'), file('src/app.js')],
  [file('docs/VAcleaner-SYSTEM-SPEC.md')], [file('docs/DEVELOPMENT-ROADMAP.md')],
  [file('docs/CI-DIAGNOSTICS.md')], [file('.github/workflows/pages.yml')],
  [file('README.md')], [file('docs/FAQ.md', 'renamed')],
  [{...file('docs/FAQ.md'), previous_filename: 'src/app.js'}],
  [file('docs/../src/app.md')], [file('docs//FAQ.md')],
  [file('docs/FAQ.md'), file('package.json')], [file('docs/FAQ.md'), file('config/qa-suites.json')],
  [file('docs/FAQ.md'), file('release.json')], [file('docs/FAQ.md'), file('dist/app.js')],
  [file('docs/FAQ.md', 'unknown')], [{}]
]) assert.equal(classify(changes).docsOnly, false, JSON.stringify(changes));
console.log('P2 docs-only classifier fixtures passed (prototype; no CI gating enabled)');
