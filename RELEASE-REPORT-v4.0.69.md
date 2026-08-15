# VAcleaner v4.0.69 — SMS REACTIVATION & MARKETING CONSENT

Released: 2026-08-15  
Build: 4069

## Scope

This release adds controlled SMS reactivation to the existing VAcleaner Campaigns area and an optional marketing-consent checkbox to public booking. It does not change rental prices, deposit logic, finance formulas, booking status workflow, redirect rules, timezone storage, or the admin PWA zoom lock.

## Production backend applied

- Production migration `vacleaner_sms_reactivation_consent_v4069` applied to the shared Supabase project using VAcleaner-only objects.
- `vacleaner_customers` now stores explicit SMS marketing consent / source / opt-out timestamps.
- Added private RLS-protected audit tables:
  - `vacleaner_sms_dispatches`
  - `vacleaner_sms_dispatch_recipients`
- `vacleaner-campaigns-v1` deployed as production version 6.
- New public `vacleaner-sms-consent-v1` deployed as production version 1.
- `vacleaner-booking-v5` was deliberately left unchanged in production; public opt-in is written only after a successful recent booking through the dedicated consent endpoint.
- SendPulse credential is read only from the Supabase secret `SENDPULSE_API_KEY`; it is not embedded in frontend code or release files.
- Production verification after backend setup: 0 SMS dispatches and 0 SMS recipients were created. No real SMS was sent during implementation or QA.
- SMS audit tables have RLS enabled and direct anon/authenticated access denied.

## Admin — Campaigns

Added `SMS-розсилка` / `Розбудити клієнтів` inside the existing Campaigns workflow.

Available audience segments:
- all completed customers without an active rental;
- sleeping 180+ days;
- warm return 180–365 days;
- long dormant 365+ days.

The recipient list shows:
- explicit consent;
- legacy / consent not technically recorded;
- opted-out contacts;
- active booking block;
- 90-day SMS cooldown.

Safety rules:
- opted-out contacts cannot be selected;
- customers with an active rental cannot be selected for reactivation;
- contacts messaged during the last 90 days cannot be selected;
- legacy recipients require an explicit admin attestation before send;
- sending requires a second confirmation click;
- national route is blocked by backend until SendPulse reports `VACLEANER` sender status as active;
- international route must be selected deliberately;
- marketing SMS is rejected by backend if it does not contain the opt-out address `vacleaner.pp.ua/s`;
- maximum message size follows the SendPulse Unicode limit used by the UI/backend contract: 402 characters / up to 6 parts.

Delivery history is stored per dispatch and per recipient. The admin can sync delivered / not delivered states and provider cost from SendPulse campaign statistics.

## Client card

Added SMS section to the client card:
- current consent state;
- marketing SMS toggle;
- previous SMS history;
- admin-confirmed opt-in or opt-out is stored with timestamp/source.

## Public booking

Added an optional, unchecked checkbox:

`Отримувати персональні пропозиції та бонуси VAcleaner`

Rules:
- it is not required for booking;
- defaults to unchecked;
- explicit opt-in is recorded only after booking creation succeeds;
- the dedicated backend additionally verifies the recent booking code + phone before recording consent;
- an existing consent is not erased when a returning customer simply leaves the optional checkbox unchecked.

Added short URLs:
- `/b/` → booking page;
- `/s/` → SMS opt-out page.

Privacy copy was updated to document SMS marketing, SendPulse processing, optional consent, and opt-out.

## Existing customer base

The historical database is not removed from the feature. Legacy customers remain available in the admin audience with a visible `Стара база` state. No existing customer was automatically marked as having explicit marketing consent.

Production snapshot during implementation (2026-08-15):
- 295 completed-customer phone identities without an active rental;
- 217 dormant 180+ days;
- 166 dormant 365+ days.

These numbers are dynamic and will change as bookings change.

## QA

Final release checks after the last double stamp:
- `npm run check`: 331 file checks PASS.
- `npm run test:sms-campaigns`: 21/21 PASS.
- `npm run test:pwa-static`: 82 assertions PASS.
- `npm run test:pwa`: 668 PASS, including the SMS modal on mobile widths and opted-out recipient blocking.
- `npm run test:public-booking`: PASS, including optional consent injection/default-unchecked validation and booking resilience.
- `npm run test:smart-guide-fit`: 32/32 PASS.
- `npm run test:client-card-mobile`: 3/3 PASS.
- `npm run test:desktop-density`: 63 PASS.
- `npm run test:desktop-final`: 232 PASS.
- `npm run test:deposit-policy`: 46 assertions PASS.
- `npm run test:stabilization`: 171 assertions PASS.
- retention, financial-control, analytics, operational-health, package-language, SEO, delivery-settings, peer-admin-push, booking-date-default, copy-integrity and CSS architecture regression tests PASS.
- production backend inventory check PASS.
- build: 214 Pages files / 6514 KiB generated successfully before release cleanup.

`npm run test:e2e` could not start its local-browser navigation because this execution environment blocks `http://127.0.0.1/...` with `ERR_BLOCKED_BY_ADMINISTRATOR`. This is recorded as an environment limitation, not counted as a product PASS. The project-specific browser QA suites above did execute successfully.

## Not changed

- Booking slots remain `08:00–10:00` and `17:30–20:00`; admin/DB settings remain authoritative.
- Existing redirect setup was not changed.
- Historical timezone/timestamptz migration was not attempted.
- Broader admin-account authorization refactor was not attempted.
- Admin PWA remains non-zoomable / static as previously approved.
- No real SMS campaign was sent.

## Deployment note

Production Supabase schema/functions for SMS are already updated. The public/admin frontend part becomes available after this v4.0.69 archive is deployed to the VAcleaner GitHub Pages source. Do not send an SMS campaign before the `/s/` opt-out page from this release is live.
