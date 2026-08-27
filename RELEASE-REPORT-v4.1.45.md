# VAcleaner v4.1.45 — TRUST & DELIVERY RULES

Release date: 2026-08-26
Build: 4145

## What changed

- Delivery pricing is now tiered and shared across public booking, admin and Edge Functions:
  - Poltava, Rozsoshenzi, Shcherbani and Horbanivka — 250 UAH.
  - Other verified suburbs inside the current service area — 350 UAH.
  - Outside / unverified service-area addresses — price by agreement before prepayment.
- Public booking passes verified-address metadata to the backend and shows the actual delivery tier in the summary.
- Admin create/edit supports automatic 250/350 delivery quotes and an explicit manual delivery override when a quote must be agreed separately.
- Cancellation policy is fixed at 3 days / 72 hours before issue:
  - 72+ hours — paid 200 UAH prepayment is refundable.
  - under 72 hours — paid prepayment is retained.
  - cancellation metadata is stored with the booking and cleared when a cancelled booking is restored.
- Booking / FAQ / Terms / Delivery copy now consistently explains:
  - 200 UAH prepayment is paid only after the application is confirmed and is included in the total price;
  - a new client sends a document privately to the manager, repeat clients do not resend it when data is already stored;
  - the security deposit is paid at pickup and is not an extra rental charge;
  - after return, rental, delivery, extras and used Puzzi chemistry are settled against prepayment + deposit; the remainder is refunded or the client pays the difference;
  - equipment condition is fixed at issue; pre-existing defects are not the client's responsibility;
  - if equipment fails, the client stops use, does not dismantle it and contacts VAcleaner.
- A compact trust block was added before the public booking submit action.

## Production Edge rollout

Confirmed ACTIVE in Supabase project `yweluzclearwrazdkahu`:

- `vacleaner-settings` — v15
- `vacleaner-booking-v5` — v17
- `vacleaner-admin-bookings-v3` — v24
- `vacleaner-status-correction-v1` — v5

No changes were made to the authoritative inventory reservation / availability RPC model.

## Verification

Passed locally after final stamp/build:

- Build check: 374 file checks
- v4.1.45 trust & rules: 16/16
- Delivery settings: 15/15
- Retention / promo rules: 27 checks
- v4.1.44 booking hardening / smart entry: PASS
- v4.1.34 address assist: 15/15
- v4.1.35 suburb address: 8/8
- v4.1.36 entrance delivery: 8/8
- v4.1.41 fulfillment UX: 9/9
- Public SEO audit: 337/337
- Public booking resilience: PASS
- Python browser-test sources compile successfully
- Pages artifact: 218 files, 6812 KiB

The full local `test:e2e` browser run could not start because this execution environment blocks navigation to its own localhost test server (`ERR_BLOCKED_BY_ADMINISTRATOR`). The failure occurs before application content loads; the GitHub Actions workflow still contains the full browser test suite and will run it on the GitHub runner.

## Intentionally unchanged

- rental prices and product inventory capacities;
- RETURN / personal promo rules;
- Campaigns / SMS workflows;
- booking status model;
- authoritative Supabase availability / slot-reservation architecture;
- Smart Entry logic from v4.1.44;
- main visual direction and admin navigation architecture.
