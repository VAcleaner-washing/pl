# VAcleaner v4.0.70 — INTERNAL HERO VISUAL SYSTEM FIX

Released: 2026-08-15  
Build: 4070

## Scope

Systemic visual stabilization of public internal-page heroes plus CI hardening for the new optional marketing-consent checkbox. No pricing, finance, inventory, slot, SMS-send or Supabase business logic was intentionally changed in this release.

## Root causes fixed

1. Several newer public pages used three direct children in `.inner-hero` (`eyebrow`, `h1`, supporting copy), while the shared CSS grid expects two cells: a heading wrapper (`eyebrow + h1`) and supporting copy. The H1 was therefore auto-placed into the narrow right column, causing extreme wrapping and clipping.
2. After v4.0.69 added the optional marketing-consent checkbox, the legacy E2E selector `.booking-consent span` matched two elements and failed Playwright strict mode even though the UI itself was valid.
3. One public React asset reference still carried `?v=4069`; the release is now consistently cache-busted as 4070.

## Changes

- Restored the canonical `[heading wrapper + supporting copy]` hero DOM contract on `/pro-nas/`, `/blog/`, `/dostavka/`, `/polityka-konfidenciynosti/` and `/pidbir/`.
- Added one shared desktop hero system for all `.inner-hero` pages: safer columns, bounded heading width/font size and a shorter first-screen height.
- Added compact legal-page treatment for Privacy and Terms, including the 901–1180 px range.
- Replaced the oversized editorial Privacy H1 with the direct title `Політика конфіденційності`.
- Bumped public static asset cache version consistently to `4070`.
- Added `test:public-inner-heroes` and wired it into GitHub Pages CI.
- Fixed `scripts/e2e_smoke.py` so the required legal consent and optional `.vx-marketing-consent` are addressed by separate strict selectors.
- Added an assertion that exactly one required legal consent remains present.

## Verification passed

- `npm run check` — 333 file checks PASS.
- `npm run build` — Pages artifact prepared successfully (214 files).
- `npm run test:public-booking` — PASS.
- `npm run test:public-inner-heroes` — 259/259 PASS across 11 internal pages at 1650, 1280, 1024, 430 and 390 px.
- `npm run test:sms-campaigns` — 21/21 PASS.
- `npm run test:pwa-static` — 82 assertions PASS.
- `npm run test:public-visual-contract` — PASS.
- `npm run test:desktop-final` — 232/232 PASS.
- `npm run test:desktop-density` — 63/63 PASS.
- `npm run test:smart-guide-fit` — 32/32 PASS.

## Environment limitation

The full legacy `npm run test:e2e` cannot be executed end-to-end in this working environment because Chromium navigation to the local HTTP server is blocked by policy with `ERR_BLOCKED_BY_ADMINISTRATOR`. The exact selector that failed in GitHub has nevertheless been corrected in `scripts/e2e_smoke.py`, and all adjacent booking/consent browser QA passes locally.

## Release hygiene

`dist/`, test artifact folders, visual evidence, `__pycache__`, `.pyc` files and OS/editor junk are excluded from the release ZIP.
