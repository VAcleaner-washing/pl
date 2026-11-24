# Risk Register — 2026-11-24

Scale: impact high = authorization/data/release correctness or sustained operational disruption; medium = rework/visibility/UX degradation. Likelihood is qualitative, not a statistical probability. Priority, severity and roadmap phase are distinct. Remediation scope, estimate, dependencies and acceptance criteria are canonical in [Gap Analysis](2026-11-24-gap-analysis.md).

| Risk | Evidence and uncertainty | Impact / likelihood | Priority | Proposed owner | Containment now / next gate | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| R01 Shared admin boundary | Two deployed manager functions use shared `admin_users`; no cross-product role matrix | High / unknown | High | Security + both product owners | No auth changes; no claim isolation verified; isolated negative tests | G01 |
| R02 Stale backend inventory | October snapshot, fleet absent; migration IDs differ | High / medium | High | Backend/release | Treat snapshot as dated, never replay blindly | G02 |
| R03 Policy not proven enforced | main Branch API unprotected; effective rulesets unknown | High / unknown | High | Repository admin | Manual exact-head PR/full-gate review, no bypass | G03 |
| R04 Long/flaky feedback | Browser→WebKit serial; historical first failures; text assertions | Medium / observed | High | QA/CI | Preserve assertions/first failures, no arbitrary retries | G04 |
| R05 Installed PWA not verified | Linux/HTTP cannot prove native controller/session | High / unknown | High | Admin + QA | Existing physical checklist; do not clear storage | G05 |
| R06 Runtime blind spots | No verified alert delivery or RUM p75 | High / unknown | Normal | SRE | Retain CI/audits, plan non-mutating alert drill | G06 |
| R07 Misleading business metrics | Received includes deposit; analytics delivery not verified | Medium/high / unknown | Normal | Finance/Growth | Use spec semantics, label missing data unknown | G07 |
| R08 UI/source and PR ambiguity | compiled sandbox inputs, old integrated PRs still open | Medium / observed | Normal | Product/design | Source inventory; no unapproved rewrite/closure | G08 |
| R09 Shared advisor warnings | pg_net/public, auth SD functions, leaked-password protection off | High conditional / unknown | High for triage | Joint security/infra | Review context/grants; no shared config edits | G01/G02 |
| R10 Concurrency coverage not accepted | #84 Draft explicitly lacks isolated execution/multi-connection race evidence | High / unknown | High | Backend/QA | Keep #84 untouched; no production SQL fixtures | G01/G02/G04 |

No confirmed active data-loss incident or demonstrated unauthorized access was found by these metadata/source checks. This is not certification that such defects do not exist. Closure requires the referenced acceptance evidence, not a green documentation PR.
