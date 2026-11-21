# P2 selective CI — docs-only validation

Roadmap: P2 — compare real CI timing and failure modes before/after while preserving the full main release gate. This document-only PR verifies the behavior introduced in merged PR #88. It changes no application code, tests, deployment configuration, or product contracts.

## Observed docs-only PR #89

- Commit: `eff83c09dc880a487ac603e3f6bde9667e124af7` (initial measurement).
- Pages workflow: https://github.com/VAcleaner-washing/pl/actions/runs/44876571843 — completed, success; run 06:39:27–06:39:37 UTC (10 s workflow-level elapsed).
- PR change classification: success, 06:39:30–06:39:36 UTC (6 s job elapsed).
- Static/build, Browser QA aggregate, WebKit/mobile forms, production operations matrix, Pages deploy: **skipped**, as intended for an ordinary `docs/*.md`-only PR.
- Roadmap scope guard: https://github.com/VAcleaner-washing/pl/actions/runs/44876571857 — success, 06:39:27–06:39:38 UTC (11 s workflow-level elapsed).
- The two PR workflows ran concurrently; combined elapsed from first start to last finish was **11 s**. This is not the sum of both workflow durations.

## Full regression baseline and main gate

All durations below are calculated from GitHub Actions job timestamps; jobs in a matrix run in parallel. Full QA wall-clock means first started job through completed WebKit gate, excluding skipped PR deployment and queue time.

| PR | Run | Static | Browser aggregate | WebKit/mobile | Full QA wall-clock |
| --- | --- | ---: | ---: | ---: | ---: |
| #85 | [44732460987](https://github.com/VAcleaner-washing/pl/actions/runs/44732460987) | 41 s | 14m 20s | 9m 30s | 24m 37s |
| #86 | [44660968293](https://github.com/VAcleaner-washing/pl/actions/runs/44660968293) | 35 s | 16m 25s | 9m 23s | 26m 29s |
| #87 | [44693516249](https://github.com/VAcleaner-washing/pl/actions/runs/44693516249) | 38 s | 17m 14s | 9m 24s | 27m 23s |

Each of those runs completed successfully, including four production-operations jobs (Chromium/WebKit × 440/1440).

Main push after #88 merge: https://github.com/VAcleaner-washing/pl/actions/runs/44871327797 — completed, success. Classification, static/build, browser aggregate, WebKit/mobile forms, all four production operations and Pages deployment were successful. First job 05:32:11 UTC, last job 05:58:15 UTC = **26m 04s job-span**; workflow run 05:32:08–05:58:16 UTC = **26m 08s workflow-span**. These are different measurement boundaries.

## Interpretation and remaining evidence

Compared with full PR QA baseline 24m37s–27m23s, the 10-second docs-only Pages workflow is about **99.32%–99.39% shorter**. This improvement applies **only to ordinary docs-only PRs**; no speedup is established for code changes. Comparing full QA with the combined two-workflow 11-second span yields a different metric; do not mix definitions.

No browser, WebKit or production regression tests were removed for code PRs or main pushes. A green workflow and successful Pages deploy do not alone prove that a user's installed PWA is refreshed or that service-worker caches are current.

**Open items:** verify deployed production version and service-worker behavior independently; quantify redundant/duplicate run share from a complete run inventory rather than guessing; review release checklist against the System Spec. Keep PR #89 Draft as a measurement fixture; do not merge it just to demonstrate the skip path.
