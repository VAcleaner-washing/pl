# VAcleaner v4.0.16 — PUBLIC BOOKING CTA STATE STABILITY FIX

## Fixed

- Mobile public booking CTA no longer jumps back to **«Обрати дату»** when step 3/4 data triggers an estimate refresh.
- Availability `checking` state is now reset only when the **core rental period** changes: equipment, pickup date, return date, pickup window, or return window.
- Delivery/pickup selection, delivery address, stories checkbox, extras, phone and promo code may refresh the estimate without changing the already-unlocked booking step.
- Changed hydrated booking chunk received a new cache-busting filename for v4.0.16.

## Regression coverage

`e2e_smoke.py` now walks the mobile public booking CTA through all four steps and explicitly checks CTA stability after:

- equipment selection;
- date availability;
- delivery selection;
- delivery address entry;
- stories checkbox;
- extra item checkbox;
- phone entry;
- promo code entry;
- privacy consent / final submit state.

The existing step-order guard remains in place: `1 → 2 → 3 → 4`, with no default pickup and no skipping locked steps.

## Scope

No rental pricing, deposit, chemistry billing, Supabase schema/RLS/Auth, admin finance, VA HOME data, or desktop admin layout was changed.

## Local verification

- `npm run check` — PASS.
- `npm run test:booking-cta` — 14/14 PASS.
- `scripts/test-public-booking-step-order.py` — PASS.
- rental/deposit policy — 46 assertions PASS.
- stabilization — 159 assertions PASS.
- public visual contract — 144 PASS.
- public booking resilience — PASS.
- full `test:e2e` cannot be executed locally in this environment because Chromium navigation to the local test origin is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; the GitHub workflow now contains the full real-browser CTA sequence and must be the final CI confirmation.
