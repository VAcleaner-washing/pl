# VAcleaner v4.0.88 — SMS COMPACT HEADER CI FIX

Released: 2026-08-16
Build: 4088

## Root cause

v4.0.87 moved `Відправник / Пауза / Баланс` into a separate full-width row inside the SMS workspace header. On a 1650×760 short desktop viewport the header grew to ~101.5 px, pushing recipient selection to 212 px from the modal top. The existing visual QA correctly failed its compact-chrome contract.

## What changed

- Kept the existing visual QA thresholds unchanged.
- Desktop SMS header is now one horizontal operator row: campaign title → separated metadata/status items → Journal/Close actions.
- Metadata keeps distinct visual roles instead of returning to one concatenated sentence.
- Mobile keeps its adaptive metadata row; this fix is scoped to desktop/tablet widths.
- No SendPulse, campaign, promo-code, cooldown, booking, Supabase or backend logic changed.

## Verification

- `npm run check`: PASS — 336 file checks.
- `npm run test:sms-campaigns`: PASS — 69/69.
- `npm run test:pwa-static`: PASS — 82 assertions.
- `npm run test:css-architecture`: PASS.
- `npm run build`: PASS.
- Short desktop 1650×760 browser QA: PASS — 15/15 targeted assertions.
  - Recipient capacity: ~10.4 readable rows.
  - Compact top chrome assertion: PASS.
  - Recipient selection starts at 168 px from modal top (required ≤190 px).
  - No horizontal overflow.
- A broader local PWA run passed through the Campaigns/SMS desktop scenarios but exceeded the environment execution timeout later; it is not claimed as a complete full-suite pass.
