# VAcleaner v3.0.75 — BOOKING SEARCH STABLE SHELL FIX

## Base
- Source base: VAcleaner v3.0.74 — BOOKING SEARCH MOTION FIX.
- The separate Liquid Glass experiment was not used and is not included in this release.

## Fixed
- Removed the scroll-driven mobile booking-search collapse entirely.
- Removed the `mobile-booking-search-collapsed` runtime state, 72/18 px thresholds, and shell-geometry transitions.
- Mobile booking search now stays fixed and visible while `.main` scrolls.
- Booking status filters remain sticky below the stable search/topbar shell.
- No `visualViewport`, `100vh/100dvh/100lvh`, fixed-app, or browser-scrollbar workaround was added.

## Why
On a real iPhone/PWA, animating the fixed topbar together with `.main` changed shell geometry during touch scrolling and produced a visible jerk even with easing/hysteresis. The stable-shell approach removes the layout shift instead of trying to mask it with a transition.

## QA
- Build/static QA: PASS — 255 file checks.
- PWA static contract: PASS — 70 assertions.
- PWA visual QA: PASS — 545 checks, including 320 / 390 / 430, Mobile Safari tab, tablet, landscape, auth, public booking, desktop.
- Desktop final visual QA: PASS — 232 checks at 1024 / 1280 / 1440.
- Desktop density QA: PASS — 60 checks.
- Rental/deposit/slot policy: PASS — 46 assertions.
- Finance: PASS — 23 scenarios.
- Session: PASS — 4 scenarios.
- UX: PASS — 18 scenarios.
- Retention/campaigns: PASS — 18 checks.
- Stabilization: PASS — 159 assertions.
- CSS architecture: PASS.
- Operational health contract: PASS.
- Generic localhost E2E could not start because the execution environment blocks `http://127.0.0.1:4173` with `ERR_BLOCKED_BY_ADMINISTRATOR`; it failed before loading the product and is not a product assertion failure.

## Production / Supabase
- Supabase production was not changed.
- VA HOME was not touched.
- GitHub Pages production is not considered updated until `https://vacleaner.pp.ua/release.json` reports `3.0.75`.
- Real iPhone/PWA behavior still requires confirmation after deployment; the user-provided real-device result has priority over local emulation.
