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
- `vacleaner-address-v1` source updated and production Edge Function deployed as version 12.
- `vacleaner-booking-v5` source includes local manual-address inference for the release archive.

## QA
- `test:v4.2.40-booking-return-ux`: 16/16 PASS.
- `test:v4.2.41-address-resilience`: 23/23 PASS.
- System Spec baseline: v4.2.41 / build 4241.

Deployment remains blocked unless canonical GitHub static + browser gates are green after the archive is committed.
