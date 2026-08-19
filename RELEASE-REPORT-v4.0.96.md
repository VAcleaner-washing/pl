# VAcleaner Release Report — v4.0.96 / build 4096

## Scope
Manager-facing booking extras at a glance.

## Root cause
Selected extra items were already stored in booking `extras.selected_items` and rendered in the detailed booking view, but the mobile booking list intentionally hid the detailed `.booking-extra` row and replaced it with a generic `Додатково` badge. As a result, the manager could not see which bottles/accessories had to be prepared without opening the booking.

## What changed
- Booking header now shows selected extras directly under the internal equipment name.
- Compact manager labels are used in the header: e.g. `SPOT FIX 50 мл`, `STAIN OX 30 мл`, `Neutralix 250 мл`.
- Prices are intentionally omitted from the header; the existing detailed extras row/detail panel still contains full names and prices.
- Mobile no longer duplicates this information with a generic `Додатково` badge.
- `Найближчі` also uses the same compact extra labels.
- No selected extras means no extra header line.

## QA
- `npm run check` — PASS, 341 file checks.
- `node scripts/test-booking-extra-summary.mjs` — PASS, 11 checks.
- `node scripts/test-admin-product-labels.mjs` — PASS, 36 checks.
- `node scripts/test-pwa.mjs` — PASS, 82 assertions.
- `python scripts/booking_extra_summary_qa.py` — PASS, 60 checks across 320 / 390 / 430 / 768 / 1024 / 1280 / 1650×760 / 1920.
- `python scripts/admin_product_labels_qa.py` — PASS, 38 checks.
- Targeted browser QA used three simultaneous extras and verified: all names visible, no collision with status, no horizontal overflow, detail retains full labels/prices, and Upcoming also surfaces the extras.
- The broader PWA visual suite was also started; its 320 booking-card height contract passed with the new header line before the long suite exceeded the execution window. No claim is made that the entire long suite completed.

## Backend
No Supabase/Edge Function source changed compared with v4.0.95. No backend deployment is required for this frontend UX change.
