# VAcleaner v4.1.25 — Stable auth + config-driven deposits

Build: **4125**  
Date: **2026-08-23**

## Base

This release is built from **v4.1.24**, which itself is the confirmed stable v4.1.19 runtime plus the minimal admin auth single-flight refresh fix.

No timeout/resume/recovery/data-loading changes from v4.1.21 or v4.1.22 are included.

## Restored from v4.1.20

- Public deposit calculation no longer keeps a second hardcoded `twoUnits` product list.
- `assets/public-booking-slots.js` resolves the deposit group via `VACLEANER_CORE.depositGroup(code)`.
- `assets/public-experience.js` resolves the deposit group via the config-backed core as well.
- `config/vacleaner.json` is the source of truth for each product's `depositGroup`.
- `combo` canonical `label` and `shortLabel` are now **«Дивани + кухня та ванна»**.
- Legacy **«Текстиль + кухня та ванна»** remains only in aliases for backward compatibility.
- `sync-static-copy.mjs` can no longer regenerate the retired combo title from legacy `Комбо` hydration/RSC fragments.
- Regression tests were strengthened around config-driven deposits and canonical combo naming.

## Preserved from v4.1.24

- Admin refresh-token single-flight: simultaneous 401 responses share one refresh request.
- Admin/PWA runtime and loading pipeline are otherwise unchanged from the stable v4.1.19 baseline.
- `admin-v250.js`, `admin/sw.js`, and admin booking HTML match v4.1.24 after build-number normalization.

## Verification

- `npm run test:auth-refresh` — **9/9 PASS**
- `npm run test:deposit-policy` — **62 assertions PASS**
- `npm run test:admin-labels` — **36/36 PASS**
- `npm run test:package-language` — **PASS**
- `npm run test:copy-integrity` — **PASS**
- `npm run test:delivery-settings` — **14/14 PASS**
- `npm run test:booking-extras` — **11/11 PASS**
- `npm run test:booking-gifts` — **21/21 PASS**
- `npm run test:pwa-static` — **82/82 PASS**
- `npm run check` — **341/341 PASS on the clean release package**
- `npm run build` — **PASS**
- `npm run test:public-booking` — **PASS**
- `npm run test:public-visual-contract` — **206/206 PASS**
- `npm run test:growth-visual` — **135/135 PASS**
- `npm run test:desktop-final` — **319/319 PASS**

## Deployment note

No Supabase Edge Function deployment is required for these config/public-runtime changes. Generated local Supabase config fallbacks are synchronized by the stamp step.
