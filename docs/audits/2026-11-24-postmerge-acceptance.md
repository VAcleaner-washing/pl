# PR #95 post-merge acceptance — first failure retained

Status: audit evidence, not implementation. [PR #95](https://github.com/VAcleaner-washing/pl/pull/95) integrated the standard/audit as squash `0b4c5c680f4a4b8de95d246306a5e583f3173782`. Exact-head PR run [45476683795](https://github.com/VAcleaner-washing/pl/actions/runs/45476683795) passed all full gates, attempt1. That does not certify merged-main production acceptance.

## Observed failure

Main push [45482260765](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765), attempt1: `Production operations / webkit / 440`, [job138758815898](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/job/138758815898), failed20:36:45 UTC. Failed step: **Test normal operations with all remote traffic intercepted**,20:36:19–20:36:42 UTC. The suite reports26 passed checks and1 failure. The complete run was still executing other jobs at inspection; it is not GREEN and deploy cannot pass while this required job fails.

Exact reviewed artifact verification passed first:273 files, release4.3.69/4369, tree SHA256 `4109bb6e7124ea3cad9a67e60e710574d893a9d39a8ac482f53ed36963139063`, identical to the accepted baseline application artifact. Main changed documentation only; source tree equals the tested PR tree. This evidence does not establish that every UI journey is reliable.

Failure artifact [14962087847](https://github.com/VAcleaner-washing/pl/actions/runs/45482260765/artifacts/14962087847), ZIP SHA256 `b341b4747b192a3a362b33e354eff6da12c3a936c074b97fd168341daab33197`, contains result.json, failure screenshot and trace.zip. Assertion at `scripts/admin_release_candidate_qa.py:309`: expected success toast after retrying the rejected equipment purchase-baseline save. Actual error toast persisted, then disappeared;5s assertion deadline expired. Success-retry payload/reload checks were not reached.

- Controlled first rejected save preserved entered input and acknowledged cache: passed.
- Trace second click (`jdxs@500`): error toast intercepted pointer events at16973ms; Playwright retried the click, target moved from y792 to y808, then click completed at17058ms.
- Captured request list contains only **one** settings POST. A second successful save was not observed. This is not evidence that a committed save lost its response.
- No uncaught application error and no forwarded/unexpected remote request. All APIs were fixture-intercepted; no production/staging business writes occurred.

The trace localizes an interaction/synchronization problem around retry, toast and scrolling. It does **not** prove the full root cause, a production finance defect, or that increasing timeouts/forcing clicks is correct. Existing successful PR/baseline runs and equal artifact bytes suggest intermittency; they do not erase this first failure.

## G09 — qualify and reproduce save-retry interaction

- Current state/evidence: failure above, unchanged application artifact, first rejection preserved correctly, second settings POST absent.
- Problem/impact: required main release acceptance blocked; rapid save retry may be lost in this WebKit/mobile fixture. Production frequency/impact unknown.
- Proposed solution: separate approved investigation with isolated reproduction and input/hit-target/form-submit/network acknowledgement timeline; distinguish UI event delivery from assertion synchronization. No automatic whole-journey retry, force-click, assertion removal or timeout relaxation. Any behavior correction must include spec and positive/negative regressions in the same separate PR.
- Priority: high; severity: medium for observed QA blockage, potential write-interaction impact unconfirmed. Roadmap: P1 evidence/P3 proposal; runtime implementation outside current audit scope.
- Risk: hiding a real missed action as a flaky test or falsely claiming success without persistence. Cost: preliminary1–2 person-days investigation; complexity: medium, remediation estimate pending reproduction.
- Dependencies/proposed owner: QA/frontend owner, pinned1.65.1 WebKit runtime, same reviewed273-file artifact, isolated fixture. Local1.62.0 cannot certify pinned-runtime behavior; no dependencies installed during audit.
- Measurable result: deterministic reproduction/negative control, no lost retry intent in controlled scenarios, exact payload/persisted readback consistency.
- Acceptance Criteria: retain first-error input/cache assertion; observe exactly two identical settings POST payloads for rejected→successful intent, no unrelated settings changes; success acknowledgement and post-reload authoritative value verified; adversarial toast/scroll/timing cases expose failure rather than mask it; original full gates remain intact; exact-head PR and merged-main QA recorded separately; physical-device acceptance remains separate.

## Disposition

No application/test/workflow/DB changes and no rerun performed in this audit. Standard integration is complete in Git history; merged-main release/deployment acceptance remains blocked. Production must continue to be described using the last independently verified baseline, not merely current main. This documentation supplement is held in Draft for review; it does not attempt another main deployment or authorize implementation.
