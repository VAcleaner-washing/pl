# VA Engineering & Product Standard v1.1

Shared engineering policy for VAcleaner and VA HOME. Local product specifications and approved release gates remain authoritative; resolve conflicts explicitly, never silently weaken them. Products remain independent even where infrastructure is shared.

## Decision and scope
Evaluate architecture, business correctness, UX, security, performance, maintainability and commercial value. Read local AGENTS.md, canonical specs, roadmap, main, open PRs and CI before editing. Every task must state a concrete expected result, scope, constraints and acceptance criteria; record relevant dependencies, risk and evidence. Keep unrelated discoveries in backlog. Do not reorder approved phases. Track roadmap phase separately from urgency (critical/high/normal/low) and actual impact severity. P0 is not implied by a finance/security label. Do not ask again for permission explicitly granted in the current task; obtain approval for scope expansion, new costs, destructive operations, unapproved business rules or material architectural changes.

Scale analysis, documentation and preparation to task complexity and risk. Reuse verified context and evidence; repeat an audit only for a stated, justified need, such as a changed baseline or new evidence. Do not turn a simple change into a large engineering study.

## Product & Design Governance
For VAcleaner, the Product Owner approves product and design decisions. ChatGPT provides CTO and UX/UI design oversight and independent control; Codex is responsible for technical implementation. Independent control must be a separate review of Codex's implementation, not Codex's self-review.

Before implementing substantial UX/UI changes, obtain Product Owner approval of a visual reference defining composition, information hierarchy, typography, spacing, colours and responsive behaviour. Codex must implement that approved concept, not substitute its own design. If a technical constraint requires a design deviation, explain it and obtain the Product Owner's decision before making that deviation.

Product/design approval does not replace the existing same-change regression contract, CI/CD gates, independent exact-head review or production acceptance requirements below and in the canonical product specification.

## Engineering
Use the smallest coherent change; single source of truth, explicit ownership, separation of concerns, backward compatibility, least privilege. Avoid duplicate calculations, hardcoded business values and unnecessary dependencies. Update behavior, canonical documentation and regression tests together. Use versioned database migrations, constraints, transactional/idempotent writes, server-side validation, RLS and scoped authorization. Never expose service credentials or weaken RLS. Isolate product data and access; inspect cross-product effects before shared infrastructure changes.

## Product, UX and PWA
Preserve brand identity, existing design contracts and the approved visual reference. Mobile-first, accessible controls, keyboard and touch support, consistent navigation, loading/empty/error/success states, safe areas, no overflow. Accept visual changes by their actual appearance and interface usability against the approved reference at relevant viewports, not passing tests alone; verify relevant real-device behavior separately. PWA: manifest, worker scope, cache/version coherence, offline/reconnect, update and session recovery. Never imply a write succeeded before confirmation; avoid ambiguous write retries and duplicate payments.

## QA and release
Scale checks to task risk: audit = evidence report; design = agreed prototype; docs = links/consistency and applicable repository gates; behavior = targeted regressions plus mandatory release gates; DB/payment = isolated integration, negative/concurrency/idempotency cases and recovery plan. Test behavior rather than incidental strings. Preserve first failure and negative cases; diagnose root cause before rerun. For animation timing (e.g. 120 ms CSS transition), wait for observable stable state rather than weakening assertions or adding arbitrary sleeps. Keep self-review, independent review, local tests, CI, production and physical-device verification separate (passed/failed/not run/blocked). Never claim a role as evidence.
Use fail-fast, caching, parallelism and selective checks only where coverage equivalence and local policy permit. Branch from verified baseline; PR with scope, changed files, tests, risks, migration and rollback. No bypass of required gates. Confirm deployed version, commit/artifact provenance and safe live smoke tests; green CI alone is not production proof. Report implemented awaiting verification if blocked.
Rollback frontend via known compatible artifact; backend via compatible function/config version; database via reviewed forward repair or tested restore with reconciliation. Preserve orders, bookings and payments created since release; never blindly restore old production snapshots. Record recovery owner and evidence.

## Security, performance and monitoring
OWASP risks, input validation, authentication/authorization, webhook authenticity, rate limits, secrets and privacy. Never send customer PII or payment secrets to analytics/logging. Monitor availability, errors, latency, payment failures and PWA recovery where supported. Core Web Vitals targets at p75 real-user data when available: LCP <=2.5s, INP <=200ms, CLS <=0.1. Do not trade correctness for scores.

## Business analytics and growth
Each metric requires source, formula, period, timezone, included statuses, refund rules and tests; missing data is unknown, not zero. Separate cash movement, revenue, liabilities, expenses and profit. VAcleaner: deposits not automatically revenue; utilization, repeat rentals, conversion, referral and equipment yield. VA HOME: revenue, COGS, margin, average order, repeat purchase, checkout conversion and acquisition cost. Define event schema and deduplication; use consent and privacy safeguards. No dark patterns or invented scarcity. Preserve premium positioning for VA HOME and local trust/ease of booking for VAcleaner.

## Tooling and reporting
Use verified existing tools first. Evaluate benefit, cost, overlap, privacy, maintenance and access before adding tools. Record installed/configured/verified separately from proposed. Report product, task, phase, actual diff/commit/PR, commands/results, independent review, CI, production/device evidence, blockers and next in-scope action. Do not invent progress. Documentation-only tasks do not require a product release unless repository policy says so.
