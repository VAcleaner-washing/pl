// P2 prototype only: this does not alter workflow selection or release gates.
// Fail closed: require explicit change records, not filenames alone.
const ORDINARY_DOC = /^docs\/(?!VAcleaner-SYSTEM-SPEC\.md$|DEVELOPMENT-ROADMAP\.md$|CI-DIAGNOSTICS\.md$)[A-Za-z0-9][A-Za-z0-9._/-]*\.md$/;
const VALID_STATUS = new Set(['added', 'modified', 'removed']);

export function classifyPullRequestChanges(changes) {
  if (!Array.isArray(changes) || changes.length === 0) return {docsOnly: false, reason: 'missing-change-list'};
  // GitHub's PR files API exposes at most 3000 files; never trust a potentially truncated list.
  if (changes.length >= 3000) return {docsOnly: false, reason: 'github-file-list-limit'};
  for (const change of changes) {
    if (!change || typeof change !== 'object' || typeof change.filename !== 'string' || !change.filename ||
        !VALID_STATUS.has(change.status) || change.previous_filename || !ORDINARY_DOC.test(change.filename) ||
        change.filename.includes('..') || change.filename.includes('//')) {
      return {docsOnly: false, reason: 'unsafe-or-non-doc-change'};
    }
  }
  return {docsOnly: true, reason: 'ordinary-docs-only'};
}
