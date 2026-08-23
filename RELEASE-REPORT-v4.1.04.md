# VAcleaner v4.1.04 / build 4104

## Scope
Live calendar consistency fix for Admin/PWA.

## Root cause
`state.bookings` was refreshed by the 15-second live sync while managers worked in other views, but `state.calendar` was recalculated only when the Calendar view was already open. Switching into Calendar later rendered a stale availability snapshot. This allowed the Calendar to show full availability even while Upcoming already reflected active bookings.

## Fix
- Recalculate cached Calendar data from the current booking set on every successful live booking sync, regardless of the active admin view.
- Recalculate once more immediately before rendering Calendar when the manager switches into it.
- Keep the server Calendar refresh when Calendar is already open.
- Mark elapsed same-day slots as `Минув` and disable them instead of showing `Вільно` after the slot window has ended.
- Added `test:calendar-live` regression coverage for the real 23.08 Puzzi transition pattern.

## Production data verification
For 2026-08-23 production contains two active Puzzi reservations: one issued rental returning in the morning and one confirmed rental beginning in the morning. Both have `vacleaner_booking_resources: puzzі ×1`; physical Puzzi capacity is 2. Under the existing half-day reservation model the current availability is one remaining Puzzi for the active slot, not full availability.

## QA
- `npm run check`: 331 file checks PASS.
- `npm run test:pwa-static`: 82 assertions PASS.
- `npm run test:calendar-live`: 7/7 PASS.
- `npm run test:css-architecture`: PASS.
- `npm run test:desktop-final`: 235/235 PASS on 1024 / 1280 / 1440.
- Focused Calendar browser QA: 8/8 viewports PASS — 320, 390, 430, 768, 1024, 1280, 1650×760, 1920.
- Full `npm run test:pwa`: mobile 320/390/430 and tablet sections passed including Calendar containment; the local run later exceeded the execution window, so this report does not claim the entire suite completed.

## Backend
No Supabase schema, table, policy, storage, auth, or Edge Function change is required for this release. Production booking/resource data was read-only verified. VA HOME was not touched.

## Live status
Frontend v4.1.04 is packaged only; it is not claimed live until deployed and a new GitHub Actions run succeeds.
