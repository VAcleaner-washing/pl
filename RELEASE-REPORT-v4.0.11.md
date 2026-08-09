# VAcleaner v4.0.11 — MOBILE CLIENT CARD DOCUMENT & HISTORY FIX

Base: VAcleaner v4.0.10 — BOOKING STEP ORDER GUARD.
Date: 2026-08-09.

## Fixed

- Mobile client-card private-document badge no longer uses absolute positioning inside the preview. It now stays in normal flow and cannot cover the filename/metadata when image preview is unavailable.
- Unsupported/hidden document preview collapses cleanly instead of preserving an unnecessary tall empty preview shell.
- “Відкрити фото” is a full-width 48 px mobile action with proper alignment, spacing and external-action cue.
- Rental-history status pills are no longer affected by the global mobile `.status { max-width:44%; overflow:hidden }` rule. “Видано”, “Повернено” and other statuses render at their natural width without clipping.
- The price/status row in mobile rental history keeps a stable two-column layout without horizontal overflow.
- The fix was integrated into the existing primary `max-width:900px` mobile contract instead of adding a second mobile override layer.

## QA

- Build check: 294 file checks PASS.
- Pages artifact build: 217 files PASS.
- Dedicated mobile client-card browser regression: 320 / 390 / 430 — 3/3 PASS.
- Deposit / rental / slots: 46 assertions PASS.
- Finance: 23 scenarios PASS.
- Stabilization: 159 assertions PASS.
- Retention / campaigns: 18 checks PASS.
- Session: 4 scenarios PASS.
- Rental extension: 10 assertions PASS.
- Header parity: 51/51 PASS.
- Public visual contract: 144 PASS.
- Smart Guide fit: 20/20 PASS.
- Public booking resilience: PASS.
- CSS architecture: PASS.
- PWA static contract: 71 assertions PASS.
- Glass V4 browser QA: mobile 320/390/430 + desktop 1024/1280/1440 PASS.
- Desktop density guard: PASS.
- Final desktop visual guard: PASS.

The long PWA visual runner was also started and reported no failures through completed 320/390 checks and the portion of 430 reached before the execution time limit; it did not finish the entire suite in that run, so it is not reported as a full PWA visual PASS.

## Production status

Local release only. Production must not be considered updated until `https://vacleaner.pp.ua/release.json` reports `4.0.11` after deployment.
