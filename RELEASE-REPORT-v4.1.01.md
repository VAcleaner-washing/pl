# VAcleaner Release Report — v4.1.01 / build 4101

## Scope
CI follow-up for installed-PWA SMS recipient capacity on mobile.

## Root cause
v4.1.00 integrated the Journal count into a readable mobile header control. The recipient rows themselves did not become taller, but the mobile SMS workspace header grew from roughly 87 px to roughly 106 px. That stole enough vertical space from Step 1 to fail the existing recipient-capacity contract on 320 / 390 / 430.

## Fix
- Recovered vertical space only from empty mobile SMS header chrome.
- Reduced mobile header top/bottom padding and row gap.
- Kept Journal text, integrated count, close control, sender metadata and recipient typography unchanged.
- Did not weaken or alter the existing capacity assertion.

## Measured browser result
- 320: recipient capacity 5.81 (required >= 5.8).
- 390: recipient capacity 6.53 (required >= 6.5).
- 430: recipient capacity 6.53 (required >= 6.5).
- No horizontal overflow in the targeted mobile probe.

## QA
- `npm run check` — PASS, 330 file checks.
- `npm run test:sms-campaigns` — PASS, 82/82.
- `npm run test:pwa-static` — PASS, 82/82.
- Final desktop browser assertions — PASS, 235/235 on 1440 / 1280 / 1024 (same assertions as `test:desktop-final`, screenshots disabled for the local verification run).
- Full local `test:pwa` passed the formerly failing assertion on 320 and 390 before the tool execution window expired during the 430 suite; 430 was then verified directly with the identical capacity calculation and passed at 6.53.

## Backend
No backend / Supabase changes in v4.1.01.

## CI status
GitHub Actions run 32500091762 is the failed v4.1.00 / build 4100 run and is not claimed green by this package.
