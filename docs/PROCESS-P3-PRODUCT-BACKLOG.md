# VAcleaner — P3 product backlog (proposal only)

**Roadmap: P3 — produce a prioritized backlog for UX/UI, finance, equipment and customers.** This is a planning document only. No product behavior, database, deployment or business logic is changed. Priorities are proposed, not approval to implement. Existing `docs/ADMIN-IMPROVEMENTS-BACKLOG.csv` remains the detailed historical audit; this document is the scope-separated intake for later product work.

| Priority | Area | Observed issue / proposed work | Acceptance criteria for a future separately approved PR |
| --- | --- | --- | --- |
| P1 | Equipment | Equipment configuration is split between Settings and Equipment; out-of-service inventory has reportedly remained bookable | One authoritative availability source; broken or unavailable units cannot be booked; admin and public PWA agree; regression tests cover partial fleet availability |
| P1 | Finance | Client finance view is perceived as only received/returned amounts, with unclear rental spend and refundable deposit | Separate revenue, deposit received, deposit returned, outstanding balance, customer spend; reconcile test fixtures and clear terminology |
| P1 | UX/UI | Admin navigation/back controls differ and a page cannot scroll to its bottom on some screens | Consistent back navigation; all controls accessible at mobile viewport and browser zoom; browser accessibility checks |
| P2 | Customers | Referral code ownership, editing and referral analytics have been unclear or inconsistent | Deterministic owner/recipient rules, editable constraints, attribution and report totals tested across periods |
| P2 | UX/UI | Equipment editing and admin screens need a cohesive visual audit | Approved component patterns, no duplicate controls, responsive QA and visual snapshots |
| P2 | Customers | Customer history should distinguish bookings, completed rentals, deposits and net spend | Consistent customer-level summaries reconciled against individual transactions; zero/partial/refund cases tested |

## Scope and handoff

- Do **not** implement these items inside the CI/process initiative, including seemingly small fixes.
- Before implementation, verify each issue against current production, reconcile with System Spec and existing backlog, estimate impact/risk, and obtain explicit authorization for a separate product scope.
- No PostgreSQL/Supabase mutation, finance settlement, booking behavior, equipment configuration or public/admin UI change is part of this P3 document.
- The process-modernization initiative remains open until P0 live PWA evidence and P2 release/PR acceptance requirements are independently verified.

## Current-source triage — 2026-11-23

Roadmap: P3 — qualify the existing four-area backlog, without implementation. The rows above are historical reports and future acceptance proposals, not proof that every reported defect persists.

- **Equipment:** FLEET-001 and PR #79 already define per-unit serviceability and the three-tab Equipment workspace, including purchase baseline editing. Future work starts with a reproducible remaining discrepancy; do not rebuild that feature or move its editor back to Settings. Production database mutations/PR #84 remain outside this initiative.
- **Finance:** PR #79 already distinguishes service cost and received funds; customer net spend, refundable deposit and historical ledger reconciliation remain separate proposed acceptance work. Do not relabel received deposits as revenue.
- **UX/UI:** shared Back controls and catalog scrolling already have contracts/browser coverage. Retain a concrete failing screen/device/state before opening a new product PR; a physical-device gap is not proof of a code defect.
- **Customers:** retain referral ownership/attribution and customer-history reconciliation proposals; first compare current System Spec and historical backlog to avoid implementing completed behavior twice.

All priorities and the UX/UI–finance–equipment–customers scope are preserved. No product item was implemented or authorized by this triage.
