# VAcleaner Release Report — v4.0.97 / build 4097

## Scope
Finance UX by rental stage + client quick-action layout.

## Root cause
The booking card rendered the arithmetic rental balance from `calc()` regardless of rental status. On a confirmed booking this made the remaining rental amount look like money due at issue, even though VAcleaner only collects the security deposit at issue and settles the rental at return.

The client-card quick actions also allowed the “Нова оренда” label to wrap despite sufficient mobile width.

## Fix
- Added an explicit settlement-stage resolver: before issue / issued / final.
- Before issue, no due/refund settlement badge is rendered. The finance block only exposes the security deposit due at issue.
- Removed the `Розрахунок` action from confirmed bookings.
- After issue, show a clearly preliminary return settlement: `Попередньо повернути`, `Попередньо доплатити`, or `Попередній баланс 0 грн`.
- The intermediate finance modal is named `Попередній розрахунок`.
- The final settlement remains exclusively in the return workflow.
- `Нова оренда` in the client card stays on one line without reducing the font size.

## Exact business-case verification
Fixture: total 950 грн, prepayment 200 грн, security deposit 1000 грн, no extra charges.
- Confirmed: no `750 грн` due amount; only `Залоговий платіж 1 000 грн · при видачі`; no `Розрахунок` action.
- Issued: `Попередньо повернути 250 грн`; security deposit shown as received; `Розрахунок` becomes available.
- Confirmed detail: `Фінальний розрахунок — Після повернення`.
- Issued detail: `Попередньо повернути при поверненні — 250 грн`.

## Verification
- `npm run check` — PASS, 341 file checks.
- `node scripts/test-issue-workflow.mjs` — PASS, 18/18.
- `node scripts/test-finance.mjs` — PASS.
- `node scripts/test-pwa.mjs` — PASS, 82/82.
- `node scripts/test-ux.mjs` — PASS, 24 scenarios.
- `node scripts/test-sms-campaigns.mjs` — PASS, 78/78.
- `node scripts/test-css-architecture.mjs` — PASS.
- `node scripts/test-booking-extra-summary.mjs` — PASS, 11 checks.
- Relevant PWA mobile/tablet suites after the finance-contract update — 671/671 PASS.
- Desktop-final 1024 / 1280 / 1440 — 235/235 PASS.
- Exact 950/200/1000 browser probe — PASS at 390×844, 1024×768 and 1650×760 with no horizontal overflow.

## Backend
No Supabase / Edge Function deployment in this release. Backend business logic was not changed.

## Release note
Creating this ZIP does not mean the live site or GitHub Actions were updated.
