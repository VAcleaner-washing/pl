# VAcleaner v3.0.52 — PUBLIC MOBILE CTA GEOMETRY

Date: 2026-08-08
Base: VAcleaner v3.0.51 — IOS ROOT VIEWPORT + CLEAN MOBILE UX

## Fixed

- Fixed the global mobile sticky CTA (`Забронювати онлайн` + `Instagram`) overlapping on public pages.
- Root cause: the correct two-column `.mobile-booking` grid lived in `assets/public-fixes.css`, but that stylesheet is loaded only by `/bronuvannia/`. Regular public pages therefore fell back to the old compiled rule (`display:block`) while child links were `inline-flex`.
- Moved the stable CTA layout contract into `assets/public-experience.css`, which is loaded by all public pages.
- Removed the duplicated generic `.mobile-booking` geometry from booking-only `assets/public-fixes.css`.
- Added bottom content clearance so the fixed CTA does not cover the end of public pages.
- Booking page still hides the generic CTA and keeps its dedicated mobile booking summary.

## Regression coverage

Browser E2E now verifies the CTA on:
- `/`
- `/rishennia/`
- `/komplekty/`
- `/yak-tse-pratsiuie/`
- `/vidhuky/`
- `/faq/`
- `/kontakty/`
- `/umovy/`

The check requires exactly one visible CTA, exactly two links, CSS grid layout, no link overlap, no link escape outside the container, and no horizontal overflow.

## Local verification

- `npm run check`: PASS — 288 file checks.
- CSS architecture: PASS.
- Operational health: PASS.
- Stabilization: PASS — 147 assertions.
- Rental/deposit policy: PASS — 46 assertions.
- Retention/campaign rules: PASS — 15 checks.
- Finance: PASS — 19 scenarios.
- Session: PASS — 4 scenarios.
- Direct computed geometry in Chromium at 320×700, 390×844 and 440×956: PASS, 0 px overlap, 0 px horizontal overflow.
- Full local network E2E cannot run in this environment because navigation to `127.0.0.1` is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; GitHub Actions remains the deployment browser gate.

## Backend

No Supabase tables, policies or Edge Functions changed in this release.
VA HOME was not modified.
