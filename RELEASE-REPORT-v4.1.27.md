# VAcleaner v4.1.27 — Safe Architecture Cleanup

Build: 4127  
Date: 2026-08-23

## What changed

1. `/umovy/` deposit table is no longer hardcoded. It renders from the shared `depositRules` config and resynchronizes after the live `vacleaner-settings` response.
2. Public booking catalog now resolves equipment by `data-product-code` first; visible product names are legacy fallbacks only.
3. Removed stale `sync-static-copy` booking rules that could regenerate the deleted Puzzi chemistry explainer/heading.
4. Desktop logout now uses the same Supabase `scope=local` logout flow as mobile More → Logout instead of only clearing local storage.
5. Added missing root Apple touch icon, 32×32 favicon and referenced Open Graph images (`og-home`, `og-booking`, `og-kits`, `og-reviews`, `og-solutions`).
6. Public SEO QA now fails if a local image/icon referenced by deployable HTML is physically missing.
7. GitHub Actions/backend checker wording now explicitly says it validates a committed backend inventory snapshot, not live Supabase.
8. Removed Python `__pycache__` artifacts from the release package.

## Safety boundaries

This release intentionally does **not** change:
- auth refresh single-flight implementation from v4.1.26;
- cross-tab auth behavior;
- initial admin `Promise.all` data-load architecture;
- PWA resume/recovery lifecycle;
- service-worker activation behavior;
- Supabase Edge Functions or database schema.

## Verification

- `npm run check`: PASS — 348 file checks
- Deposit policy: PASS — 66 assertions
- Auth refresh single-flight: PASS — 9 assertions
- PWA static: PASS — 83 assertions
- Stabilization contract: PASS — 172 assertions
- Public SEO: PASS — 337 assertions, including physical media existence
- Booking gifts: PASS — 21 checks
- Booking extras: PASS — 11 checks
- Admin labels: PASS — 36 checks
- Delivery settings: PASS — 14 checks
- Calendar live consistency: PASS — 7 checks
- Public booking resilience: PASS
- Desktop final visual QA: PASS — 319/319
- Build: PASS
- Second `npm run stamp`: 0 changed files (idempotent)
- Installed-PWA visual QA: mobile 320/390/430, Safari tab, tablet, landscape, auth and public booking sections ran without a FAIL; the local full command exceeded the execution time limit during the later desktop tail, so a complete suite PASS is not claimed here.

## Remaining audit items — intentionally deferred

These are not regressions introduced by v4.1.27 and should be handled as separate releases:

1. Cross-tab refresh-token coordination: `refreshPromise` coordinates one JS runtime, not two browser tabs/windows.
2. Initial admin data load still groups several endpoints in one `Promise.all`; secondary endpoint failure can theoretically affect first render. This should be separated only in a dedicated data-pipeline release with browser coverage.
3. Some production files still carry historical `glass-test` naming although they are now part of the actual admin UI.
4. Public copy contains a few manually maintained business facts (for example the “300 оренд” proof and structured opening hours) that should eventually be moved to a managed source if they are expected to stay live.
5. The committed backend inventory is now truthfully labelled as a snapshot; CI still does not make an authenticated live Supabase inventory call.
