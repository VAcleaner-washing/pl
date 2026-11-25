<!-- For process modernization PRs only, include Initiative: process-modernization. Ordinary product PRs should not use this marker. -->
## Roadmap scope
Roadmap: P2 — <exact approved roadmap bullet>

## Change and reason
Describe the smallest change needed for this bullet.

## Files and regression impact
Explain changed files, related tests, and whether production behavior changes.

## Same-change evidence
Use the [change-impact mapping](../docs/CHANGE-IMPACT-MAPPING.md). For each affected behavior, explain the expected outcome and why the cited regression detects an incorrect outcome; file touches/checkmarks alone are insufficient. Keep private review packages, PII and credentials out of this public description.

| Behavior before → intended after (or preserved contract) | Authoritative source → artifact variant | System Spec contract/change | Targeted command, exact case/assertion, expected → observed positive and negative outcomes | Full-gate evidence / blocker on this head |
| --- | --- | --- | --- | --- |
| <specific user outcome> | <source and C/N/S/B target> | <contract and same-PR change> | <safe evidence reference; what wrong behavior fails?> | <run/SHA or not run/blocked; targeted green is not full acceptance> |

For **no behavior change**, explain why source/build/runtime outputs and contracts are preserved, cite discriminating existing regressions and the actual diff/equivalence evidence, and justify why tests/Spec need no semantic update. Do not edit a test merely to satisfy a file-touch rule. Applicable Spec-touch guards and full gates still apply.

For review, identify any missing negative, persisted-state, artifact or device evidence and disposition it as accepted / changes required / blocked with a reason. Semantic completeness is reviewer responsibility; this template adds no automated gate or test selection. Record self-review, independent review, local QA, CI, deployment/live and device results separately. Relevant behavior, specification and regression updates belong in this PR.

## Validation
Tests: <commands run and results, or explicit blocker>

## Release safety
Explain release/rollback risk. Do not change product behavior under a process-roadmap PR.
