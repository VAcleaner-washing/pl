# VAcleaner v4.0.15 — 320PX BOOKING DENSITY CI PARITY FIX

## Scope
Narrow-screen mobile/PWA booking-list density correction after the v4.0.14 GitHub Actions regression. Based only on v4.0.14.

## Root cause
GitHub itself did not crash. The v4.0.14 workflow reached installed-PWA visual QA and stopped with 559 PASS / 1 FAIL: `mobile-320: booking cards stay compact instead of consuming a full phone screen`.

The concrete cause was a separate `@media(max-width:359px)` rule that reverted the new mobile booking action layout from 3 columns back to 2 columns only at 320px-class widths. That extra action row made the narrowest cards much taller. Local Chromium 144 measured the tallest v4.0.14 card at ~623px against a 640px CI limit, leaving only 17px of headroom. GitHub Actions installs Playwright Chrome 149, so the tiny rendering margin was not robust enough.

## Changes
- 320px-class widths keep the compact 3-column secondary action grid instead of reverting to 2 columns.
- Primary operational action remains full-width.
- Narrow-screen booking action tap targets are 44px.
- All booking actions and booking/business logic are unchanged.
- CI density limit remains unchanged at 640px; the test was not weakened to force a PASS.
- PWA QA now logs every booking-card height, maximum height and active density limit for immediate diagnosis on future failures.

## Measured result
- Before fix, local Chromium 144 at 320px: `531 / 577 / 623 / 623px`, max 623px, 17px headroom.
- After fix, local Chromium 144 at 320px: `536 / 586 / 586 / 586px`, max 586px, 54px headroom.
- Full local PWA/browser visual suite: `560/560 PASS`.

## QA
- Static release check: 292 PASS.
- Rental/deposit/slot policy: 46 PASS.
- Stabilization contract: 159 PASS.
- Public visual contract: 144 PASS.
- Retention/campaign rules: 18 PASS.
- Pages artifact build: PASS, 213 files.
- Public booking resilience: PASS.
- Installed-PWA visual QA: 560/560 PASS; 320px max booking card 586px vs unchanged 640px limit.
- Liquid Glass primary UX QA: PASS at 320/390/430 and desktop 1024/1280/1440/1648.
- Desktop density QA: 60/60 PASS.
- Final desktop visual audit: 232/232 PASS.
- CSS architecture: PASS; existing admin !important budget remains 5 declarations.
- Backend inventory: PASS.
- Smart Guide fit: 20/20 PASS.
- Mobile client-card QA: 3/3 PASS.
- Full local `test:e2e`: cannot navigate to the local 127.0.0.1 test server in this environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). Its Python sources compile, and the same GitHub CI e2e suite passed 82/82 in v4.0.14 before the later PWA step failed.

## Validation boundary
GitHub Actions uses Playwright Chrome 149; the available local system browser is Chromium 144. Therefore exact Chrome-149 execution is not claimed locally. The fix creates substantially larger geometric headroom while preserving the same CI threshold. GitHub Actions remains the final Chrome-149 gate.

## Production
Local release only. Production is not considered updated until GitHub Pages deploy succeeds and `https://vacleaner.pp.ua/release.json` reports `4.0.15`.
