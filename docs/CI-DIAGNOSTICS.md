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

## Observed workflow topology (2026-11-20, P1 inventory)

Inspected `.github/workflows/pages.yml` on main and the in-progress PR runs
#85 (44661270471), #86 (44660968293), #87 (44661278759).

- Every PR targeting main triggers the same Pages workflow, regardless of changed-file type.
- `validate` performs canonical static regression and builds/uploads both reviewed artifacts.
- After `validate`, `browser` runs the canonical browser/PWA suite; four `operations` matrix jobs (Chromium/WebKit × 440/1440) run in parallel.
- `webkit` depends on **both** `validate` and `browser`, creating a serial critical-path segment.
- The Browser QA job executes a standalone session-recovery smoke before `qa:browser`; check whether the latter already covers identical assertions before removing any invocation.
- The three observed documentation/process PRs each triggered the heavy browser and operations jobs. This is evidence of potentially unnecessary work, **not** proof that skipping it is safe.

**Measured status at inspection:** all three static gates passed; browser suites were still in progress. No completed end-to-end run duration or statistically useful before/after baseline was available. Do not report a speedup yet.

**Proposed P2 design, not implemented:** an early changed-file classification with explicit allowlist for documentation-only PRs, plus a small metadata/static check; retain complete canonical QA for release/main, workflow changes, System Spec contracts, and all product-affecting paths. Test classification with adversarial fixtures (mixed changes, renamed paths, generated assets, dependency/config changes) before any conditional gate is added. Never let PR-only selection weaken the release acceptance gate.
