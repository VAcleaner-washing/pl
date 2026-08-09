# VAcleaner v3.0.75 — BOOKING SEARCH STABLE SHELL FIX

## Base
- Source base: VAcleaner v3.0.74 — BOOKING SEARCH MOTION FIX.
- Production core remains the stable v3.0.75 implementation. This TEST archive additionally includes an isolated `/admin/bronuvannia-glass/` Liquid Glass V4 overlay; `/admin/bronuvannia/` is unchanged.

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


## Liquid Glass V4 test overlay
- `Найближчі`: strong amber issue / green return rails, halo, semantic badges and action hierarchy.
- `Бронювання`: semantic status rail (new / waiting / confirmed / issued / completed / cancelled), stronger client affordance and premium status treatment.
- `Календар`: distinct full / one-left / occupied slot controls while keeping day cards as solid content.
- `Нове бронювання`: unified four-step progress, premium selected states, glass header/footer and stable solid form content.
- `Картка клієнта`: quick Call / Telegram / New rental actions, stronger summary, private-document hierarchy and rental history.
- Glass assets load only on `/admin/bronuvannia-glass/`.
- Main production admin files (`admin/bronuvannia/index.html`, `assets/admin-v250.css`, `assets/admin-v250.js`, `assets/vacleaner-core.js`, `release.json`) SHA-match the clean v3.0.75 stable build.

## Glass V4 QA
- Existing Glass shell QA: PASS on 320 / 390 / 430.
- V4 targeted UX QA: PASS on 320 / 390 / 430 for booking status rails, client quick actions, client-card overflow, four-step booking form, modal viewport fit and calendar overflow.
- Build/static check after V4: PASS — 270 file checks.
- Pages artifact build: PASS — 200 files / ~5.9 MiB.
- No Supabase changes.
