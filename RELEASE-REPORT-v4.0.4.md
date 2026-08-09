# VAcleaner v4.0.4 — BOOKING +1 DAY DEFAULT

Release date: 2026-08-09
Build: 4004

## Change

- Public `/bronuvannia/`: selecting the pickup date now automatically sets the return date to the next calendar day.
- The return date remains fully editable by the customer after the default is applied.
- The existing availability, rental-day, price, promo, delivery, chemistry and deposit calculations continue to use the final customer-selected period.
- The default is applied through native input/change events so the existing React-controlled booking form receives the new return date normally.
- Month/year/leap-day transitions are handled as calendar dates.

## QA

- Build check: PASS — 285 file checks.
- Rental/deposit/slot policy: PASS — 46 assertions.
- Stabilization contract: PASS — 159 assertions.
- Finance: PASS — 23 scenarios.
- Rental extension contract: PASS — 10 assertions.
- CSS architecture: PASS.
- Session: PASS — 4 scenarios.
- Retention/campaign rules: PASS — 18 checks.
- PWA static: PASS — 71 assertions.
- Public booking resilience: PASS.
- Public booking +1 day default contract: PASS — 9 assertions.

## Scope

No Supabase schema/function change is required for this release. The backend receives the final dates selected by the customer as before.
