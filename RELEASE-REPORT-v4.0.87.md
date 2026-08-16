# VAcleaner v4.0.87 — CAMPAIGNS UX & SMS HIERARCHY REDESIGN

Released: 2026-08-16
Build: 4087

## What changed

- Rebuilt the Campaigns workspace hierarchy instead of adding another styling patch.
- Replaced the heavy four-card summary with one compact KPI strip.
- Campaign rows now separate type/status, campaign identity, performance and actions.
- Kept SMS and Codes as direct actions; Pause/Enable, Archive and Delete moved into a native overflow menu.
- Zero-value performance metrics are visually quiet instead of competing with useful data.
- Replaced English `Retention / Campaigns` UI copy with Ukrainian campaign language.
- Reworked SMS workspace typography: sender, moderation state, cooldown and balance are separate metadata roles instead of one bold sentence.
- Reworked fixed campaign audience copy so `Аудиторія` is a label and the dormant threshold is the value.
- Reduced excessive bold weight across stepper, route choices, section headings, review cards and alerts.
- Mobile Campaigns cards now stack identity, metrics and actions without clipped desktop columns.
- Mobile SMS metadata remains compact but self-explanatory.

## Functional scope

Frontend/admin UX only. No Supabase schema, Edge Function, SendPulse transport, promo, booking, cooldown or pricing logic was changed.

## Verification

- `npm run check`: PASS — 336 file checks.
- `npm run test:css-architecture`: PASS — specificity / !important budget unchanged.
- `npm run test:sms-campaigns`: PASS — 69/69.
- `npm run test:pwa-static`: PASS — 82 assertions.
- `npm run build`: PASS — Pages artifact generated successfully before release cleanup.
- Targeted browser QA:
  - 320 px: Campaigns no overflow; SMS no overflow; recipient capacity 6.04 rows.
  - 390 px: Campaigns no overflow; SMS no overflow; recipient capacity 6.62 rows.
  - 430 px: Campaigns no overflow; SMS no overflow; recipient capacity 6.62 rows.
  - 1650×760 desktop: Campaigns no overflow; secondary action menu opens correctly.
- Broader PWA browser suite was also run through the Campaigns/SMS scenarios on 320/390/430 and desktop; those relevant scenarios passed. The full suite was not claimed as complete because the environment run hit its execution timeout later in unrelated scenarios.
