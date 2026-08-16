# VAcleaner v4.0.76 — SMS HISTORY & BOOKING TIME ALIGNMENT FIX

Released: 2026-08-16
Build: 4076

## Fixed

- Fixed `dateTime is not defined` in the SendPulse SMS modal when SMS history contains previous dispatches.
- Added a real date-time formatter for SMS dispatch history and customer SMS history.
- SMS browser QA now uses a non-empty dispatch history so this runtime path is covered.
- On desktop booking form, exact-time chips use a stable grid: evening 17:30–20:00 no longer makes the `Видача` card visually taller than `Повернення`.
- Slot logic remains settings-driven. Current production setting is 08:00–10:00 morning and 17:30–20:00 evening.

## Verification

- `npm run check` — 334/334 PASS.
- `npm run build` — PASS.
- `npm run test:sms-campaigns` — 52/52 PASS.
- `npm run test:pwa-static` — 82/82 PASS.
- Browser QA: SMS modal with non-empty history rendered without runtime error on mobile scenarios before the full suite hit environment timeout.
- Targeted desktop browser QA — 41/41 PASS, including equal `Видача` / `Повернення` card heights with evening pickup and presence of the 20:00 chip.
- Full combined PWA visual suite was not completed in this environment because the long run exceeded the tool execution window; changed paths were verified separately.

## Backend / data

- No Edge Function deployment or schema change in this release.
- Production `booking_slots` was restored to 08:00–10:00 / 17:30–20:00 after an accidental temporary change during debugging.
