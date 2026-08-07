# VAcleaner v3.0.29 — ANALYTICS + CSS ARCHITECTURE + PRODUCTION HEALTH

Release date: 2026-08-07  
Build: 3029  
Base: v3.0.28 — ADMIN SCROLL + PWA DETAIL REPAIR

## Scope

This release intentionally does **not** add a CRM workflow. It delivers the agreed priorities 1–3 and 5: CSS architecture cleanup, decision-oriented rental analytics, repeat/sleeping customer metrics, and production health checks for push + reservation hard-block.

## 1. CSS architecture cleanup

- `assets/admin-v250.css`: **171 → 1 `!important` declaration**.
- The remaining declaration is the intentional `.hidden` utility.
- Mobile admin styling is consolidated around one primary `@media (max-width:900px)` contract.
- New CI gate `scripts/test-css-architecture.mjs` enforces an admin budget of at most 5 `!important` declarations.
- Existing authored public CSS override counts are frozen so future repairs cannot silently increase them.
- No business logic, booking pricing, deposit rules, settlement logic, or inventory rules were changed as part of the CSS cleanup.

## 2. Decision-oriented analytics

Analytics now includes:

- Revenue with previous-period comparison.
- Average ticket with previous-period comparison.
- Overall equipment utilization with previous-period comparison.
- Utilization by physical resource: Puzzi, SC 2, Jimmy JV35, ABIR.
- Repeat-rate with previous-period comparison.
- New completed rentals vs repeat completed rentals.
- Unique customers in the selected period.
- Existing cancellation, equipment popularity, extras and status views remain.

Utilization is based on occupied **half-day slots** divided by available physical inventory capacity for the selected period. Reservation states counted for capacity are completed, confirmed, issued, and non-expired waiting-payment holds. Pending requests do not reserve stock.

Analytics periods: 7 days, 30 days, current month, all time. Revenue/customer-period metrics use the rental return date for completed rentals, so historical imports are not accidentally counted by their import timestamp.

## 3. Repeat / sleeping customers

- Client filter: `Повторні 2+ оренд`.
- Client filter: `Сплячі 60+ днів`.
- A sleeping customer is a real-phone customer whose latest completed rental is older than 60 days and who has no active waiting-payment / confirmed / issued rental.
- Analytics includes a sleeping-customer count, a short high-value list, and a direct action into the filtered Clients view.

## 5. Production health

### Reservation hard-block

Production migration adds `public.vacleaner_operational_health()` which verifies the authoritative `vacleaner_apply_reservation` function still contains:

- transaction advisory lock;
- half-open slot overlap contract;
- physical capacity check;
- `inventory_conflict` hard-block;
- pending requests do not reserve inventory.

Live production verification returned:

- `healthy: true`
- `transactionLock: true`
- `halfOpenSlots: true`
- `capacityHardBlock: true`
- `pendingDoesNotReserve: true`

### Push health

`vacleaner-admin-data-v1` is deployed as **v3 ACTIVE / verify_jwt=true** and exposes authenticated operational health to Settings.

The Settings → `Стан production` card reports:

- active push subscriptions;
- last successful production push delivery;
- latest failure, if present;
- live hard-block state.

Push health is green only when VAPID config exists, at least one active subscription exists, there has been a successful delivery, and the latest success is not older than the latest failure.

Production at release time:

- active push subscriptions: **3**;
- last successful push: **2026-08-07 07:23:15.965 UTC**;
- latest active-subscription failure: **none**;
- `vacleaner-booking-v5`: **v6 ACTIVE**;
- `vacleaner-admin-data-v1`: **v3 ACTIVE**.

## Additional regression repair found during QA

The new visual gate exposed that `renderChemistry()` had been accidentally removed while the Clients/Analytics block was being refactored. The real renderer was restored; Carp-Deta is again verified at 320 / 390 / 430 px. The test was not weakened.

## GitHub Pages workflow

The release ZIP again includes `.github/workflows/pages.yml`. Recent ZIP packaging had omitted the hidden `.github` folder, which could remove the workflow when the repository was replaced wholesale. v3.0.29 packages the workflow intentionally.

## Final QA

- Static/build gate: **329 file checks PASS**.
- Rental/deposit/slot policy: **46 assertions PASS**.
- Finance: **19 scenarios PASS**.
- Stabilization architecture: **105 assertions PASS**.
- Session: **4 scenarios PASS**.
- UX: **17 scenarios PASS**.
- PWA static: **48 assertions PASS**.
- CSS architecture: **PASS — admin 1 `!important`, budget <= 5**.
- Operational health static contract: **PASS**.
- Browser/PWA visual QA: **400/400 PASS**.
- Desktop density: **60/60 PASS**.
- Final desktop visual audit: **205/205 PASS**.
- Pages build artifact: **193 files / 4944 KiB**.

### Local E2E limitation

The full `npm run test:e2e` cannot execute in this container because Chromium navigation to `http://127.0.0.1:4173/bronuvannia/` is blocked by the environment with `ERR_BLOCKED_BY_ADMINISTRATOR`. It is **not marked PASS**. GitHub Actions remains the authoritative full E2E/deployment gate after upload.

## CRM

No CRM follow-up/timeline implementation is included in this release. That decision remains separate by design.
