# VAcleaner v4.0.68 — STABILIZATION & QA HARDENING

Release date: 2026-08-15
Build: 4068
Base: VAcleaner v4.0.67 — EXPENSE DATE & UAH FIELD FIX

## What changed

- Kept booking slots admin-controlled. Current fallback remains 08:00–10:00 and 17:30–20:00; live `vacleaner_settings.booking_slots` remains the runtime authority.
- Regenerated all shared VAcleaner backend fallback configs from `config/vacleaner.json` for v4.0.68 so the local release no longer carries stale generated release metadata.
- Fixed Admin PWA notification icon parity: service-worker cache, push notifications and local notifications now use `/admin/icon-192.png`, `/admin/icon-512.png` and `/admin/apple-touch-icon.png` instead of public-site icons.
- Preserved the Admin PWA as a fixed-scale operational interface: `maximum-scale=1,user-scalable=no` is kept and standalone multi-touch pinch zoom remains blocked.
- Added a real PWA static regression command and CI gate for Admin icon isolation and fixed-scale PWA behavior.
- Added CI regression gates for financial control, operational health, analytics formulas, Smart Guide logic, public booking +1-day return default, Smart Guide fit and mobile client-card containment.
- Added npm scripts for the previously orphaned regression tests.
- Removed `scripts/__pycache__` / `.pyc` release artifacts.
- Preserved existing public copy, booking finance logic, delivery settings, promo/loyalty rules, reservation authority and redirects.

## Intentionally not changed

- Admin-configured slot workflow and current 08:00–10:00 / 17:30–20:00 values.
- Existing redirect setup for legacy public URLs.
- Admin identity/auth separation work (deferred by request).
- Existing `start_at` / `end_at` timestamp semantics. Availability and rental pricing use canonical date + morning/evening fields; changing timestamp semantics safely requires a dedicated migration and is not part of this stabilization release.

## QA actually run

- `npm run stamp` — run repeatedly after changes.
- `npm run check` — PASS, 326 file checks.
- `npm run test:copy-integrity` — PASS.
- `npm run test:package-language` — PASS.
- `npm run test:delivery-settings` — PASS, 14 checks.
- `npm run test:public-seo` — PASS.
- `npm run check:backend` — PASS.
- `npm run test:deposit-policy` — PASS.
- `npm run test:stabilization` — PASS.
- `npm run test:public-visual-contract` — PASS.
- `npm run test:retention` — PASS.
- `npm run test:booking-cta` — PASS.
- `npm run test:process-metadata` — PASS.
- `npm run test:peer-admin-push` — PASS.
- `npm run test:issue-workflow` — PASS.
- `npm run test:financial-control` — PASS.
- `npm run test:operational-health` — PASS.
- `npm run test:analytics` — PASS.
- `npm run test:smart-guide-logic` — PASS.
- `npm run test:booking-date-default` — PASS, 9 assertions.
- `npm run test:pwa-static` — PASS, 82 assertions.
- `npm run test:css-architecture` — PASS.
- `npm run test:smart-guide-fit` — PASS, 32/32.
- `npm run test:client-card-mobile` — PASS, 3/3 at 320/390/430 px.
- `python scripts/pwa_visual_qa.py` — PASS, 653/653.
- `python scripts/public_booking_resilience_qa.py` — PASS.

## QA limitation

- Full `e2e_smoke.py` could not navigate to the local test origin in this execution environment because Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` for `127.0.0.1`. This is an environment policy failure before page execution, not a VAcleaner assertion failure. The source remains in GitHub Actions, where the same browser suite is expected to run on deployment.

## Production/backend note

- Production database settings were read-only checked during the audit; current booking slots are 08:00–10:00 and 17:30–20:00.
- This ZIP does not modify the live Supabase project. Edge Function source in the release is prepared with the v4.0.68 generated fallback config for the next controlled backend deploy.

## Release hygiene

- Exactly one release report is included.
- `dist`, test evidence directories, `__pycache__`, `.pyc` and old ZIP files are excluded from the source release ZIP.
- SHA256 is reported alongside the final archive after packaging.
