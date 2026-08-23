# VAcleaner v4.1.23 — Stable 4.1.19 rollback

Release date: 2026-08-23  
Build: 4123

## Purpose

Emergency rollback after the admin data-loading regressions observed after v4.1.19. The user identified v4.1.19 as the last known stable release on both desktop and PWA.

## Code policy

v4.1.23 is based directly on the archived v4.1.19 release. No functional changes from v4.1.20, v4.1.21, or v4.1.22 were carried over.

Only release metadata/cache-busting identifiers were changed from v4.1.19 to v4.1.23 / build 4123 so browsers and the admin service worker treat the rollback as a new deploy.

A normalized tree comparison was run after stamping: after replacing `4.1.23 -> 4.1.19` and `4123 -> 4119`, all functional files matched the v4.1.19 baseline (`DIFF_COUNT=0`), excluding package/release metadata and this report.

## Explicitly removed by rollback

The session/recovery changes introduced after v4.1.19 are not present, including later timeout, resume/focus recovery, pre-refresh and data-loaded state changes.

No Supabase Edge Function or database change was deployed for this rollback.

## Verification

- `npm run check` — PASS, 340 file checks.
- `node scripts/test-session.mjs` — PASS, 4 scenarios.
- `npm run test:pwa-static` — PASS, 82 assertions.
- `npm run test:deposit-policy` — PASS, 50 assertions.
- `npm run test:booking-gifts` — PASS, 21 checks.
- `npm run test:public-booking` — PASS.
- `npm run test:desktop-final` — PASS, 319 checks on 1650 / 1440 / 1280 / 1024.
- `npm run build` — PASS, Pages artifact prepared successfully.

## Deployment note

Because build changed to 4123, `/admin/sw.js` uses a new `vacleaner-manager-4123` cache and versioned admin assets. This is intentional so the rollback supersedes cached 4120–4122 files.
