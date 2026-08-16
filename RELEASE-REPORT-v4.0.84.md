# VAcleaner v4.0.84 — SHORT DESKTOP SMS RECIPIENT CAPACITY FIX

## Scope
- Fix SMS recipient workspace on short desktop browser viewports (roughly 700–800 px content height).
- Keep SMS business logic/backend unchanged.
- Make recipients the dominant vertical workspace on step 1.

## UX fix
- Compact SMS header, stepper, controls, KPI row, recipient heading, recipient rows and footer only on short desktop viewports.
- Modal uses almost the full available desktop height.
- Target: at least 8 visible recipient rows before internal scrolling at 1650×760.

## QA regression added
- Dedicated 1650×760 browser scenario.
- Measures real recipient-row height + list height and fails below 8-row capacity.
- Requires at least 360 px list height, compact chrome, and no horizontal overflow.

No SendPulse/Supabase/backend changes in this release.
