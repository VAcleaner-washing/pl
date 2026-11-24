# Gap Analysis — recommendations, not implementation approval

Baseline/evidence: [audit](2026-11-24-engineering-product-audit.md), [ownership](2026-11-24-architecture-data-ownership.md), [QA](2026-11-24-qa-cicd-assessment.md). Each recommendation has one ID; risk register and plan reference these IDs rather than repeat requirements.

Priority high/normal/low describes scheduling; severity describes impact if realized; Roadmap phase describes approved scope. No recommendation is labelled roadmap P0 merely because it concerns security or finance. Effort/cost are preliminary engineering estimates in person-days (pd), excluding subscriptions, tax and external service work; no spending is authorized. Owners below are proposed accountable functions, not confirmed appointments.

## G01 — prove product authorization boundaries

- Current state/evidence: deployed bookings v12 and fleet v1 validate tokens then query shared `admin_users`; RLS/default-deny and service-only RPC EXECUTE protect browser access, but service-role functions bypass RLS. [Ownership inventory](2026-11-24-architecture-data-ownership.md).
- Problem/impact: a VA HOME-only admin may satisfy VAcleaner authorization depending on shared membership. Cross-product authorization is unproven; no exploit or PII exposure has been demonstrated.
- Proposed solution: first inventory each function's allowlist, storage/grants and shared owners; create isolated role matrix (anonymous, invalid, VA HOME-only, VAcleaner-only, both, revoked). Any allowlist change must be a separately approved compatible security PR with actual persisted negative tests and rollback.
- Priority: high; impact severity: high; phase: P1 evidence, future product/security scope outside process roadmap.
- Risk: false isolation claim or accidental lockout/shared-product regression. Cost: 2–4pd audit/test design, remediation separately estimated; complexity: high.
- Dependencies/owner: isolated project fixtures, joint VA HOME/VAcleaner security owner; no production role mutation.
- Measurable result: 100% active manager endpoints mapped to authorization decisions, zero unauthorized cross-product access in isolated matrix.
- Acceptance Criteria: matrix evidence names exact deployed/source versions; all unauthorized cases 401/403, authorized cases work; grants/storage reviewed; scope and recovery approved before implementation. Missing test identity remains blocked.

## G02 — reconcile backend provenance

- Current state/evidence: committed Edge snapshot dated 2026-10-20, expected DB inventory lists 21 tables; live lists 23 including fleet. Local/live fleet migration timestamps differ. `check:backend` tests snapshot consistency only. Fresh bundle check finds bookings config release-marker-only drift (4.3.37 vs4.3.69, same business config/source hash); fleet checker assumes verify_jwt=false although deployed fleet has true.
- Problem/impact: green static inventory can conceal version/source drift and make rollback/migration replay unsafe.
- Proposed solution: documented source/live hash and migration mapping, preserving original applied history; extend inventory validation only in a later approved PR. Do not replay or rename applied migrations to force equality.
- Priority: high; severity: high for unverified backend release; phase: P1 inventory.
- Risk: false drift classification or destructive migration replay. Cost: 1–3pd; complexity: medium.
- Dependencies/owner: read-only deployed bundle export, deployment receipts, backend owner; SQL definitions comparison with no business rows.
- Measurable result: every active VAcleaner entrypoint/dependency and migration has mapped version/hash/status.
- Acceptance Criteria: stale snapshot labelled historical; fleet included in future authoritative snapshot; source/deployed discrepancies dispositioned; fresh snapshot check fails omitted imports and wrong project; no DB mutation during reconciliation.

## G03 — enforce release policy at repository boundary

- Current state/evidence: Branch API says `main.protected=false`, required status contexts empty. Workflow deploy waits for all full gates. Standard/spec require reviewed branch/PR and squash.
- Problem/impact: workflow protects deployment but does not demonstrate repository enforcement against direct push or premature merge. Rulesets were not independently enumerated; effective bypass capability is unverified.
- Proposed solution: inspect effective rulesets/permissions first; propose required checks and PR review enforcement compatible with docs-only classification. Treat policy configuration as separately approved work, no change in this audit.
- Priority: high; severity: high; phase: P1 evidence/P2 future release checklist.
- Risk: incorrect required contexts could block docs-only or create bypass. Cost: 0.5–1pd; complexity: medium.
- Dependencies/owner: repository administrator, current classifier behavior, effective ruleset API access.
- Measurable result: all main changes follow the same enforceable release contract.
- Acceptance Criteria: recorded effective rules and bypass actors; isolated/dry-run validation of full-code and docs-only PRs; direct push and missing required gate rejected under agreed policy; rollback procedure documented.

## G04 — reduce feedback latency using complete measurements

- Current state/evidence: 68 static/52 browser suites; successful full main25m16s, Browser12m36s then WebKit11m31s; standalone recovery overlaps registry. Docs-only fast path and pinned runtime already implemented.
- Problem/impact: serial path dominates code PR feedback; source-string assertions can fail on harmless refactors; no defensible duplicate coverage percentage yet.
- Proposed solution: retain current gates; collect at least three equivalent full successful runs and first failures, rank suite durations; prove equivalence before deduplication; introduce behavior fixtures when replacing a brittle assertion. Do not adopt Vitest merely to rename runner.
- Priority: high; severity: medium; phase: P1 timing inventory, P2 future optimization.
- Risk: dropped setup/negative cases or false speed claims. Cost: 2–5pd; complexity: medium/high.
- Dependencies/owner: Actions artifacts and test owner; isolated reproducible failures; no new dependency required for measurement.
- Measurable result: proposed target ≥20% median reduction for comparable code-PR critical path, with unchanged full acceptance and first-attempt failure rate no worse; target is not achieved evidence.
- Acceptance Criteria: comparable three-run baseline/after medians, runner/setup included, same scenarios/negative cases, full main/release gates pass; first failures retained; coverage equivalence reviewed before deletion.

## G05 — close native PWA/accessibility acceptance

- Current state/evidence: live worker4369 and `/admin/` manifest, activation/network-first protection, Browser/WebKit operations coverage. Native iPhone checklist in CI-SELECTIVE-VALIDATION remains not confirmed. CSS layered; owner-required pinch restriction retained.
- Problem/impact: installed worker/session, keyboard/safe-area and zoom/accessibility cannot be certified by Linux fixtures. User impact unmeasured; test absence is not a proven defect.
- Proposed solution: execute existing checklist on installed app without clearing storage or saving business entities; record device/build and screenshots. Later assess keyboard/screen reader/contrast and owner zoom decision; axe-core is optional after evaluating existing coverage.
- Priority: high; severity: medium/high; phase: P0 evidence, P3 design intake.
- Risk: lost drafts if unsafe testing; inaccessible controls. Cost: 1–2pd including devices; complexity: medium.
- Dependencies/owner: physical iPhone administrator, read-only workflows; no reinstall masking.
- Measurable result: all native checklist items explicitly pass/fail/blocked; zero critical keyboard/overflow defects in agreed screens.
- Acceptance Criteria: iOS/build/time, registration/controller/cache evidence, offline honest errors, reconnect, dirty/pending protection, portrait/landscape keyboard; accessibility issues reproducible and separately scoped.

## G06 — establish useful monitoring and performance evidence

- Current state/evidence: Actions artifacts, booking/SMS audits and read-performance QA exist; no verified external alert delivery, Sentry/Better Stack workspace or p75 CWV dataset retrieved.
- Problem/impact: regression discovery and recovery time unknown; CI cannot detect all runtime errors, session failures or latency on real devices.
- Proposed solution: define small availability/error/recovery SLO set and owner; evaluate existing hosting/Supabase logs first, then one uptime tool and one error tool only if needed. Use current static/read-performance baselines and available CrUX/GSC before adding RUM SDK.
- Priority: normal; severity: high for undetected outage; phase: P1 inventory, future SRE scope.
- Risk: PII/token leakage and noisy duplicate alerts. Cost: 2–4pd + optional service tier (not authorized); complexity: medium.
- Dependencies/owner: SRE/product owner, retention and redaction policy, alert destination approval; no messages sent by audit.
- Measurable result: proposed detection ≤5min for static outage; p75 LCP≤2.5s/INP≤200ms/CLS≤0.1 only where sufficient field data exists.
- Acceptance Criteria: synthetic non-mutating failure reaches agreed owner in test; no PII/token payloads; measurable window/sample; restore drill and incident timeline; missing field data remains unknown, not zero.

## G07 — reconcile finance/customer/marketing metrics

- Current state/evidence: service vs received/deposit contract implemented; referral uses distinct from message cohorts; event attribution and dataLayer hooks exist. Analytics accounts/consent and completed revenue/refund reconciliation not verified.
- Problem/impact: treating received deposits as revenue or untracked referrals as organic misdirects decisions; event hooks alone do not establish conversion or ROI.
- Proposed solution: one metric dictionary linked from existing spec, with source/formula/timezone/status/refund/dedupe/owner; isolated reconciliation fixtures. Validate current GA4/GTM delivery before considering PostHog/Metabase/Meta Pixel.
- Priority: normal; severity: medium/high; phase: P3 backlog only, future business analytics scope.
- Risk: PII, double events, cohort misattribution. Cost: 2–4pd; complexity: medium.
- Dependencies/owner: business/finance owner, read-only analytics access, privacy review; sanitized fixtures.
- Measurable result: 100% displayed decision KPIs mapped; fixture revenue/deposit/refund balances reconcile exactly; one conversion per successful intent.
- Acceptance Criteria: pending/issued/completed/cancelled/partial/refund cases, Kyiv business timezone explicitly chosen by owner, no bank/PII payload, observed consent behavior and test event receipt; no invented ROI.

## G08 — consolidate design/export and planning ownership

- Current state/evidence: compiled operations sources, 33 asset CSS files, repeated attribution capture; shared Back and compact finance already implemented. 22 open PRs include receipt-integrated #74–77. No confirmed Figma/Storybook/Projects workspace.
- Problem/impact: unclear edit location, growing layers and stale PR states increase accidental scope and rework; lack of a named vendor tool alone is not a gap.
- Proposed solution: document edit/build ownership and component patterns using existing sources; ADR for substantial future decisions; triage old PRs with owner and link integrated commits before closing. Map remaining P3 items to existing backlog, no duplicate product rebuild.
- Priority: normal; severity: medium; phase: P1 inventory/P3 backlog.
- Risk: premature CSS extraction or closing unique work. Cost: 1–3pd documentation/triage; complexity: medium.
- Dependencies/owner: design/product/release owner, current UI flows and export source ownership.
- Measurable result: every future UI task names source, contract and test; each old PR gets explicit disposition proposal.
- Acceptance Criteria: documented source→artifact mapping; shared pattern examples, failure-state checklist; no automatic closure; Figma/Storybook adoption only if measurable benefit exceeds maintenance/privacy cost.
