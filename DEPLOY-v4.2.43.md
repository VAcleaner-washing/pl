# VAcleaner v4.2.43 — CRITICAL BOOKING FIXES

## Scope
- Admin booking card: delivery amount is a separate right-aligned value; address is a separate row.
- Public booking: visible full-width promo control on Contacts.
- Return finance: Story reward choice persists end-to-end; VA HOME diffuser does not activate free Puzzi chemistry.

## Production backend already synchronized
- `vacleaner-admin-bookings-v4` — production Edge Function version **8**, ACTIVE.
- Version 8 accepts `storyGiftChoice`, persists `extras.gifts.story`, and grants two free Puzzi portions only for `chemistry2`.
- `vacleaner-address-v1` — production Edge Function version **13**, ACTIVE.

## Frontend deploy
Deploy the repository contents from this archive as one release. Build is **4243**, so public/admin assets and PWA service worker are cache-busted together.

## Release gate
- `npm run qa:static` — 101 / 101 suites PASS.
- `npm run test:v4.2.43-critical-booking-fixes` — 14 / 14 PASS.
- `npm run test:admin-return-gift-persistence` — 9 / 9 PASS on mobile 390 fixture.
- Focused PWA checks confirmed delivery value right-aligned at 320 / 390 / 430 px.
- GitHub canonical Browser/PWA aggregate remains the final deploy gate after push.
