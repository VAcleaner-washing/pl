# VAcleaner v3.0.11 — PRODUCTION INVENTORY + CI HARDENING

Release status: **release candidate**  
Base: **v3.0.10 — BOOKING COPY + EXTRAS + SUMMARY UX**  
Date: **2026-08-06**

## Purpose

This release completes the production inventory/security pass for VAcleaner and adds a real browser-test gate before GitHub Pages deployment. It also fixes Carp-Deta end to end, after the audit showed that the item could be visible in the UI while legacy Edge Function catalogs silently discarded it.

## Block 4 — production backend / SQL / RLS

### Completed

- Inventoried the active VAcleaner Edge Function graph and recorded exact production versions, JWT modes and deployment hashes.
- Inspected the active dependency sources for `vacleaner-admin-bookings-v2`, `vacleaner-booking-v4` and `vacleaner-push`.
- Inventoried all nine `vacleaner_*` tables, their RLS state, grants, columns, constraints, indexes and trigger relationships.
- Confirmed that `anon` and `authenticated` have no direct table grants.
- Applied nine explicit restrictive deny policies for direct browser roles.
- Re-ran Supabase Security Advisor: the VAcleaner `RLS enabled, no policy` findings are gone.
- Re-ran Supabase Performance Advisor: no VAcleaner warnings were returned. Two unused-index notices remain informational and were deliberately not removed.
- Documented the active `admin_users` allowlist and retained `vacleaner_admin_users` as a non-destructive legacy mirror.
- Added production inventory manifests under `supabase/production-inventory/`.

### Production migrations applied

- `20260806193000_vacleaner_explicit_client_deny_policies.sql`
- `20260806194500_vacleaner_carp_deta_catalog.sql`

### Production Edge Functions deployed

- `vacleaner-booking-v5` — version **4**, ACTIVE, `verify_jwt=false`  
  SHA: `088faadd6e76a7125f42864168ea733c04e0eb9ebf913ed579b153953faae20a`
- `vacleaner-admin-bookings-v3` — version **11**, ACTIVE, `verify_jwt=true`  
  SHA: `6b6fb3321f060933144a287fa15dcda304a1d780292c244161fba144817fefb3`

### Legacy dependency decision

The production graph still uses controlled legacy dependencies:

- `vacleaner-booking-v5` → `vacleaner-booking-v4`
- `vacleaner-admin-bookings-v3` → `vacleaner-admin-bookings-v2` → `vacleaner-admin-bookings`

They were not removed in this release because doing so would be a destructive backend rewrite. Exact versions and hashes are now tracked. The current v5/v3 entrypoints normalize extras from the live shared catalog, so legacy catalogs can no longer discard a newly added item.

## Carp-Deta end-to-end fix

The audit found that v3.0.10 contained Carp-Deta in static HTML/config, but the hydrated React form and legacy Edge Function catalogs could omit or reject it.

v3.0.11 fixes the complete chain:

1. hydrated public booking form contains `carp_deta`;
2. public API payload contains the selected item;
3. `vacleaner-booking-v5` persists selected extras from the current catalog;
4. `vacleaner-admin-bookings-v3` normalizes admin extras from the current catalog;
5. production `vacleaner_settings.catalog` contains Carp-Deta at 100 грн;
6. settlement reads the stored selected item and includes it in `extras_amount` and `total_amount`.

## Block 5 — CI / browser tests

### Implemented

- Added pinned Python Playwright dependency in `requirements-ci.txt`.
- Added `scripts/e2e_smoke.py` with real Chromium desktop and mobile scenarios.
- Added API mocks for deterministic non-production browser testing.
- Added screenshots and JSON result output on test runs.
- Updated GitHub Actions to:
  1. stamp;
  2. run static/backend checks;
  3. build `dist`;
  4. compile the browser-test source;
  5. install Playwright Chromium with system dependencies;
  6. run desktop/mobile tests;
  7. upload test evidence on failure;
  8. upload/deploy Pages only after the tests pass.
- Updated `npm run check` so removal or misordering of the Playwright deployment gate fails the build.
- Excluded `test-results` and `playwright-report` from the Pages artifact.

### Browser scenarios included

Public booking:

- Carp-Deta appears once and costs 100 грн;
- one prepayment row and one deposit row;
- approved financial copy;
- weekend deposit updates to 2,000 грн for one unit;
- desktop/mobile horizontal overflow;
- mobile CTA tap height.

Admin/PWA:

- all eight desktop sections;
- five mobile primary tabs and the More sheet;
- operations attention panel;
- booking cards from API;
- Carp-Deta in the admin booking modal;
- search/reset behavior;
- return to top after mobile tab change;
- 44 px navigation targets;
- desktop/mobile modal footer usability;
- horizontal overflow.

### Honest local browser status

The Python source compiles, but the current managed execution environment blocks every localhost navigation in Chromium before site code runs:

`net::ERR_BLOCKED_BY_ADMINISTRATOR`

Therefore no local browser assertion is reported as passed. The authoritative browser result must come from the clean `ubuntu-latest` GitHub Actions runner. The workflow blocks Pages deployment if that test fails.

## Verification completed

- `npm run stamp` — passed
- `npm run check` — passed, **237 file checks**
- `npm run build` — passed
- Pages artifact — **192 files**, approximately **4,881 KiB**
- JS syntax checks — passed
- Playwright Python compilation — passed
- backend inventory consistency check — passed
- finance tests — passed
- session tests — passed
- static UX tests — passed
- production RLS policy verification — passed, 9 restrictive policies
- production catalog verification — Carp-Deta / 100 грн confirmed
- production Edge Function status — both new entrypoints ACTIVE

## Not performed

- No customer, booking, document, deposit, payment or inventory row was created or edited.
- No authenticated manager action was performed with the user's password/session.
- GitHub Pages was not deployed from this environment.
- The GitHub-hosted Playwright run is pending upload of this release to `main`.

## Shared Supabase project findings left unchanged

These are outside the VAcleaner release scope and could affect VA HOME:

- `pg_net` extension in `public`;
- `public.is_admin()` SECURITY DEFINER access;
- `public.claim_customer_orders()` SECURITY DEFINER access;
- Supabase Auth leaked-password protection disabled;
- advisor findings on orders, promo, wishlist, reviews and other VA HOME tables.

See `SUPABASE-PRODUCTION-AUDIT-v3.0.11.md` for the detailed boundary.

## Release decision

v3.0.11 is suitable for upload as a **release candidate**. It must not be called final until the new GitHub Actions build shows green browser tests and green Pages deployment, followed by a manual production smoke of login, one non-destructive admin view, and the public booking summary.
