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
// A real PR may span several GitHub API pages. Classification must use every file.
assert.equal(classify(Array.from({length: 201}, (_, i) => file(`docs/guide-${i}.md`))).docsOnly, true);
assert.equal(classify([...Array.from({length: 200}, (_, i) => file(`docs/guide-${i}.md`)), file('scripts/unsafe.mjs')]).docsOnly, false);
assert.equal(classify([file('docs/FAQ.md', 'removed')]).docsOnly, true);
assert.deepEqual(classify(Array.from({length: 3000}, (_, i) => file(`docs/guide-${i}.md`))), {docsOnly: false, reason: 'github-file-list-limit'});
assert.equal(classify(Array.from({length: 2999}, (_, i) => file(`docs/guide-${i}.md`))).docsOnly, true);
assert.equal(classify([{...file('docs/FAQ.md'), previous_filename: 'docs/old.md'}]).docsOnly, false);
console.log('P2 docs-only classifier fixtures passed (including multi-page and mixed-file cases)');
