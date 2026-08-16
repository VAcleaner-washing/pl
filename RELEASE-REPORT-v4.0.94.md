# VAcleaner Release Report — v4.0.94 / build 4094

## Scope
SMS Journal desktop information architecture refinement after user review of v4.0.93.

## Root cause
The journal still rendered each dispatch as a wide card with date/time and audience count merged into one small metadata line. This wasted desktop width and made the log harder to scan. The internal scroll area also retained native scrollbar button chrome and could visually clip the last row near the bottom edge.

## What changed
- Desktop journal now follows a log/table rhythm: Campaign | Date & time | Recipients | Status | Action.
- Date/time and recipient count are separate fields instead of one small line under the campaign name.
- Desktop typography: campaign 15 px, date/time 12 px, recipients 12.5 px.
- Table headings align with row values; checked within ~1 px at 1024 and 1650 widths.
- 768 px and below keep a compact card layout instead of squeezing the desktop columns.
- Journal scrollbar is thin, has no native arrow buttons, and preserves bottom padding so the final row is fully visible.
- Fixed the awkward “1 номерів” presentation by using a dedicated Recipients column with numeric values.
- No SMS transport, promo, cooldown, consent, booking, slot, or backend logic changes.

## Verification
- `npm run check` — PASS after release cleanup.
- `node scripts/test-sms-campaigns.mjs` — PASS, including new journal table regression checks.
- `node scripts/test-pwa.mjs` — PASS.
- `node scripts/test-final-desktop.mjs` — PASS.
- Targeted browser matrix with 7 history records: 320, 390, 430, 768, 1024, 1280, 1650×760, 1920.
- No horizontal overflow in the targeted matrix.
- Last journal row remains fully visible at the bottom of the scroll area in every targeted viewport.
- Desktop column heading/value alignment checked at 1024 and 1650: max ~1 px difference.

## Backend integrity
`vacleaner-sms-v2` and `vacleaner-campaigns-v1` are byte-for-byte unchanged from v4.0.93.

## Release hygiene
ZIP excludes QA screenshots, test-results, dist, __pycache__, .pyc and temporary artifacts.
