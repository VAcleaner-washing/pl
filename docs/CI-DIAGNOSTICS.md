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

## Completed baseline evidence (2026-11-20, P1)

The following **latest-head** PR workflow runs finished successfully; all seven
required test jobs were `success` (static/build, browser aggregate, WebKit/mobile,
and four production-operations matrix variants). The Pages deployment job was
`skipped` as expected for pull requests, so these runs do **not** verify a
production deployment.

| PR | Head SHA | Full Pages workflow run | Result |
| --- | --- | --- | --- |
| #85 | `3a397c989bfe9c1c871c521a197e6c0febc93d3f` | [44661901684](https://github.com/VAcleaner-washing/pl/actions/runs/44661901684) | success |
| #86 | `280071974d26d4160bb53f1b484a17ee9845bcbc` | [44660968293](https://github.com/VAcleaner-washing/pl/actions/runs/44660968293) | success |
| #87 | `ea17f8824083a68d6eefeec68491c087d2fbadcf` | [44669036040](https://github.com/VAcleaner-washing/pl/actions/runs/44669036040) | success |

PR #87's independent [Roadmap scope workflow](https://github.com/VAcleaner-washing/pl/actions/runs/44669036138) also passed.

**Timestamped baseline (GitHub Actions API, 2026-11-20):** GitHub job metadata
includes `started_at` and `completed_at`; run metadata includes
`run_started_at` and `updated_at`. The prior statement that timestamps were
unavailable is superseded by the following measured results. Full workflow
wall-clock is calculated from run start to last update; this includes queueing,
coordination and any post-job bookkeeping, so it is not the sum of job durations.

| PR / run | Head | Workflow wall-clock | Static | Browser aggregate | WebKit mobile |
| --- | --- | ---: | ---: | ---: | ---: |
| #85 / [44682255473](https://github.com/VAcleaner-washing/pl/actions/runs/44682255473) | `afd5742` | 31m 57s | 41s | 22m 00s | 9m 05s |
| #86 / [44660968293](https://github.com/VAcleaner-washing/pl/actions/runs/44660968293) | `2800719` | 26m 33s | 35s | 16m 25s | 9m 23s |
| #87 / [44669036040](https://github.com/VAcleaner-washing/pl/actions/runs/44669036040) | `ea17f88` | 47m 06s | 42s | 15m 05s | 8m 36s |

All three are successful full test runs; the Pages deployment job was skipped
on PRs. #87's wall-clock exceeds its job execution window, so **do not** treat
that number as browser-test time or extrapolate a per-suite speedup from it.
The critical path is static → browser aggregate → WebKit mobile. The four
production-operations jobs (Chromium/WebKit × 440/1440) run in parallel after
static and all passed. Their respective durations for #85 were 3m56s, 6m38s,
1m16s, and 1m51s (Chromium 440, WebKit 440, Chromium 1440, WebKit 1440).

**Repeat-run classification:** #85 has 4 Pages runs on 4 distinct SHAs:
3 successes, 1 early failure. #87 has 15 runs on 7 distinct SHAs:
7 Pages runs (5 success, 1 failure, 1 cancelled) and 8 independent roadmap-scope
runs (2 success, 5 failure, 1 cancelled). These are separate workflows, not
15 full browser runs. A run on a changed SHA is not automatically redundant;
no defensible percentage of avoidable runs is established yet. Scope guard
failures are rapid (~8–17 seconds), while Pages success can take tens of minutes.

**P2 candidate, not yet implemented:** prove a fail-closed docs-only classifier
with positive/negative fixtures; ensure the full main/release acceptance gate
remains intact. Do not skip tests for System Spec, workflows, configuration,
product code, mixed or renamed changes. Validate branch/merge-base interactions
before enabling any selective PR behavior. No before/after speedup exists yet.

**Observed WebKit 440 intermittent failure (2026-11-20, P1):**
[PR #85 run 44690977306](https://github.com/VAcleaner-washing/pl/actions/runs/44690977306)
failed on attempt 1 in `Production operations / webkit / 440`, step
`Test actual production worker offline, update and rollback`. Its diagnostic
reported `Worker readiness deadline`: the 4346 service worker was still
`activating`, while the 35 required assets were present in cache and the
stable artifact's hashes matched. Six other test jobs passed. A **failed-job-only
rerun**, attempt 2, passed the same WebKit 440 job in **5m57s**
(08:40:21–08:46:18 UTC); the run now concludes `success`. This is evidence
of an intermittent failure, **not** proof that the service worker is correct
under all timing conditions or that the test is safe to relax. Keep the
readiness assertion and full release coverage; investigate worker activation
lifecycle and bounded waiting with a reproducible regression fixture before
changing the test or runtime. The original first-attempt failure must remain
visible in flakiness metrics even though the final run conclusion is green.

**Merge-order dependency:** #87 explicitly depends on #86's roadmap; #85 is an
independent CI-measurement PR. All remain Draft pending explicit merge-readiness
review. Do not merge #87 ahead of #86; check for concurrent branch changes and
rerun required checks after any rebase or merge-base change.
