# VAcleaner v4.1.49.2 — CI PROMO DISCLOSURE HOTFIX

## Scope
- Fixes the only remaining failing GitHub Browser QA suite from run `33001844398`.
- Updates the mobile booking E2E to follow the real collapsed promo disclosure introduced in v4.1.44.
- The test now opens **«Є промокод?»** before filling `RETURN10`, instead of attempting to fill a deliberately hidden input.
- Adds a regression assertion so future CI changes cannot restore the hidden-input interaction.

## Not changed
- Public booking business logic.
- Promo/RETURN validation logic.
- Supabase functions or database.
- Delivery pricing, deposits, availability, SMS/Campaigns, admin UX, PWA behavior.

## GitHub evidence
Run `33001844398` had all browser suites green except `e2e`. The failing locator was `#booking-contact .booking-promo-field input`; it existed but was intentionally hidden behind `.vx-promo-toggle`. PWA, Glass, density, public booking, Smart Guide and final desktop suites all passed.
