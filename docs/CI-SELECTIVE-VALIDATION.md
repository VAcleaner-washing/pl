# P2 selective CI — docs-only validation

> Current-state entry point (2026-11-24): [Professional Audit QA assessment](audits/2026-11-24-qa-cicd-assessment.md). Main `68c274f` and production4.3.69/4369 supersede older version/open-PR/design-only statements below. #88–94 are integrated; historical evidence/failures stay intact. Physical iPhone acceptance remains unconfirmed. Existing classifier and release checklist remain authoritative; this banner adds no exception.

Roadmap: P2 — compare real CI timing and failure modes before/after while preserving the full main release gate. This document-only PR verifies the behavior introduced in merged PR #88. It changes no application code, tests, deployment configuration, or product contracts.

## Current reviewed evidence — 2026-11-23 (supersedes historical open items below)

Roadmap: P0 production baseline; P1 existing audit and measurements; P2 selective regression/release acceptance. This review changes documentation only; the approved phase order and product behavior remain unchanged.

- Main reviewed: `56bd9019946fc0b96654edd9e1df0a4a13a1a148`; production **4.3.67 / 4367**. PR #84 remains Draft and was not changed. PR #89 was synchronized by merging current main without force push or conflicts; its net diff contains only these two ordinary Markdown documents.
- Actual main push [45018790842](https://github.com/VAcleaner-washing/pl/actions/runs/45018790842): classification, Static/build, Browser aggregate, WebKit (including injected recovery and second-attempt failure), four operations variants and Pages deployment all succeeded on `56bd901`, attempt 1. Workflow timestamps 2026-11-22 **11:44:29–12:12:26 UTC = 1,677 s (27:57)**.
- Downloaded deployed `production-pages` artifact **14752388608**, verified GitHub ZIP digest `1c6ced46861396beccbba693c8c487bac1c392d092dd4c95246d9c150b16771b`. Its 273 files match the locally reproduced source artifact byte-for-byte; tree digest `970bba1fd97a2270365f5b9d435c5252e5a7d9f8bfb96432f01d824ca701cc1f` matches the production receipt. The older `reviewArchiveSha256` in that receipt is historical and is **not** used as proof of the current tree.
- Independent live HTTP verification on 2026-11-23 compared all **273** files: **268** same-path exact matches, four documented alias redirects and the Cloudflare-managed robots prefix with exact artifact suffix; **zero unexplained differences**. Plain `/release.json` matches the artifact. `/admin/sw.js` and `/admin/manifest.webmanifest` therefore match the deployed artifact, not just repository source. No business API calls or mutations were used.
- Manifest identity: `/admin/`, scope `/admin/`, start URL `/admin/bronuvannia/`, standalone. Worker cache identity is `vacleaner-manager-4367`; PR #82's network-first versioned assets and offline fallback remain unchanged. Same-build cache recovery is a compatibility safeguard, not authorization to reuse build IDs for future product changes.
- Local checks after main synchronization: **70/70** canonical static/build groups, **19/19** normal-candidate contracts and exact production artifact verification passed. Configuration inventory: **68 static suites + 52 browser suites**, excluding runner setup/verification commands. No missing scripts or identical npm commands. Existing browser, WebKit and operations gates remain required for code PRs and every main push.

### P1 architecture and confirmed bottlenecks

| Layer | Current ownership / evidence | Process implication |
| --- | --- | --- |
| Public static export | HTML/RSC/Next chunks; deterministic stamp/build and hydration QA | Public behavior changes require hydration and exported-copy contracts together |
| Admin/PWA | Vanilla `assets/admin-v250.js`, layered CSS, normal presentation compiled from `sandbox/ui.*` and `sandbox/forms.*`; `admin/sw.js` | Canonical and promoted normal artifacts are distinct; test the visible controls of the intended artifact |
| Backend boundary | Existing Supabase Edge Functions/migrations and pure calculation helpers | Inventory only in this initiative; no backend deployment or business-data change |
| Regression registry | `config/qa-suites.json`, npm scripts, `qa-full.mjs`, `ci-diagnostics.mjs`, `qa-timing-report.mjs` | Reuse measured suite durations; do not confuse 70 runner groups with 68 registered static suites |
| Release provenance | Static gate creates canonical and reviewed normal artifacts; operations/deploy consume the reviewed artifact | No rebuild between acceptance and deployment; exact tree pin remains mandatory |

Confirmed critical path remains static → browser aggregate → WebKit. The measured browser and WebKit durations in the baseline tables explain most full-run latency. The standalone session-recovery invocation overlaps registry membership, but equivalent setup/assertions have not been demonstrated: **nothing was removed**. The 66/1705 candidate repeated runs remain leads, not verified waste. The recorded WebKit4346 activation stall remains an intermittent-risk observation; a later successful run does not erase its first failure. PR #90 adds deterministic eligibility and full-journey fail-closed retry coverage, not a claim that every native WebKit failure is fixed.

### P2 measurement boundary and merge disposition

Reconfirmed docs-only run [45041810014](https://github.com/VAcleaner-washing/pl/actions/runs/45041810014), head `7c04ea1`: **16:04:53–16:05:05 UTC = 12 s workflow span**, success. Against the measured 1,677-second full main workflow, this is **99.2844% shorter for this docs-only workload** (`100 × (1 − 12/1677)`). Different workloads are intentionally identified: this does **not** measure a speedup of code PRs or of the full release suite. The earlier 10-second observation is retained below as a separate historical run.

The user-authorized completion review permits PR #89 to merge after synchronization, semantic review, scope and fail-closed classification checks. Docs-only skips are the approved PR exception; they do not certify a release. The resulting main commit must still pass full static/browser/WebKit/four-variant operations and deployment, followed by an independent live readback. Record final main SHA, run and timings in the completion report; do not pre-mark this post-merge acceptance complete.

### Physical-device acceptance — NOT CONFIRMED

An installed iPhone PWA cannot be certified from Linux automation or static HTTP. Before closing device acceptance, the administrator must record iOS version, time and app build, then:

1. Open the existing installed PWA online; finish or explicitly discard drafts, choose the normal update prompt, and reopen. Confirm build4367 in the app; do not delete storage or reinstall to conceal an update defect.
2. With Safari remote inspection, confirm `/admin/` registration, controller **activated**, no unexpected waiting/installing worker, cache `vacleaner-manager-4367`, and versioned assets from this release. Same build numbers alone do not identify bytes; compare worker response with the reviewed deployed worker.
3. Enable airplane mode, relaunch and verify cached shell, preserved remembered session, and honest network/unavailable business-data state. Do not create or mutate bookings, clients, payments or equipment to test offline behavior.
4. Restore connectivity, background/resume, and confirm recovery without duplicate prompts or lost input. Open an unsaved form, verify update/exit protection, then discard without saving. Check keyboard, bottom controls and safe areas in portrait/landscape.
5. Record pass/failure evidence. Test a future update from this installed baseline against the next separately versioned release; do not manufacture a production deployment solely for the test.

This is the explicit remaining physical-device acceptance boundary, not GREEN. Automated worker upgrade/offline/rollback evidence comes from isolated browser fixtures, not a physical phone.

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

**Open items:** verify deployed production version and service-worker behavior independently; quantify redundant/duplicate run share from a complete run inventory rather than guessing; review release checklist against the System Spec. PR #89 is currently open and marked ready for review (not Draft) as of 2026-11-22; its docs-only GREEN checks do not independently authorize merge. Keep merge blocked pending review and explicit disposition; do not merge solely to demonstrate the skip path.

## P1 — complete workflow-run duplicate inventory (2026-11-21)

Roadmap: P1 — inventory duplicate invocations and measure actual workflow-run counts. GitHub Actions REST `/actions/runs?per_page=100&page=N` was inspected across **all 18 pages**, including the final five runs: **1,705 runs total**.

Grouping by `workflow_id + head_sha + event` gives **1,639 distinct groups**, **59 groups containing more than one run**, and **66 excess runs beyond the first** (**3.87% of all recorded runs**). This is a **candidate repeated-run share**, not a verified unnecessary-run share or a compute-minutes estimate: a workflow may legitimately run again for the same commit after a PR synchronization, a manual dispatch, an earlier failure, or a fresh deployment.

Concrete examples:
- Roadmap PR scope, SHA `88b89014`: runs `44814139663` and `44871320391`, both successful, many hours apart.
- Roadmap PR scope, SHA `f6573089`: runs `44665345219` and `44665350429`, both failures, three seconds apart.
- Deploy VAcleaner Pages, SHA `8fc7260f`, push event: four runs `44040278236`, `44063393982`, `44064151835`, `44072869412`.

**Decision:** Do not delete or suppress any workflow based solely on this grouping. First distinguish reruns, explicit dispatches, failed attempts, concurrency and intended release/deployment repetition, and assess coverage equivalence. No change to CI triggers is authorized by this inventory alone.

## P0 — PWA configuration and production verification boundary

Roadmap: P0 — verify main release/version, Pages artifact and PWA/service-worker behavior, distinguishing verified from blocked.

- Main `release.json` and `package.json` identify **v4.3.67 / build 4367**.
- Main `admin/manifest.webmanifest` specifies `id: /admin/`, `scope: /admin/`, `start_url: /admin/bronuvannia/`, and `display: standalone`.
- Main `admin/sw.js` uses cache name `vacleaner-manager-4367` and an explicit asset list. Main root `sw.js` is a retirement sentinel for old root-scope workers; the public site is not the supported PWA scope.
- Main deployment workflow [44871327797](https://github.com/VAcleaner-washing/pl/actions/runs/44871327797) completed successfully, including Pages deployment, at commit `8a47b80d48f219476950054f198294b5a387e525`.
- **Not verified:** direct live HTTP responses for `/admin/manifest.webmanifest`, `/admin/sw.js`, installed-client cache migration, and whether a specific phone is controlling the app with worker/cache 4367. Attempts to retrieve live files from `https://vacleaner.pp.ua` were unavailable from the execution environment. Repository source and successful deployment alone cannot establish these runtime facts.

P0 remains **partially verified**. Do not label installed PWA GREEN without independent runtime evidence.

## P2 — measured full-release versus docs-only PR gate (2026-11-21)

Roadmap: P2 — compare real CI timing and failure modes before/after while preserving full release checks.

**Measured complete runs, GitHub Actions timestamps (not estimates):**

| Evidence | Full main push run [44871327797](https://github.com/VAcleaner-washing/pl/actions/runs/44871327797) | Docs-only PR run [44882629645](https://github.com/VAcleaner-washing/pl/actions/runs/44882629645) |
| --- | --- | --- |
| Workflow started → last update | 26m 08s (05:32:08–05:58:16 UTC) | 11s (07:57:51–07:58:02 UTC) |
| Classification job | 13s GREEN | 7s GREEN |
| Static / build gate | 38s GREEN | skipped by classification |
| Browser aggregate | 14m 31s GREEN | skipped by classification |
| WebKit/mobile forms | 10m 21s GREEN | skipped by classification |
| Production operations: chromium 1440 | 1m 23s GREEN | skipped by classification |
| Production operations: chromium 440 | 4m 06s GREEN | skipped by classification |
| Production operations: webkit 1440 | 1m 57s GREEN | skipped by classification |
| Production operations: webkit 440 | 5m 15s GREEN | skipped by classification |
| Pages deployment | 7s GREEN | skipped by classification |

**Important:** these runs have different event/scope (full main push vs docs-only PR); the 99.3% wall-clock difference is the **observed reduction in checks for docs-only changes**, not a claim that full regression became 99.3% faster. The full main push release gate remains intact and was observed GREEN. End-to-end installed-device PWA state is not inferred from either workflow.

## P2 — release acceptance checklist (reviewed against main `.github/workflows/pages.yml`)

Roadmap: P2 — document the release checklist, preserve full regression, browser/WebKit, artifact provenance and deployment gates. Use this checklist for every future code PR and main release; a docs-only PR cannot stand in for release acceptance.

Before costly CI, prepare the source → behavior → Spec → positive/negative regression → artifact evidence using the [single change-impact mapping](CHANGE-IMPACT-MAPPING.md), then record it in the existing PR template. Targeted validation is early feedback; this mapping does not change classifier eligibility, required checks or the full release checklist below.

- [ ] Confirm the intended commit SHA and scope against `docs/DEVELOPMENT-ROADMAP.md` and `docs/VAcleaner-SYSTEM-SPEC.md`; record test changes alongside behavior changes.
- [ ] For any code/config/contract PR, verify **Static / build gate** succeeded, including canonical static regression, artifact build and production provenance checks. Do not treat `skipped` as success for a code PR.
- [ ] Verify **Browser QA aggregate gate** and **WebKit / mobile forms gate** succeeded on the same commit.
- [ ] Verify all **four production operations** combinations (Chromium and WebKit × 440 and 1440) succeeded on the same reviewed production artifact.
- [ ] Confirm `production-pages` artifact and provenance are produced by the reviewed static gate; deployment must reuse this artifact **without rebuilding**.
- [ ] On the intended `main` push, confirm `Deploy GitHub Pages` succeeded after validate/browser/WebKit/operations succeeded; the workflow explicitly requires all four results to be `success`.
- [ ] Record `release.json` version/build and deployment SHA; separately verify live production HTTP version/manifest/worker, and installed-PWA worker/cache where available. Mark unobserved runtime checks **blocked**, not GREEN.
- [ ] Capture job timestamps and compare against P1 baseline. If a required check fails, do not merge or deploy by bypassing it.
- [ ] Docs-only exception: ordinary Markdown-only PR may have static/browser/WebKit/operations skipped **only when the fail-closed classifier confirms the complete diff**; the scope guard must still pass. A later main push still receives full release checks.

**Evidence boundary:** this is a documented acceptance checklist, not evidence that a new release has been shipped. Current production main workflow `44871327797` passed all listed CI gates, while independent installed-PWA runtime confirmation remains open.

## P2 — WebKit retry regression contract (design only; not yet executed)

Roadmap: P2 — replace fragile checks with deterministic behavioral regression while retaining the full WebKit release gate. The existing `scripts/public_hydration_qa.py` retries only a WebKit `/bronuvannia/` case when the initial page has exclusively access-control page errors, HTTP 200, no Python exception, no unexpected create call and no pending enhancement. It reruns the full fulfillment/draft-restoration journey in a new page and stores `retryEvidence`.

| Injected case | Required result |
| --- | --- |
| First attempt: eligible access-control page error; fresh-page full journey passes | PASS, `recoveredOnFullJourneyRetry=true`, original errors in `firstAttemptErrors`, successful `retryEvidence` |
| Eligible first failure; second journey has a page error or assertion failure | FAIL, `retryEvidence.passed=false`, nonzero exit |
| First failure is non-qualifying page error, HTTP != 200, Python exception, pending enhancement or unexpected create | FAIL, **no retry**, nonzero exit |
| Same failure in Chromium or on a non-booking route | FAIL, **no retry**, nonzero exit |
| Eligible first failure and repeated failure | Exactly one retry; never loop or silently suppress the second failure |

**Evidence boundary:** this matrix is an acceptance specification, not an executed test. Do not mark the retry branch verified until deterministic fault injection exercises both recovery and fail-closed cases and the same commit passes the required full Static/Browser/WebKit/production-operations gates. The existing clean full run [44871327797](https://github.com/VAcleaner-washing/pl/actions/runs/44871327797) proves the normal journey only, not the injected-failure branch. No product behavior, API, fixtures or release gate may be weakened to make this pass.

## P2 — WebKit retry execution update (2026-11-22)

The preceding retry matrix was a **design-only snapshot at the time of writing**. It has since been implemented and verified in PR #90, merged into `main` as commit `56bd9019946fc0b96654edd9e1df0a4a13a1a148`.

- PR #90 full gate: [45003937943](https://github.com/VAcleaner-washing/pl/actions/runs/45003937943) — completed successfully on head `109c920a82ff362d07cf0c5f9999f1f44ab4eec1`. Static/build, Browser QA aggregate, WebKit/mobile forms and all four Chromium/WebKit production-operations jobs succeeded. PR deployment was correctly skipped.
- WebKit fault injection now exercises the full second journey for both `recover` (expected recovery) and `fail-second` (expected failure); the retry page initializes its own `ApiReadTracker`. Scope guard also passed.
- **Not yet verified:** full `main` push workflow and Pages deployment for merge SHA `56bd901` from a push-run record, live service-worker response, and installed-device cache state. Do not infer production success or a code-PR speedup from the PR checks.
- Historical P1 full QA wall-clock baseline remains 24m37s / 26m29s / 27m23s for #85/#86/#87. Docs-only ~10–11s is a different, selective PR workload; the 66/1705 repeated-run candidates are not verified wasted runs.

This evidence update is documentation-only and does not change release gates, product code or production data.

## Current production integration execution tracker — 2026-11-27

This is the single execution-status tracker for the owner's Production Integration & PWA Visual Refinement task. It does not replace the System Spec, change-impact mapping, Roadmap or release policy. Update the same table after each accepted integration; GREEN PR CI alone is not VERIFIED production.

Observed baseline: main `b0a364f032c30aea6a36c8904397e1401334313e`; [live release](https://vacleaner.pp.ua/release.json) **4.3.69 / 4369**. [Main run 46040573936](https://github.com/VAcleaner-washing/pl/actions/runs/46040573936) and Pages deployment 8115831428 succeeded for that SHA; Pages uses workflow deployment and the existing HTTPS domain. Native main rules retain three Actions/App 15368 contexts, strict freshness, conversation resolution and squash-only admission. Solo Owner native approval count 0 does not waive the required separate exact-head review.

| Stage / package | Execution status | Current facts / next acceptance |
| --- | --- | --- |
| A — current-state verification | VERIFIED | Main/live/deployment/rules and PR #102–106 heads, base dependencies and overlaps checked; approved private design package available. This verifies inventory, not a new product release. |
| B — integration sequence | IN PROGRESS | Preserve order #102 → #103 → #104 → #105 → #106; shared release metadata/Spec/admin inputs require sequential reconciliation and post-merge acceptance. |
| B / [PR #102](https://github.com/VAcleaner-washing/pl/pull/102) — governance | VERIFIED | Separate ChatGPT review approved exact head `3e852eb2`; squash merged as `b0a364f0` without bypass. Main run 46040573936: 10/10 GREEN, attempt 1; Pages 8115831428 success; hosted C/N identical to accepted baseline; live 273 files, 0 unexplained differences, worker/manifest unchanged. Documentation only; 4.3.69/4369 retained. |
| B / [PR #103](https://github.com/VAcleaner-washing/pl/pull/103) — Analytics/Finance | IN PROGRESS | Synchronize accepted main `b0a364f0` into the existing PR; original UX-01 application inputs and C270 / N273 trees unchanged. Fresh targeted checks and 276/276 local responsive assertions PASS; actual production→candidate mobile/desktop renders prepared. Current-head full CI and separate visual/exact-head review remain mandatory before merge; not deployed. |
| B / [PR #104](https://github.com/VAcleaner-washing/pl/pull/104) — footer | NOT STARTED | Integration pending #103. Head `706b9a39` has stale stacked base `411832a3` and conflicts; reconcile the existing PR with integrated UX-01, preserving contacts/links/CTA and approved design. |
| B / [PR #105](https://github.com/VAcleaner-washing/pl/pull/105) — Equipment tabs | NOT STARTED | Integration pending #104. Existing head `4c75302e` and its geometry/functional evidence retained; rebase, exact review and full acceptance on current main required. |
| B / [PR #106](https://github.com/VAcleaner-washing/pl/pull/106) — PWA update/version | NOT STARTED | Integration pending #105. Head `0f8c0beb` has [GREEN run 46031835167](https://github.com/VAcleaner-washing/pl/actions/runs/46031835167), including native offline/update/version cases; not deployed. Original physical-device activation cause remains unproven. |
| C1–C8 — approved PWA Visual Refinement | NOT STARTED | Start only after B acceptance; retain approved 10 mobile / 9 desktop concepts, boards and before/after. Preserve existing functionality; small integrated packages, no alternative concept/framework. |
| D — product performance / sustained CI / G09 | NOT STARTED | Preserve historical, PR and main baselines separately. Sustained acceptance remains open; G09 remains unresolved with original evidence retained. Neither closes from GREEN CI or invented measurements. |
| E — final regression | NOT STARTED | Existing complete gates and synthetic write fixtures; no destructive production-data tests. |
| F — final release/live acceptance | NOT STARTED | Requires accepted B/C/D/E, exact artifact/deployment/live verification. Physical iPhone verification is performed with the owner and recorded separately. |

Review blocker, if no separate reviewer/capability is available: record BLOCKED with the missing exact-head review; do not substitute the implementation agent's self-review, bypass native rules, or advance dependent product integration. No repository settings, runtime, Supabase, dependencies or Roadmap are changed by this tracker.
