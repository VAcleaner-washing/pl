# Historical regression archive

Files matching `scripts/test-v*.mjs` preserve the exact checks introduced by historical releases. They are audit evidence, not an ever-growing canonical release gate.

- `npm run test:current-contracts` runs the curated current-state contracts grouped in `config/qa-suites.json`.
- `npm run qa:legacy` runs the complete historical archive on demand.
- `npm run qa:static` runs current contracts only. A new release updates the relevant current domain contract instead of adding another permanent version-named gate.

