# VAcleaner v4.0.17 — PROCESS METADATA & PUSH COPY FIX

## Fixed

- Booking workflow flags are no longer appended as human text to `admin_note` and can no longer appear inside the visible booking comment.
- `З клієнтом зв’язались`, document state, sent conditions and prepayment state now have structured `extras.processing` metadata.
- Static frontend keeps a hidden backward-compatible process marker only while an older `vacleaner-admin-bookings-v3` is still deployed; the marker is filtered from every visible/editor note and the updated Edge Function strips it before database storage.
- Existing polluted bookings are cleaned at render/edit time: known legacy workflow lines never appear as the customer comment or manager note.
- `Коментар клієнта` and `Примітка менеджера` are separate UI blocks; one never falls back to the other.
- Customer classification is exactly one state: `new`, `repeat` or `known`; repeated processing cannot append contradictory “new + repeat” text.
- Backend create/edit/status-update paths sanitize `admin_note` and preserve structured processing metadata in `extras`.
- New-booking push copy is shorter: `Нове бронювання · <техніка>` + client + rental period + amount + `Потрібне підтвердження`.
- VAcleaner push payload contains no literal `from VAcleaner`. Any app/source attribution rendered by iOS is outside notification title/body payload.

## Regression coverage

- Added `test:process-metadata`: 29 contract checks for comment separation, compatibility marker isolation, structured processing, backend sanitization, mutually exclusive customer kind and push copy.
- PWA browser QA explicitly verifies that legacy workflow metadata cannot leak into booking detail and that client comment / manager note stay separate.
- GitHub Pages workflow runs the new process/push contract before browser suites.

## QA

- `check` — PASS after final source changes.
- Rental/deposit/slot policy — 46 PASS.
- Stabilization — 159 PASS.
- Public visual contract — 144 PASS.
- Retention/campaign — 18 PASS.
- Public booking CTA stability — 14 PASS.
- Process metadata / push copy — 29 PASS.
- Finance — 23 PASS.
- Session — 4 PASS.
- Rental extension — 10 PASS.
- Public booking +1 day default — 9 PASS.
- CSS architecture — PASS.
- Operational health — PASS.
- PWA visual QA — 566 PASS / 0 FAIL; 320px booking-card max 586px vs 640px CI limit.
- Desktop density — 60 PASS.
- Final desktop visual — 232 PASS.
- Glass V4 QA — PASS on 320 / 390 / 430 and desktop 1024 / 1280 / 1440 / 1648.
- Mobile client card — 3/3 PASS.
- Public booking step order — PASS (`1 → 2 → 3 → 4`).

Local full `test:e2e` cannot reach the local `127.0.0.1` server in this execution environment (`ERR_BLOCKED_BY_ADMINISTRATOR`), so the GitHub Actions browser run remains the production-grade e2e confirmation.

## Scope

No pricing, deposit, rental-day, chemistry, availability, Supabase schema/RLS/Auth, VA HOME tables or public booking business flow was changed.

## Deployment order

1. Deploy the static v4.0.17 Pages release first. It is backward-compatible with the currently deployed VAcleaner admin function and no workflow state is lost.
2. After Pages is live, deploy only VAcleaner Edge Functions `vacleaner-admin-bookings-v3` and `vacleaner-reminders-v1`.
3. Do not touch VA HOME functions/tables/RLS/Auth.

The new push wording becomes active only after `vacleaner-reminders-v1` is deployed. Canonical structured `extras.processing` storage becomes active after `vacleaner-admin-bookings-v3` is deployed.
