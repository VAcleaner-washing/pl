# G09 — WebKit 440 save-retry investigation

**Status: technical release acceptance (CI/deployment/live HTTP) PASSED after one controlled recovery attempt. G09 remains an unreproduced intermittent failure with open/unresolved RCA; no runtime/test fix applied. Ready for Independent Review, not independently approved.** Physical-device acceptance remains unverified. Initial diagnostic work is Roadmap P1; this owner-authorized recovery records P0 production evidence/P2 release-checklist gates without changing the approved roadmap or implementing G01–G08.

## Verified baseline

- Current main: `0b4c5c680f4a4b8de95d246306a5e583f3173782`; PR #95 merged. PR #96 remained Draft/evidence-only at investigation start, head `3962e0ffe5965e6eb22e191bf3cf6fba4dcdfd64`.
- Main [run45482260765](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765) attempt1 is complete: only required Operations WebKit440 failed; classification/static/browser/WebKit and the other three Operations variants passed; Pages deployment skipped. At initial inspection these successes did not clear the failed gate; the subsequent controlled recovery below is recorded separately and does not erase attempt1.
- [Failed job138758815898](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/job/138758815898), failed step22:36:19–22:36:42 Kyiv time (20:36:19–20:36:42 UTC),24 November2026.
- [Failure artifact14962087847](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/artifacts/14962087847) downloaded/read; ZIP SHA256 verified: `b341b4747b192a3a362b33e354eff6da12c3a936c074b97fd168341daab33197`.
- result.json, failure.png, normal-purchase-save.png, trace.zip network/API logs and screencast frames reviewed. Local runtime/business/test inputs have zero diff from main. Local normal artifact verification:273 files,4.3.69/4369, tree `4109bb6e7124ea3cad9a67e60e710574d893a9d39a8ac482f53ed36963139063`.
- Existing [first-failure report](2026-11-24-postmerge-acceptance.md) remains historical evidence; this document records the authorized follow-up investigation.

## Controlled release recovery — 25 November2026

The owner accepted RCA commit30345f9 and the42-sample stage as complete, stopped unbounded diagnosis and authorized at most **one** failed-jobs-only recovery of the original main workflow, subject to existing policy. No CSS/runtime/test repair was authorized.

### Policy and unchanged-input checks

Reviewed AGENTS, Engineering Standard v1.1, System Spec REL-001…005, pages.yml and existing release checklist. The standard requires diagnostic work before rerun, retaining first failures and no bypass of required gates; the completed/accepted diagnosis and explicit bounded recovery decision satisfy this action without claiming root-cause resolution. CI-DIAGNOSTICS also records a previous failed-job-only recovery while retaining intermittent-risk evidence. No new retry entitlement or relaxed release rule is introduced.

Main remains `0b4c5c680f4a4b8de95d246306a5e583f3173782`. Diff against the previously verified application baseline68c274f is zero for assets/admin/sandbox/staging/scripts/config/Supabase/package/requirements/release and release workflows. Local artifact verification again passes273 files/tree4109bb6e7124ea3cad9a67e60e710574d893a9d39a8ac482f53ed36963139063. Canonical tests, suite membership, application bytes, pages.yml and mandatory gates are unchanged. PR#96 remains unmerged.

### One attempt and complete gates

Called GitHub **rerun failed jobs** once for run45482260765. No full-workflow dispatch and no second recovery request. Result: [attempt2](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/attempts/2) completed success on the same source SHA.

| Evidence | Actual outcome |
| --- | --- |
|WebKit440 retry [job139030778158](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/job/139030778158)|08:45:22–08:50:44 Kyiv /06:45:22–06:50:44 UTC,5m22s; success|
|G09 purchase path inside that job|All29 acceptance checks passed; first rejected save retains input/cache, same-payload retry and reload readback pass|
|Carried-forward jobs|Classification, Static/build, Browser aggregate, separate WebKit/mobile and three other Operations variants remain success; original started_at/completed_at timestamps exactly unchanged|
|Required test acceptance|Static/build + Browser + WebKit + all4 Operations variants success; no required test job skipped|
|Pages deployment [job139032980898](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/job/139032980898)|08:50:53–08:51:04 Kyiv /06:50:53–06:51:04 UTC; success|

GitHub emits new job-record IDs for some carried outcomes in attempt2; identical original execution timestamps prove these successful jobs were not executed again. Only failed WebKit440 and its previously skipped deployment dependency executed during recovery. First attempt remains failure; attempt2 success is release recovery, not a G09 fix or proof of future reliability.

### Commit/artifact provenance and independent live readback

Deployment log explicitly submits artifact_id14962177277 and records creation for commit0b4c5c680f4a4b8de95d246306a5e583f3173782. This is the original reviewed production-pages artifact, not a rebuild:

- ZIP SHA256 `3582dd1964f3a4223acd9e5846132314a9086d73d0c345ea2bef0f75dbb2eb94`, re-downloaded and verified.
- Exactly273 files equal the locally reproduced/pinned artifact byte-for-byte; tree digest remains `4109bb6e7124ea3cad9a67e60e710574d893a9d39a8ac482f53ed36963139063`.
- Recovery Operations evidence artifact14998818316, ZIP SHA256 `7a52ead5a602889c7379f7f5679a8ae636a3a64dcd5d7d7d2afc603eb0acd7b3`; downloaded digest and29/29 result verified.
- Independent read-only HTTP comparison completed08:52:05 Kyiv /06:52:05 UTC:268 same-path exact byte matches,4 expected alias redirects whose destination index.html bytes match exactly,1 Cloudflare-managed robots prefix with exact artifact suffix; **zero unexplained differences**.
- Live release.json4.3.69/4369, manifest id/scope/admin start URL and actual worker match the deployed artifact. Worker SHA256 `0f1bda03f281d131086dc26ab2c2b485a159fff0f4da09057fb0f1099e6fe661`, cache identity vacleaner-manager-4369.

HTTP bytes establish artifact identity; source commit identity comes from the deployment log and Actions metadata, not an invented commit field in release.json. Identical documentation-only source commits can legitimately serve identical artifact bytes. No customer/business API calls or mutations used for live verification.

### Preserved evidence and handoff

Before rerun, archived the original failed artifact plus all8 full diagnostic archives, accepted RCA snapshot and evidence bundles, with per-file SHA256 manifest. Archive `G09-preserved-first-failure-and-diagnostics.zip`,269,329,121 bytes, SHA256 `7dbfcb083a218f93a6040846fdc402bffc9b353bc887cd1a4d781d0579b23dcd`. Original failure artifact14962087847 also remains listed by GitHub after recovery. No evidence was deleted or overwritten by this task. Final recovery metadata, logs and per-path live hashes are retained separately.

| Verification layer | Status |
| --- | --- |
|Self-review/input/provenance checks|Performed; unchanged artifact/tests/gates and one-attempt limit verified|
|Diagnostic stage|Accepted by owner;42/42 passing samples; further unbounded investigation stopped|
|Release technical acceptance|PASS: complete required gates, Pages deploy and independent static HTTP readback|
|G09 root cause resolution|UNRESOLVED; intermittent/unreproduced, original first failure preserved; no repair|
|Independent Review|READY for next stage; not yet performed or approved|
|Physical-device/installed iPhone acceptance|NOT VERIFIED; Linux fixtures/HTTP do not certify a particular phone/controller/session|

Independent reviewer should examine the first failure alongside the42 samples and recovery, the unchanged tree/gate evidence, deployment→artifact chain and residual intermittent-risk decision. No policy, Roadmap, dependencies, Supabase, business behavior or pages.yml changes are part of this recovery.

## Original failure timeline

Times below are monotonic trace milliseconds, not wall-clock time. They describe one recorded CI execution, not a new reproduction.

| Time / interval | Observed evidence |
| --- | --- |
|16785.652–16831.111|First Save click `jdxs@486`; target enabled/stable, point(220,816.17), button y792.17/h48|
|16828.340|Only settings POST begins; intercepted fixture returns503 intentionally|
|16833.758–16836.912|Save re-enabled assertion passes|
|16838.729–16842.730|Error toast text assertion passes; text existence is not evidence of a settled compositor/hit-test state|
|16846.477–16850.818|Entered Puzzi unit-cost value remains1|
|16854.944|Acknowledged local cache read; preservation check passes, one attempted save recorded|
|16862.547|Second Save click `jdxs@500` starts|
|16969.925|First attempt scroll-into-view completes, center(220,816.17)|
|16973.377|Playwright reports error toast intercepting pointer events; automatically retries the click action|
|17016.186|Second scroll-into-view completes; button y808.17/h48, center(220,832.17):16px geometry shift|
|17037.194–17058.238|Playwright performs/completes click; this completion alone does not prove a DOM submit or acknowledged write|
|17061.481–22067.280|Existing5s success-toast assertion expires; second settings POST absent|

Screencast frame16992 shows the exposed Save area; frame17054 shows the error toast covering that area during the retry window. This corroborates transient visual occlusion. Screencast frames and Playwright action logs do not record the exact DOM recipient of each pointerdown/up/click, event cancellation or submit dispatch. They cannot establish the complete causal chain.

## Request, lifecycle and handler analysis

The network trace records settings GET200 then one settings POST503. There is no second settings POST and no uncaught application error or unexpected/forwarded remote traffic. The503 is generated by the fixture, not a production Supabase failure.

The POST contains only `equipmentBaselines`: Puzzi qty2/unitCost1/total2; SC2,Jimmy,ABIR qty2/unitCost0/total0 each, with existing labels. This matches the edited value and normalization. The fixture records the first payload, flips its reject-once flag and does not persist it; the next valid POST would persist to fixture state and return200. That next call did not occur. The failure is not evidence of a committed write whose response was lost.

`assets/admin-v250.js`:

- `toast()` creates a passive textContent-only `.toast` with role=status/aria-live=polite, adds `.show` in requestAnimationFrame, removes it after2800ms and removes the node180ms later.
- The purchase form handler prevents native navigation, disables Save, awaits `saveGlobalEquipmentBaselines`, renders success only after that promise resolves, maps errors to a toast and re-enables the button in finally.
- `saveGlobalEquipmentBaselines` POSTs the normalized settings payload, checks response.ok and updates acknowledged local cache only on success. No second request means success acknowledgement/readback are not reached in this failure.

`assets/admin-v250.css`:

- Toast is fixed, z-index150, default pointer-events behavior; show/exit transitions animate opacity and translateY over180ms. Opacity0 alone does not remove an element from pointer hit-testing.
- At mobile widths the toast spans the content near the bottom above the mobile navigation; its geometry can overlap the scrolled Save action. Keyboard state changes its bottom offset. Moving to a different scroll position is not evidence that notification interception is fixed.

The compiled form policy originates in `sandbox/forms.js`. It tracks submitted/clicked state and disables/inerts fields while busy via MutationObserver; it removes saving notice/unfreezes fields when no longer busy. It observes only a local field snapshot for dirty state; the canonical onsubmit handler remains write owner. Save is not a leave-navigation control. No generic double-click suppression was found in the inspected admin/form sources. This source review does not establish which handler, if any, received the failed retry's actual events. The16px shift is observed, but its precise cause is not proven.

## Pinned GitHub Actions follow-up — 25 November2026 (Kyiv)

The earlier local ENOSPC blocker is superseded: isolated GitHub-hosted runners executed42 samples successfully. No local Docker image was downloaded again. This is diagnostic evidence, not release acceptance.

- Isolated branch: `diag/g09-runner`; diagnostic-only commits `55e9c70f5f7c5e5f9831018f23cb8af1bb000b20`, `1df62cd814f4d7c4e0eba8f2b42fd127d91b2523`, `0e7c43acd9aa7ca5f796677d1ac5888c8762199e`. [Temporary workflow](https://github.com/VAcleaner-washing/pl/blob/0e7c43acd9aa7ca5f796677d1ac5888c8762199e/.github/workflows/g09-diagnostic.yml) and drivers remain outside main/PR#96.
- Exact immutable1.65.1 Noble image above, client Playwright1.65.1/greenlet3.5.6 verified in job logs; engine reports WebKit27.2. Viewport440×956, device scale3, mobile/touch enabled, Europe/Kyiv, standalone fixture, service workers blocked, matching original harness.
- Application checkout fixed to main0b4c5c6. Original production-pages artifact14962177277 from run45482260765 downloaded without rebuilding; ZIP digest `3582dd1964f3a4223acd9e5846132314a9086d73d0c345ea2bef0f75dbb2eb94`; existing273-file tree verifier passed before each job.
- Workflow has contents:read/actions:read only, no deployment job, environment binding or production secrets. The read-only repository token is used for repository checkout and the original Actions artifact download. Application requests remain intercepted by the unchanged synthetic fixture. Existing pages.yml/release gates and canonical tests/assertions/timeouts are unchanged. No PR was opened for diagnostic code, avoiding release CI; only branch-restricted diagnostic push runs executed.
- The accepted evidence-bundle wrapper was adapted to the runner source path. Detailed passive journals record actual targets, hit-test stacks, toast transitions/geometry, scrolling, submit/defaultPrevented and disabled/inert state; they are flushed before reload as well as close. Lean journals deliberately omit geometry/style/hit-test reads to check instrumentation sensitivity. These journals do not cancel events, change styles or own a save.

| Scenario | Samples | Result | Run / artifact |
| --- | ---: | --- | --- |
|Original sequence, no DOM instrumentation|3|29/29 checks in each|[45496995226](https://github.com/VAcleaner-washing/pl/actions/runs/45496995226),14970125487|
|Same sequence, detailed passive journal|3|29/29 each|same run,14970200434|
|Fully visible active toast before retry|3|29/29 each|same run,14969925884|
|Active toast plus48px main-scroll adjustment|3|29/29 each|same run,14970245372|
|Same sequence, lean passive journal|10|29/29 each|[45497843228](https://github.com/VAcleaner-washing/pl/actions/runs/45497843228),14968728772|
|Click requested during entering-toast transition, lean journal|10|29/29 each|same run,14969302069|
|Single-CPU affinity, no DOM instrumentation|5|29/29 each|[45498824725](https://github.com/VAcleaner-washing/pl/actions/runs/45498824725),14969981696|
|Single-CPU affinity, lean journal|5|29/29 each|same run,14970177390|

Total42 completed samples:8 without DOM instrumentation,34 instrumented;0 observed lost retries. The controlled active/entering states use explicit observable conditions within the existing5s budget, not sleeps or increased timeouts. Single-CPU controls record affinity[0] and change scheduling only. Samples are bounded experiments; this is not an estimate of production defect probability.

### Causal findings from new evidence

1. Every sample retains the strict first-rejection input/cache assertion, two identical purchase-save payloads,503→200 acknowledgement, unchanged unrelated settings and successful reload from updated authoritative **fixture** storage. All34 instrumented request journals independently confirm exactly two equipmentBaselines POSTs. A third settings POST is the canonical suite's separate catalog rejection scenario, not a duplicate purchase save. No production writes.
2. Detailed passive sample1, run45496995226: first submit17868ms; second pointerdown18137ms and click/submit18138ms reach the actual Save button/form. At retry, disabled=false, button/ancestor inert absent. Bubble-phase submit defaultPrevented=true is the expected canonical handler preventing navigation, followed by the settings POST; it is not evidence that the save was suppressed.
3. Main scrollTop1042→1026 and Save y792.171875→808.171875 reproduce the16px movement. The document-relative button position remains1834.171875 in this sample: the viewport movement accompanies main scrolling. This observation does not prove the trigger of every original layout change.
4. Retry pointer y832 has only about2px clearance below the visible toast bottom830; entering transform can vary its boundary. Detailed journals record pointer-events:auto and both hidden/entering/visible states. In successful samples the hit stack at actual dispatch has the button first.
5. Crucially, second-purchase-click traces in29 of the first32 samples report toast interception too (all except scroll-toast), then still submit and save. This includes uninstrumented controls with149–191ms click durations, close to the original195.691ms failed action. Entering-toast sample2 records five intercepted actionability attempts, then succeeds; its retry duration is997.7ms. Thus interception/16px movement alone are **not sufficient** to explain a lost retry.
6. No matching missed-submit failure occurred with either detailed or lean instrumentation, entering/active toast, scroll control or one-CPU scheduling. This fails to establish a new causal chain. It does not prove the original failure impossible, certify browser stability, justify retries to GREEN or establish a test-only synchronization defect.

### Current decision and missing causal evidence

Environment access is no longer blocked. The original inference “toast interception caused the missing second POST” is **not confirmed**; the simple sufficiency claim has direct successful counterexamples. A narrower transient input/compositor/retargeting race remains possible. No evidence currently supports approving a runtime/test repair as the verified G09 fix.

What is still missing is one **matching failed execution** carrying actual pointerdown/up/click recipient and submit/disabled/inert timeline. The original CI trace cannot retroactively supply those DOM events; successful new journals cannot stand in for the missing failed path. Preserve the prepared lean journal for a future captured recurrence or separately bounded reproduction budget. Do not run full release CI to search for it.

## Classification and confidence

| Candidate explanation | Evidence / conclusion |
| --- | --- |
|Runtime UX overlay/hit-testing race|Interception/overlap observed, but42 passing controls and successful intercepted retries disprove its sufficiency as a complete explanation. A narrower timing race remains unconfirmed.|
|Form busy/inert or handler suppression race|Successful journals show enabled/non-inert Save, real submit and expected handler defaultPrevented. No failed journal exists, so the original path remains open.|
|Wrong test synchronization|Text assertions do not wait for compositor/hit-target stability. However expected second POST, success acknowledgement and reload persistence are correct behavioral contracts. No evidence justifies weakening them or merely waiting longer.|
|Original CI environment instability|No original engine crash/library/network-setup failure observed. Not established as root cause. Pinned image and other successful runs do not eliminate timing sensitivity.|
|Backend/payload/finance defect|Original503 deliberately injected; first payload correct; second request absent. No evidence of server rejection of a retry or altered financial calculation.|

Proven partial defect: a passive status toast can intercept the Save pointer area in this mobile journey. Complete G09 classification remains unresolved until a matching failure records the missing input/submit chain. The historical local Docker failure below has been bypassed with Actions; it never explained the original CI failure.

## Historical local attempt — environment blocker superseded by Actions

Verified Docker daemon29.9.2, VFS storage driver, linux/amd64 manifest. Pulled the exact existing workflow image:

`mcr.microsoft.com/playwright/python:v1.65.1-noble@sha256:0ab41a37431309d72b7a26f40ef1fdb464a62740196b2143965a2f59dc090409`

Pull completed with the exact digest. amd64 manifest is `ce84a3d75a47e81657d2ec2c0a949e6e0ef790abdc32ce6819220a3df987ff9a`; image reports2.463GB. Largest compressed layer is874,172,603 bytes. Planned run mounted repository read-only, diagnostic output separately, retained canonical fixture interception, assertions and default click/expect timeouts. It would use the unchanged requirements-ci.txt (Playwright1.65.1) inside the isolated container, not change project dependencies.

Container creation failed **before Python/client/browser/scenario startup**:

`mkdir .../docker/vfs/dir/.../usr/share/fonts/opentype/tlwg: no space left on device`

Filesystem total7.9G, used7.5G, available0 at failure. No Docker container existed after failed creation. Removed only the image pulled by this investigation; no system prune/daemon/config changes. Afterwards disk has2.9G free and Docker lists no images/containers. No dependency installation or new browser run occurred. Host Playwright1.62.0 was not substituted for1.65.1. The read-only original artifact analysis remains valid.

**Historical capacity requirement:** a runnable exact-image environment was missing at the earlier stage. This requirement is now satisfied by the isolated Actions runs above; local storage changes are unnecessary. The remaining blocker is causal evidence, not Docker capacity.

| Acceptance/scenario | Current evidence |
| --- | --- |
|First rejected save retains input and previous acknowledged cache|PASS in original and42 new samples|
|Retry emits correct second POST|FAIL in original; PASS in42 new samples, matching payloads independently checked in34 request journals|
|Successful response then authoritative reload readback|NOT REACHED in original; PASS in42 isolated fixture runs|
|Rapid retry / active toast / entering transition / scrolling /440px|Executed with plain, detailed, lean and CPU-affinity controls; no matching failure|
|No duplicate purchase writes or false success in executed scenarios|Canonical strict assertions pass; broader pending/double-tap/concurrency cases below remain future regression scope|
|Pinned diagnostic environment|UNBLOCKED and working on GitHub Actions|
|Complete G09 root cause / technical release recovery|UNRESOLVED / PASS after the single controlled attempt above; physical-device acceptance separate|

## Conditional minimal fix proposal — not applied

This is not yet an evidence-backed G09 repair recommendation. If a matching failed event log confirms toast retargeting/occlusion causes the lost submit, the smallest candidate is to exclude **passive, non-interactive status toasts** from pointer hit-testing in their canonical CSS for entering, visible and exiting states. Preserve text, visual timing, role/status and aria-live semantics. All application saves remain owned by the same handler; no pricing, settings payload, persistence or financial changes.

Do not apply a blanket rule to future interactive notifications/actions without reviewing their interaction contract. If reproduction instead identifies busy-state/submit ownership as the cause, repair that narrow transition and keep notification styling unchanged. If only a test scheduling fault is proven, synchronize the diagnostic/test to an explicit observable state while preserving the same user action and every request/persistence assertion; do not accept a missed click as success.

This is a scoped proposal for later approval, not a repair. No force-click, sleeps inserted into the canonical test, timeout increases, assertion removal, whole-journey retries or full-CI reruns performed.

## Regression plan for a separately approved repair

1. First reproduce with the unchanged canonical script in the pinned image; retain both passes and failures, seeds/timing and exact artifact hash. Passive instrumentation must have a no-instrumentation control because forced layout reads can perturb timing.
2. Rapid rejected→retry scenario: keep input/cache rejection assertions, observe exactly two identical normalized settings POSTs, correct503→200 responses, unchanged unrelated settings, no success before acknowledgement.
3. Exercise toast insertion, entering/visible/exiting states, long two-line text, scrolled Save, main-scroll changes and keyboard/safe-area offsets at440px; include desktop and other supported mobile widths after scope approval. Log actual input targets and submit before proposing a synchronization change.
4. Pending/double-tap negative cases: first save pending keeps controls appropriately locked; rapid extra clicks cannot duplicate a write. After rejection a genuine new intent can submit exactly once. After success no repeated acknowledgement or unrequested save.
5. Successful retry updates only acknowledged cache, then reload must GET authoritative isolated fixture storage and show the new value. A failed/lost response must not manufacture a success message; test recovery under a separately defined ambiguous-write fixture.
6. Preserve all existing positive/negative acceptance and full PR/main release gates. Include a controlled pre-fix failing case and a counterexample that still fails when retry is intentionally blocked. Avoid force-click or success based solely on toast text. Physical iPhone acceptance is separate from Linux WebKit.

## Risk and rollback

Primary risk is mistaking a real missed interaction for flaky assertion timing. Extra waiting could hide it; instrumentation may alter scheduling; global pointer rules could affect interactive notifications. No evidence currently warrants Supabase, financial or deployment edits.

Diagnostic rollback: stop using/delete only the isolated diag/g09-runner branch and its temporary workflow after retaining evidence; discard external scripts/output as desired. No diagnostic code was merged into main, pages.yml was untouched, and application/canonical test files are unchanged. The earlier local image was removed after ENOSPC. A future CSS/UI repair would require its own versioned release, exact artifact and compatible known-good frontend rollback while preserving all orders/payments; any test-only repair must preserve the strict negative contract. Technical CI/deploy/live acceptance passed in the controlled recovery above. G09 root cause remains open; Independent Review and physical-device acceptance are not claimed complete.
