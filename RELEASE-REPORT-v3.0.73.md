# VAcleaner v3.0.73 — PWA CLIENT NAV & FOCUS UX

Release date: 2026-08-08
Build: 3073
Base: VAcleaner v3.0.72 — ANALYTICS DECISION UX

## Changes

- Admin/PWA accidental pinch/page zoom hardened.
  - Admin viewport includes `maximum-scale=1,user-scalable=no`.
  - Standalone PWA runtime blocks multi-touch pinch gestures.
  - Public VAcleaner pages are unchanged.
- Client card navigation added from operational booking UI.
  - Booking cards: the Client block is clickable.
  - Upcoming cards: client name/phone block is clickable.
  - Booking detail: Client panel is clickable.
  - Phone remains a separate `tel:` action.
  - Client navigation opens the existing full client card with contacts, private document controls, and rental history.
- Mobile Bookings search behavior improved.
  - Search stays visible at the top of the view.
  - After scrolling the booking list, the search bar collapses.
  - Booking status filters remain sticky directly below the iOS safe area.
  - Returning to the top restores the search bar.
  - Other admin tabs keep their previous search behavior.
- No new parallel mobile layout contract was added; changes remain inside the existing <=900px PWA shell.

## QA

Passed locally:

- `node scripts/test-pwa.mjs`: 68 assertions PASS.
- `npm run check`: 254 file checks PASS before adding this report.
- `npm run test:pwa`: 539/539 PASS after adding real client-tap navigation checks.
  - 320 / 390 / 430 mobile widths.
  - standalone PWA + Mobile Safari tab.
  - tablet / landscape / auth / public date regressions / desktop coverage.
  - booking search collapse + sticky filters.
  - booking and upcoming client tap opens full client card.
  - fixed bottom navigation, safe areas, keyboard and modal regressions.
- `npm run test:desktop-final`: 232/232 PASS at 1024 / 1280 / 1440.
- `npm run test:desktop-density`: 60/60 PASS.
- `npm run test:stabilization`: 159 assertions PASS.
- `npm run test:deposit-policy`: 46 assertions PASS.
- `npm run test:retention`: 18 checks PASS.
- `node scripts/test-finance.mjs`: 23 scenarios PASS.
- `node scripts/test-session.mjs`: 4 scenarios PASS.
- `node scripts/test-ux.mjs`: 18 scenarios PASS.
- `node scripts/test-css-architecture.mjs`: PASS.
- `npm run check:backend`: PASS.
- `npm run test:operational-health`: PASS.
- `npm run build`: Pages artifact built successfully (191 files, 5066 KiB) before release cleanup.

Infrastructure-only failure:

- Generic `npm run test:e2e` could not navigate to `http://127.0.0.1:4173/bronuvannia/` because this environment blocks localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`. The browser failed before application assertions ran. Dedicated PWA and desktop Playwright suites passed.

## Supabase / backend

- No Supabase schema, RLS, Auth, Storage, Edge Function, or production data changes in v3.0.73.
- VA HOME was not changed.

## Production status

- GitHub Pages production has NOT been claimed as updated from this local release.
- Real iPhone/PWA validation is still required after deployment.
- Verify production with `https://vacleaner.pp.ua/release.json`; expected version after deploy: `3.0.73`.
