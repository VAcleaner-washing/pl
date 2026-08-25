# VAcleaner v4.1.28 — Promo + Campaign Resilience

Build: 4128  
Date: 2026-08-25

## Fixed

1. **Campaign/SMS workspace no longer hangs on an auxiliary API failure.** The initial SendPulse status/history calls are isolated with `Promise.allSettled`, the audience has its own retry state, and only the campaign API gets a bounded UI timeout instead of an endless loader. Core booking/data requests are not given a new timeout.
2. **Admin auth refresh is coordinated across browser/PWA contexts without changing the stable core request pipeline.** Persistent sessions use Web Locks when available so two open admin contexts cannot rotate the same refresh token at the same time; the existing single-runtime `refreshPromise` remains the fallback. Core API requests keep the v4.1.27 no-global-timeout behavior.
3. **Campaign `•••` menu now behaves like a real popover.** It closes after an action, on outside tap/click, on Escape, and when another campaign menu is opened.
4. **Client card now has a dedicated “Бонуси” section.** A phone-bound RETURN/personal promo is shown independently of the SMS endpoint, including its code, discount and current eligibility state.
5. **New bookings created from the admin now auto-pull a promo by customer phone.** The backend validates the campaign, phone ownership, dates/product restrictions, dormancy/active-booking rules and usage limits; the promo then competes with loyalty/manual discount and only the best benefit is applied.
6. **Applied admin promos are redeemed server-side.** If redemption loses a race or the code becomes unavailable, the new booking is rolled back rather than leaving a discounted booking without a valid redemption.
7. **Booking form explains the promo before submit.** After phone lookup it shows the discovered campaign and whether it applies to the currently selected product/dates, and refreshes this state when rental conditions change.

## Root cause confirmed from production

At 2026-08-25 12:25 local time the production logs showed `vacleaner-campaigns-v1` and the customer-document endpoint returning HTTP 401 while the core `vacleaner-admin-bookings-v3` call recovered and returned HTTP 200 a few seconds later. This matched the previously deferred cross-context refresh risk and explained why secondary admin modules could remain stuck while the main booking data still worked.

The RETURN code `VA-6E44F95` for `+380966050739` is active, unused and belongs to the active `RETURN · 180+ днів` campaign. The public booking page was finding it correctly; it was then rejected because the customer already had an active confirmed booking. The admin create flow had never consumed that promo because `vacleaner-admin-bookings-v3` did not previously discover phone-bound promo codes at all.

## Production backend

- `vacleaner-admin-bookings-v3` deployed to Supabase production as **v23** on 2026-08-25.
- `verify_jwt`: **true**.
- Deployment status: **ACTIVE**.
- No database schema or RLS migration was required.

## Safety boundaries

- Existing booking finance is **not retroactively changed** by this release.
- Public promo validation rules remain unchanged.
- No database schema/RLS migration is required.
- Deposit, chemistry, gifts, availability, settlement and public booking logic are otherwise untouched.

## Verification

- Final unpacked ZIP `npm run check`: PASS — 349 file checks
- JavaScript syntax: PASS
- Admin Edge Function TypeScript parse: PASS
- `test:auth-refresh`: PASS — 11 assertions
- `test:v4.1.28-regressions`: PASS — 17 assertions
- `test:sms-campaigns`: PASS
- `test:campaign-sms-ux`: PASS — 332 assertions
- `test:client-promo-regression`: PASS — 12 assertions
- `test:financial-control`: PASS
- `test:stabilization`: PASS — 172 assertions
- `test:client-card-mobile`: PASS — 3/3
- `test:pwa-static`: PASS — 83 assertions
- `npm run build`: PASS — 211 files / 6724 KiB
- Second `npm run stamp`: 0 changed files (idempotent)

- Desktop final visual QA: PASS — 319/319
- Installed-PWA visual QA: mobile 320 completed and mobile 390 progressed through campaign/SMS flow without a FAIL before the local command hit the execution time limit; complete-suite PASS is not claimed.
