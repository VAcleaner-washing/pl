# VAcleaner v3.0.74 — BOOKING SEARCH MOTION FIX

Release date: 2026-08-08
Build: 3074
Base: VAcleaner v3.0.73 — PWA CLIENT NAV & FOCUS UX

## Changes

- Fixed the abrupt mobile Bookings search collapse reported from the real iPhone/PWA.
- Replaced the single 42px toggle threshold with hysteresis:
  - search collapses only after scrolling beyond 72px;
  - once collapsed, it stays collapsed through small reverse scrolls;
  - search returns only when the manager is back near the top (<18px).
- Scroll handling is requestAnimationFrame-throttled to avoid repeated class flips during iOS momentum scrolling.
- Topbar, main viewport geometry and sticky booking filters now animate together for 240ms with the same easing curve.
- No visualViewport, 100vh/dvh/lvh or new mobile shell contract was introduced.
- No booking, finance, deposit, client, Supabase or public-site business logic changed.

## QA

Passed locally after stamping build 3074:

- `node scripts/test-pwa.mjs`: 70 assertions PASS.
- `npm run check`: 268 file checks PASS before adding this report.
- Targeted Playwright PWA + desktop visual regression: 504/504 PASS.
  - mobile 320 / 390 / 430;
  - verifies the collapse is animated;
  - verifies hysteresis prevents flicker on small reverse scrolls;
  - verifies search returns only near the top;
  - verifies sticky filters and fixed bottom navigation remain stable;
  - full desktop view regression included.
- `npm run test:desktop-final`: 232/232 PASS at 1024 / 1280 / 1440.
- `npm run test:desktop-density`: 60/60 PASS.
- `node scripts/test-stabilization.mjs`: 159 assertions PASS.
- `npm run test:deposit-policy`: 46 assertions PASS.
- `npm run test:retention`: 18 checks PASS.
- `node scripts/test-finance.mjs`: 23 scenarios PASS.
- `node scripts/test-session.mjs`: 4 scenarios PASS.
- `node scripts/test-ux.mjs`: 18 scenarios PASS.
- `node scripts/test-css-architecture.mjs`: PASS.
- `npm run check:backend`: PASS.
- `npm run test:operational-health`: PASS.
- `npm run build`: Pages artifact built successfully (191 files, 5066 KiB) before release cleanup.

Environment limitation:

- Generic `npm run test:e2e` still cannot navigate to `http://127.0.0.1:4173/bronuvannia/` because this environment blocks localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`. The browser fails before application assertions run.
- The monolithic `test:pwa` wrapper also exceeded the container execution timeout after completing mobile/tablet coverage; the same relevant mobile suites plus desktop suite were therefore executed directly and passed 504/504.

## Supabase / backend

- No Supabase schema, RLS, Auth, Storage, Edge Function or production data changes in v3.0.74.
- VA HOME was not changed.

## Production status

- GitHub Pages production has NOT been claimed as updated from this local release.
- Real iPhone/PWA validation is required after deployment because this release specifically addresses iOS scroll feel.
- Verify production with `https://vacleaner.pp.ua/release.json`; expected version after deploy: `3.0.74`.
