# VAcleaner v4.0.14 — MOBILE BOOKING LIST DENSITY FIX

## Scope
Mobile/PWA booking-list density correction. Based only on v4.0.13.

## Root cause
The admin shell itself was not scrolling into blank space: `html/body/.app` remained locked and `.main` was the single scroll owner. The real problem was card inflation on `<=900px`: every booking expanded period, client, fulfillment, full finance copy, extras, full comment and every action into stacked full-width rows. At 390px one card measured roughly 800–870px, so four active bookings produced about 3.8k px of list scroll.

## Changes
- Mobile booking cards use a compact 2-column information grid where it remains readable.
- Period and finance stay full-width; client and fulfillment share one row.
- Long fulfillment address is kept in booking details instead of inflating the list card.
- Full finance explanatory copy is kept in details; amount, balance and deposit state remain visible in the list.
- Full extras/comment rows collapse to compact `Додатково` / `Коментар` indicators; the full values remain available in booking detail.
- All operational actions remain available in the list, but secondary actions use a compact 3-column button grid (2 columns at 320px-class widths).
- No change to desktop booking-card layout or booking/business logic.
- Added regression checks for mobile booking-card height, total active-list density and compact verbose-data indicators.

## Measured result
- 390px: booking cards reduced from about 800–870px to about 515–577px.
- 430px: cards are about 515–561px.
- 320px: cards remain within the dedicated narrow-screen density limit.
- Four-card mobile test list reduced from about 3.8k px to about 2.6k px at 390px.

## QA
- Static build contract: 291 PASS.
- Rental / deposit / slot policy: 46 PASS.
- Finance: 23 PASS.
- Stabilization: 159 PASS.
- Session/auth contract: 4 PASS.
- Rental extension: 10 PASS.
- Public booking +1 day/default-date contract: 9 PASS.
- Public booking step order: PASS (`1 → 2 → 3 → 4`, no default pickup).
- Header parity: 51/51 PASS.
- CSS architecture: PASS; existing admin `!important` budget unchanged.
- Backend inventory: PASS.
- Retention/campaign rules: 18 PASS.
- Public visual contract: 144 PASS.
- PWA static contract: 71 PASS.
- Full PWA/browser visual QA: 560/560 PASS, including 9 new mobile booking-density assertions at 320/390/430.
- Mobile client card QA: 3/3 PASS.
- Smart Guide fit: 20/20 PASS.
- Liquid Glass primary UX QA: PASS at 320/390/430 and desktop 1024/1280/1440/1648.
- Desktop density QA: 60/60 PASS.
- Final desktop visual audit: 232/232 PASS on retry at 1024/1280/1440.
- Public booking resilience: PASS; unavailable 409 remains on-page, nearest suggestion does not mutate React-owned availability state.
- Full local `test:e2e`: not executable in this environment because navigation to the local `127.0.0.1` server is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`. No product code was changed to bypass the environment restriction.
- Pages build: PASS; 213 files prepared for artifact.

## Validation boundary
The fix is validated locally/browser-emulated. The user’s real iPhone/PWA remains the source of truth for final mobile feel after deployment.

## Production
Local release only. Production is not considered updated until GitHub Pages deploy succeeds and `https://vacleaner.pp.ua/release.json` reports `4.0.14`.
