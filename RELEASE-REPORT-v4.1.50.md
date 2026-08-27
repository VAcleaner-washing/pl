# VAcleaner v4.1.50 — FULL QA & CONSISTENCY

Scope: no new product/business features. Consolidation release for booking UX, address/delivery clarity, package pricing consistency, technical content accuracy and CI coverage.

- Smart Entry hover/focus/selected contrast fixed.
- Booking hardening cache key moved to current build.
- Delivery no longer shows ambiguous “250 / від 350” before address selection.
- Address autocomplete retries normalized input; backend retries Photon queries and preserves typed Poltava house numbers when OSM has the street but not the building.
- Package cards use one price presentation sourced from config.
- Eight public guides technically re-audited: Puzzi dwell/extraction sequence, SPOT FIX blotting, STAIN OX dwell/rinse, Jimmy dry-deep-cleaning role, steam safety and ABIR workflow.
- New v4.1.50 CI contract added.

Production backend:
- vacleaner-address-v1 deployed as v8 ACTIVE (search retries + Poltava typed-house fallback).

Final verification:
- v4.1.50 full QA: 24/24
- public SEO: 402/402
- check-build: 413 file checks
- v4.1.48 content: 94/94
- v4.1.49 performance/CI: 21/21
- delivery distance: 18/18
- trust/rules: 16/16
- funnel analytics: 15/15
- visual: content 90/90, growth 135/135, inner heroes 259/259
- URL-based local E2E remains blocked by the execution environment before navigation with ERR_BLOCKED_BY_ADMINISTRATOR; GitHub CI contains the real browser hover regression check.
