# Proposed modernization plan — approval required before implementation

This plan does not rewrite [approved P0–P3](../DEVELOPMENT-ROADMAP.md). It orders evidence and decision gates; high priority is not a new roadmap phase. Recommendations and all acceptance fields remain in [Gap Analysis](2026-11-24-gap-analysis.md).

| Order / decision gate | Existing scope mapping | Deliverable / recommended owner | Exit evidence |
| --- | --- | --- | --- |
| 1. Accept audit baseline and reconcile documentation | P0 production baseline; P1 architecture/test inventory | Current audit, ownership, risk/tooling/QA reports; product owner reviews | Exact source/deploy/live evidence and unknowns separated; no unsupported completed-phase claim |
| 2. Close read-only security/provenance evidence | P1 inventory, G01–G03 | Joint security/backend/repository owners define role matrix, migration/bundle map, effective ruleset report | No shared infrastructure change; isolated testing scope explicitly agreed |
| 3. Close native acceptance | P0 remaining device evidence, G05 | Administrator/QA executes existing installed iPhone checklist | Build/controller/cache/session/offline/keyboard evidence; fail states become scoped backlog |
| 4. Approve next process optimization PR | P2 existing feedback/regression/release bullets, G04 | QA/CI owner measures three full runs; equivalence review before removal | ≥20% comparable median target proposed, zero removed coverage; no speedup claim until measured |
| 5. Approve independent product/SRE proposals | P3 backlog only, G06–G08 and later G01 remediation | Product owner chooses measurable metric/monitoring/design outcomes | Separate scope, costs, privacy, owners, tests, rollback; no product implementation under process initiative |

Recommended stack now: retain static public export and modular JavaScript, existing vanilla admin and operations build, Supabase Edge/Postgres with RLS and service-only RPC, GitHub Actions/Pages artifact promotion, Node regression registry and Python Playwright. Keep config stamping and exact artifact receipts. No evidence justifies a new frontend framework, Supabase split, Vitest migration, or simultaneous deployment of several analytics tools during this audit.

Professional tooling: [TOOLING](../TOOLING.md) is the canonical assessment. Prefer ADR Markdown and current component patterns first. Evaluate ESLint/Prettier incrementally in a future PR without mass formatting. Evaluate security automation after current custom checks and shared access review. First verify current GA4/GTM/GSC before additional analytics; alerting/error reporting only with named operational owner, redaction and cost decision.

Suggested initial planning envelope: evidence/security/provenance/device work roughly 5–10 person-days with overlap; estimates are not commitments and cannot replace named owner/device access. G01–G08 estimates overlap and must not be summed as a fixed-price implementation quote. Implementation must wait for audit approval; missing service access does not authorize installation or paid plans.

Existing P3 [product intake](../PROCESS-P3-PRODUCT-BACKLOG.md) and [historical CSV](../ADMIN-IMPROVEMENTS-BACKLOG.csv) retain their role. Fleet serviceability, shared Back/catalog scrolling and service/received finance visibility already have implementations and contracts; only reproduced remaining defects may create new tasks. Never rebuild them from historical reports alone.
