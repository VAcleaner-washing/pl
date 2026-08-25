# VAcleaner v4.1.29 — SMS-GATED PROMO ISSUANCE

Release date: 2026-08-25  
Build: 4129

## What changed

### RETURN and PERSONAL promos are issued only through real SMS delivery flow

- Creating a RETURN campaign no longer pre-assigns active promo codes to the whole eligible audience.
- RETURN codes are created only for recipients actually selected for `sms_send`.
- A new recipient-bound code is persisted as `active=false` before the provider call.
- The code becomes active only after SendPulse accepts the SMS for that recipient.
- Failed / not-delivered recipient states deactivate the corresponding code again.
- PERSONAL follows the same issuance rule, but remains hard-bound to the one customer phone selected when the campaign was created.
- Booking, client card and public phone lookup continue to use `vacleaner_promo_codes.active` as the single source of truth for whether a recipient-bound bonus is usable.

### Other campaign types were audited

- WEEKDAY is a public promo campaign and no longer inherits the RETURN requirement of one completed rental (`min_completed_orders=0`).
- PRODUCT is a public product-scoped promo and also uses `min_completed_orders=0`.
- PERSONAL requires a known VAcleaner customer/booking phone and its SMS audience can include that target even when they have zero completed rentals.
- QUIZ remains a Smart Guide trigger campaign. Its SMS/navigation path points to `/pidbir/` rather than distributing a direct promo link that bypasses the quiz.

### Campaign/SMS responsibilities were separated

- `vacleaner-sms-v2` is the authoritative SendPulse sending/sync implementation and owns recipient-bound promo activation/deactivation.
- `vacleaner-campaigns-v1` remains the campaign audience/history/status API.
- Legacy cached clients calling `sms_preflight`, `sms_send` or `sms_sync` through `vacleaner-campaigns-v1` are transparently proxied to `vacleaner-sms-v2`.

## Production cleanup

The existing RETURN campaign had 209 recipient-bound codes, of which 184 were active despite having no qualifying SMS issuance and no redemption. Those 184 silent bonuses were deactivated.

Post-cleanup production state:

- RETURN codes: 25 active / 184 inactive.
- Active RETURN codes correspond to recipients with accepted/sent SMS history.
- Example `VA-F738CEF` (customer had no RETURN SMS) is inactive.
- Previously redeemed `VA-6E44F95` remains recorded as redeemed and was not invalidated.

## RETURN validity

`180+ днів` is the eligibility threshold (how long the customer has not rented), not the promo lifetime.

The currently active RETURN campaign was created for 21 days:

- Starts: 2026-08-16
- Ends: 2026-09-06
- Its recipient codes expire at the campaign `ends_at` value.

New campaigns use the admin field `Діє, днів`; the UI default is 14 days. Under the current model, a code issued later in the campaign still expires at the campaign end, so its remaining lifetime can be shorter than the original campaign duration.

## Production Edge Functions after release work

- `vacleaner-admin-bookings-v3`: v23 ACTIVE (`verify_jwt=true`)
- `vacleaner-admin-data-v1`: v12 ACTIVE (`verify_jwt=true`)
- `vacleaner-campaigns-v1`: v16 ACTIVE (`verify_jwt=true`)
- `vacleaner-sms-v2`: v2 ACTIVE (`verify_jwt=true`)
- `vacleaner-phone-promo-v1`: v1 ACTIVE (public phone-promo bridge)
- `vacleaner-booking-v5`: v16 ACTIVE (public booking API)

## Regression coverage

Passed before final packaging:

- build/check: 350/350
- auth refresh: 11/11
- deposit policy: 66/66
- retention: 27/27
- SMS campaigns: 82/82
- v4.1.28 regressions: 17/17
- v4.1.29 campaign issuance: 19/19
- client promo regression: 12/12
- PWA static contract: 83/83
- campaign/SMS UX: 332/332
- mobile client card: 3/3
- desktop final visual QA: 319/319
- Pages build: PASS (211 files)
