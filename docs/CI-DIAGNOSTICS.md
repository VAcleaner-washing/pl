# CI diagnostics — process audit

This is a read-only inventory for the P0–P3 development audit. It does not change
runtime behavior, business rules, CI gates, or the normative product contract in
[VAcleaner-SYSTEM-SPEC.md](VAcleaner-SYSTEM-SPEC.md).

## Commands

- `node scripts/ci-diagnostics.mjs` — human-readable summary.
- `node scripts/ci-diagnostics.mjs --json` — complete machine-readable inventory.
- `node scripts/test-ci-diagnostics.mjs` — isolated fixture regression tests.

The tool reads `package.json`, `config/qa-suites.json`, and
`.github/workflows/pages.yml`. It reports suite counts, missing package scripts,
identical command strings, and inferred ownership based on script-name prefixes.
Ownership is **heuristic**, not a confirmed team assignment.

Potential duplicate runs are **leads for review**, not proof that scenarios or
assertions are equivalent. Do not remove a test or workflow step based on this
report alone. A missing package script makes the command exit nonzero.

## Release safety

Run fixture tests and inspect the report in CI before considering this audit
complete. Keep the PR in draft until verification is available. Do not use this
inventory as evidence of a successful production deployment.

## Speed baseline (P0, before optimization)

The existing `scripts/qa-full.mjs` already records per-suite `durationMs` in
`qa-release-summary.json`. Run `node scripts/qa-timing-report.mjs` after
`npm run qa:static` (or pass a summary path); `--json` produces a sortable
machine-readable baseline. `node scripts/test-qa-timing-report.mjs` verifies
missing/invalid inputs and ordering with isolated fixtures. CI now prints the
static-suite top ten even when the static gate fails.

**Limitations:** the report covers only suites that actually executed and does
not measure runner startup, browser installation, other jobs, or the critical
path. A failing suite short-circuits the remainder; do not compare partial runs
with full runs. Record at least three successful baseline runs before changing
test selection. Do not skip booking, finance, artifact provenance or release
gates based on file extensions alone.

**Next step:** use these measurements and per-job GitHub Actions durations to
identify duplicated work and design a fast PR feedback lane; preserve complete
release acceptance until change-impact mapping is behaviorally validated.
