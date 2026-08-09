# VAcleaner v3.0.87 — RENTAL EXTENSION FLOW

## Changes
- Added «Продовжити оренду» directly after «Розрахунок» for bookings in status «Видано».
- Extension uses a dedicated premium modal with new return date, window and exact return time.
- The modal previews new rental amount, added rental charge and expected final balance.
- Actual received security deposit is preserved exactly; extension never recalculates or overwrites `deposit_amount`.
- Status remains `issued` after extension.
- Atomic inventory availability check runs before the extended period is saved.
- If another booking occupies the requested extended period, the manager gets a clear inventory-conflict message and nothing is changed.
- Extension history is stored in booking extras and tagged in booking audit.
- Generic «Редагувати» is no longer shown for issued/completed/cancelled bookings, preventing the old `invalid_transition` path.
- Dedicated production Edge Function: `vacleaner-extend-rental-v1`, version 1, JWT required.

## QA
- `npm run check`: PASS — 293 file checks.
- backend inventory contract: PASS.
- rental/deposit/slot policy: PASS — 46 assertions.
- finance scenarios: PASS — 23 scenarios.
- stabilization contract: PASS — 159 assertions.
- rental extension contract: PASS — 10 assertions.
- PWA visual QA: PASS — 551/551.
- Glass primary QA: PASS at 320 / 390 / 430 px.
