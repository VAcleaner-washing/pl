# VAcleaner — approved development-process roadmap

**Status:** APPROVED SCOPE (original plan, reaffirmed 2026-11-20)  
**Objective:** Small changes must not cause days of failed CI from stale tests. Improve development speed without weakening release safety.

This roadmap governs **process modernization only**. Product behavior remains governed by [VAcleaner-SYSTEM-SPEC.md](VAcleaner-SYSTEM-SPEC.md). Do not renumber, reorder, or expand these phases without explicit user approval.

## P0 — Verify the production baseline

- Inspect deployment #82, the current main release/version, Pages artifact and PWA/service-worker behavior.
- Record what is **verified** versus blocked/unavailable; do not infer production success from a green PR check.
- **Exit:** documented, evidence-backed baseline and any unresolved production verification blockers.

## P1 — Inventory architecture and tests; audit CI

- Inventory PWA/admin/Supabase architecture and System Spec contracts without modifying their business logic.
- Inventory test suites, dependencies, duplicate invocations, flaky/stale assertions, and CI duration.
- Measure actual workflow/job and per-suite timings; distinguish successful full runs from fail-fast partial runs.
- **Exit:** dependency/test inventory, confirmed bottlenecks and prioritized optimization plan with baseline measurements.

## P2 — Modernize CI, regression contracts and release checklist

- Implement fast, deterministic feedback for small PR changes; update tests in the **same change** as behavior.
- Eliminate duplicates only after proving equivalent coverage; replace brittle text matching with behavior tests.
- Preserve required full regression, browser/WebKit, artifact provenance and deployment gates in the System Spec.
- Compare real CI timing and failure modes before/after; no unverified test skipping.
- **Exit:** green validated PRs, repeatable quick feedback, documented release checklist and demonstrated speedup without lost coverage.

## P3 — Product backlog, not product implementation

- Produce prioritized backlog for UX/UI, finance, equipment and customers, based on observed issues.
- **Do not implement** backlog items in this process-modernization initiative.
- **Exit:** reviewed backlog, P0–P2 evidence and final summary; no unsupported claim of a completed deployment.

## Mandatory scope guard for every run and PR

1. Read this file and the current System Spec, check main/CI/open PRs.
2. State the **exact roadmap phase and bullet** addressed before editing.
3. If the work is outside that bullet, **STOP**: add a backlog proposal or request explicit approval. A useful idea is not permission to change scope.
4. In the PR description include `Roadmap: P0|P1|P2|P3 — <specific bullet>`, the reason, changed files, test impact, CI evidence and rollback/release risk.
5. Code changes and their corresponding tests/documentation belong to the same PR. Never bypass a failing gate to get green.
6. Keep unrelated equipment/booking/finance/Supabase work out of this initiative. PR #84 stays Draft until separately authorized; PR #85 is CI measurement work.
7. Do not silently change this roadmap or the hourly automation instructions. If blocked, report the blocker and continue only with an in-scope independent item.

## Hourly progress format

`Phase/bullet | Actual change and commit/PR | Tests/CI evidence | Blocker | Next in-scope action`

**Completion means evidence**, not a status message. Do not mark a phase done without satisfying its exit criteria.
