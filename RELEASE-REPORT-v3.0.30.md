# VAcleaner v3.0.30 — RETENTION / PROMO + PUBLIC BOOKING CRASH REPAIR

Date: 2026-08-07  
Build: 3030

## Release scope

v3.0.30 is built directly on v3.0.29. It contains two coordinated changes:

1. a root-cause repair for the public booking page crash that appeared when selected equipment was unavailable;
2. the first VAcleaner Retention / Campaigns layer with a 180-day dormant-customer rule and promo codes.

No VA HOME table, policy, function or business rule was changed.

## 1. Public booking crash — actual root cause

The previous stale-root-service-worker hypothesis did not fully explain the failure. A new diagnostic found a DOM mutation feedback loop between the public booking enhancers in `assets/public-booking-slots.js` and `assets/public-experience.js`.

The broad MutationObservers reacted to DOM that their own deposit/date/slot enhancers then replaced or rewrote. In the failing diagnostic the page produced about 132,610 DOM mutations in three seconds. When availability changed to an unavailable state and the nearest compatible window was rendered, the extra mutation pressure could crash the Chrome renderer and produce the browser-level `This page couldn't load` screen.

The public enhancers are now idempotent:

- deposit rows are created once and only changed when their value actually differs;
- enhanced date controls only update changed values;
- slot controls use stable signatures and rebuild only when options/selection truly changed;
- unavailable-state rendering no longer creates a self-sustaining observer loop.

Permanent regression QA now deliberately returns HTTP 409 `not_available` and asserts:

- the page stays on the same `/bronuvannia/` URL;
- the unavailable state is rendered in place;
- the nearest compatible full rental window is shown;
- there is an explicit action to apply that window;
- there is no browser `pageerror`;
- DOM mutations reach a stable plateau. Final QA result: `19 -> 19` after settling.

The hydrated public React chunk also now reads the JSON body from Supabase `FunctionsHttpError` for a 409 response, so a race-time `not_available` response retains its nearest-window payload instead of collapsing into a generic error.

## 2. Sleeping-customer threshold

The VAcleaner sleeping-customer definition is now **180+ days** (approximately half a year), not 60/90 days.

The same centralized threshold is used by:

- Clients → `Сплячі 180+ днів`;
- Analytics sleeping-customer KPI/shortlist;
- RETURN campaign audience selection.

A customer is eligible for RETURN only when their **actual latest completed rental** is at least 180 days old and there is no current waiting-payment / confirmed / issued booking. An older historical rental can no longer incorrectly qualify a customer who rented recently.

## 3. Retention / Campaigns

This release intentionally does not add classic CRM calls/tasks/follow-up bureaucracy. It adds a focused retention layer for future repeat sales.

Supported campaign types:

- `RETURN` — dormant customers; default eligibility is 180+ days;
- `WEEKDAY` — promotion restricted to paid rental days Monday–Thursday;
- `PRODUCT` — promotion restricted to a selected product/kit;
- `PERSONAL` — individual offer tied to one normalized customer phone.

`WELCOME` was intentionally not added.

RETURN campaigns generate personal codes tied to the customer's normalized phone. The campaign manager can create/pause/reactivate campaigns and inspect issued codes, uses, conversion (where a recipient denominator exists), campaign revenue and discount amount.

Mass marketing sending is **not** implemented in this release. v3.0.30 prepares segmentation, codes, redemption and measurement; actual campaign distribution can be added later.

## 4. Promo business rules

Promo codes discount **rental base only**. They never discount delivery, chemistry or other extras.

Existing automatic loyalty remains unchanged:

- Start: 0%;
- Regular: 5% after 3 completed rentals;
- VIP: 10% after 6 completed rentals.

Loyalty and promo never stack. The system calculates both and applies only the larger rental-base discount. If both discounts are equal, loyalty wins and the promo is not consumed.

Explicit manual manager discount remains an intentional override.

Promo redemption is serialized in PostgreSQL by `vacleaner_redeem_promo` using a transaction advisory lock. Code expiry, campaign state, customer binding and usage limits are rechecked at redemption time.

A booking-level database guard `vacleaner_preserve_best_promo_discount_trg` prevents an ordinary admin edit from silently erasing an already-applied promo when that promo is still better than loyalty. The guard does not override an explicit manual manager discount.

## 5. Production database changes

Production now contains three additional isolated VAcleaner tables:

- `vacleaner_campaigns`;
- `vacleaner_promo_codes`;
- `vacleaner_promo_redemptions`.

Current production security verification:

- 12 total `vacleaner_*` tables;
- RLS enabled on all 12;
- one explicit client-deny policy per table;
- direct table grants to `anon`: 0;
- direct table grants to `authenticated`: 0.

Relevant production database functions now include:

- `vacleaner_apply_reservation`;
- `vacleaner_confirm_booking`;
- `vacleaner_log_booking_change`;
- `vacleaner_operational_health`;
- `vacleaner_redeem_promo`;
- `vacleaner_preserve_best_promo_discount`;
- `vacleaner_slot_index`.

Booking triggers include the existing audit trigger and the new promo-preservation trigger.

## 6. Production Edge Functions

Verified active after deployment:

- `vacleaner-booking-v5` — **v7 ACTIVE**, `verify_jwt=false`, SHA256 `fd198547f4d62a322ddc828dab01fabe39eea2d0294de4825df33f6a28535342`;
- `vacleaner-admin-data-v1` — **v4 ACTIVE**, `verify_jwt=true`, SHA256 `1c325f439c20bfbaa30312cb272e09a38b74739ddf6aeee0119748004d767856`;
- `vacleaner-admin-bookings-v3` remains **v13 ACTIVE**, `verify_jwt=true`, SHA256 `b3013c45f4989571b024dad6d7cf9e87a84e8684190fa1b554a2de089c050825`.

`vacleaner-admin-bookings-v3` was deliberately not replaced for this release; promo preservation is enforced centrally by the database trigger while the existing authoritative financial/booking backend remains pinned.

Legacy VAcleaner Edge Functions remain deployed. No legacy function was deleted without production-usage proof.

## 7. CSS architecture remains clean

The v3.0.29 CSS consolidation is preserved:

- `assets/admin-v250.css`: **1 `!important` declaration**;
- CI admin budget: maximum 5;
- authored public override budgets remain frozen so the old public CSS debt cannot silently grow.

The campaign UI was added without starting a new mobile override layer. Its narrow-screen rules were merged into the existing authoritative mobile contract.

## 8. Final regression results after v3.0.30 stamp

Final stamped build: `3.0.30 / 3030`.

- Static/release gate: **335 file checks PASS**;
- Rental / deposit / slot policy: **46 assertions PASS**;
- Finance: **19 scenarios PASS**;
- Stabilization architecture: **106 assertions PASS**;
- Session: **4 scenarios PASS**;
- UX: **17 scenarios PASS**;
- PWA static: **48 assertions PASS**;
- CSS architecture: **PASS** — admin CSS has 1 `!important`;
- Operational health contract: **PASS**;
- Retention/campaign rules: **13 checks PASS**;
- Public booking resilience: **PASS** — mutation plateau `19 -> 19`, 409 unavailable stays on page and renders nearest window;
- Installed PWA / mobile / public browser visual QA: **412/412 PASS**;
- Desktop density: **60/60 PASS**;
- Final desktop visual audit: **205/205 PASS**;
- Production backend inventory: **PASS**;
- Pages build: **193 files / 4960 KiB**.

## 9. Local full HTTP E2E status

`npm run test:e2e` was attempted after the final build. The local environment blocked the very first navigation to `http://127.0.0.1:4173/bronuvannia/` with `net::ERR_BLOCKED_BY_ADMINISTRATOR`.

Result: **0 product scenarios started locally**. This is not reported as a PASS or as a product regression. GitHub Actions remains the authoritative full HTTP/Playwright gate after the archive is uploaded to the repository.

## 10. Deployment boundary

The new Supabase schema and the two updated Edge Functions are already active in production.

The public browser crash repair, public promo input and admin campaign UI are static-site changes. They will become production-visible only after this v3.0.30 archive is committed to GitHub and the new Pages workflow run completes successfully.
