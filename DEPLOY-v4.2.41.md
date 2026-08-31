# VAcleaner v4.2.41 — ADDRESS + BOOKING UX RESILIENCE

## Scope
- address autocomplete is assistive, never a booking gate;
- manual street + house remains bookable when OpenStreetMap/Photon has no exact building;
- unrelated nearby house numbers are filtered out;
- exact provider coordinates remain the only source for route/fuel facts;
- promo code entry is visibly discoverable but optional;
- Story gift state remains stable across estimate/restore;
- desktop booking summary keeps financial values on the right: Delivery amount aligns with rental/prepayment/deposit.

## Backend
- `vacleaner-address-v1` source updated and production Edge Function deployed as version 13.
- `vacleaner-booking-v5` source includes local manual-address inference for the release archive.

## QA
- `test:v4.2.40-booking-return-ux`: 16/16 PASS.
- `test:v4.2.41-address-resilience`: 25/25 PASS.
- System Spec baseline: v4.2.41 / build 4241.

Deployment remains blocked unless canonical GitHub static + browser gates are green after the archive is committed.

## CI repair after canonical GitHub run
- restored `rishennia/textile/index.html`; the failed archive contained a zero-byte public route;
- removed the accidental `!important` from the delivery-summary alignment rule;
- manual-address copy again satisfies the canonical non-blocking contract;
- Poltava manual fallback keeps the typed house number without invented coordinates;
- generated QA evidence directories are excluded from the release ZIP and must never be committed as source;
- canonical local static gate after repair: 99/99 PASS.
