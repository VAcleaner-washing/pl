# VAcleaner v4.1.47.2 — DELIVERY DISTANCE PRICING

Released: 2026-08-26
Build: 41472
Shared config: `f40a992ac0bd4c1e`

## Changed

- Delivery remains **250 UAH** for Poltava, Rozsoshentsi, Shcherbani and Horbanivka.
- Delivery outside Poltava is now distance-based:
  - up to 10 km outside the city pricing boundary — **350 UAH**;
  - after 10 km — **+15 UAH for each started additional kilometre**;
  - over 30 km — **price by agreement before prepayment**.
- Public copy no longer describes the full 30 km zone as “suburbs”.
- Address autocomplete requests a road-route quote after a verified address is selected. The quote uses OSRM route geometry; a conservative estimated-distance fallback is used if routing is temporarily unavailable.
- Public booking sends route/distance metadata and `vacleaner-booking-v5` revalidates a non-local selected address through the server-side address function before persisting the delivery price.
- Stored booking delivery metadata includes pricing distance, extra kilometres, route distance and quote source.
- Admin UI calculates the same distance tariff. Production admin writes go through authenticated `vacleaner-admin-bookings-v4`, which enforces the automatic 250 / 350 + per-km rule before forwarding to the existing v3 booking service; manually agreed pricing remains possible for unverified or >30 km addresses.
- Delivery settings now persist local fee, outside base fee, included kilometres, per-km fee and maximum automatic distance.
- Delivery, FAQ, terms, SEO descriptions and funnel delivery dimensions were synchronized.

## Production Edge Functions

- `vacleaner-address-v1` — v7 ACTIVE
- `vacleaner-settings` — v16 ACTIVE
- `vacleaner-booking-v5` — v18 ACTIVE
- `vacleaner-admin-bookings-v4` — v1 ACTIVE
- Existing `vacleaner-admin-bookings-v3` remains the underlying authenticated booking service.

## Checks

- `npm run check` — PASS, 392 file checks.
- `npm run test:v4.1.47.2-delivery-distance` — PASS, 18/18.
- delivery settings — 15/15.
- v4.1.45 trust/rules — 16/16.
- v4.1.47 Local Area — 18/18.
- v4.1.47 SEO/Local SEO — 179/179.
- v4.1.46 funnel analytics — 15/15.
- address regressions — 8/8 and 15/15.
- delivery entrance UX — 8/8.
- public booking resilience — PASS.
- rental/deposit/slot policy — 66 assertions PASS.
- RETURN activation — 23 checks PASS.
- RETURN detach UX — PASS.
- client promo regression — 14/14.
- SMS/campaign regression — 82/82.
- Pages build — 224 files, 6866 KiB.

`npm run test:e2e` cannot navigate to the local test server in this environment (`ERR_BLOCKED_BY_ADMINISTRATOR` before the page loads). The browser suite remains in CI; this is not counted as a product pass.

## Not changed

Rental prices, deposits, inventory capacities, authoritative slot availability/reservation rules, RETURN campaign logic, SMS transport, booking statuses and the overall booking flow were not redesigned in this patch.
