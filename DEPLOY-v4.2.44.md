# VAcleaner v4.2.44 — STABILIZATION / ACCEPTANCE

## Release intent

One stabilization release, no new feature scope. It closes recent incomplete UX/data work before further product development.

## Production baseline

- Frontend baseline: `e843b61af1565a9b3279b12cf59dec5c92f1068b` (`v4.2.43-CRITICAL-BOOKING-FIXES`).
- `vacleaner-address-v1` production v13 ACTIVE.
- `vacleaner-admin-bookings-v4` production v8 ACTIVE.
- `vacleaner-booking-v5` production v27 ACTIVE.

No additional Supabase deployment is required by the v4.2.44 CSS/acceptance changes. The already-synchronized v8 admin backend is required for Story reward persistence.

## What is stabilized

- Desktop/PWA preliminary and final settlement UX.
- Story reward diffuser / chemistry persistence and accounting.
- Actual admin booking-card delivery alignment.
- Client-card mobile geometry.
- Booking action-row fill behavior.
- Public promo visibility and manual-address fallback contracts.
- Finance / Analytics shared control consistency.
- Referral/browser navigation regressions.
- Exact-surface acceptance testing so screenshot-driven fixes cannot pass by changing a different component.

## Build

Release **4.2.44**, build **4244**. Public/admin asset query versions, PWA build and service worker are stamped together.

## Gates before Pages deploy

Local evidence:

- `npm run qa:static` → **102/102 PASS**.
- `npm run test:v4.2.44-stabilization` → **22/22 PASS**.
- `npm run test:stabilization-acceptance-browser` → **20/20 PASS**.
- Canonical browser suites executable locally → **28/31 PASS**; 3 localhost-server suites are blocked by the execution environment, with no product assertion reached.

After committing this archive, GitHub Actions `Static / build gate` and `Browser QA aggregate gate` must both be green. GitHub Pages deploy must remain blocked if either gate fails.

## Historical data

Do not auto-rewrite already completed bookings. A manager may explicitly reopen/correct a historical settlement if the historical Story reward was recorded under the old chemistry-only behavior.
