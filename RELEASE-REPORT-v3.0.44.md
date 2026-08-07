# VAcleaner v3.0.44 — VA HOME MOBILE NAV

Date: 2026-08-07
Build: 3044
Base: v3.0.43

## Changed

- Rebuilt the mobile/PWA bottom navigation to follow the VA HOME pattern:
  - `Бронювання`
  - `Календар`
  - centered raised `+ Нове`
  - `Найближчі`
  - `Ще`
- Removed `Аналітика` from the five primary mobile actions and moved it into `Ще`.
- Kept `Техніка`, `Клієнти`, `Кампанії`, `Аналітика`, `Хімія`, and `Налаштування` inside `Ще` on mobile/PWA.
- Removed the duplicate topbar `+` action on mobile; desktop `+ Нове бронювання` remains unchanged.
- The centered `+ Нове` opens the existing booking wizard and does not introduce another booking flow.

## Active-state contract

- `Бронювання`, `Календар`, and `Найближчі` highlight only their own visible bottom item.
- `Аналітика` is not rendered as a primary mobile item.
- When `Аналітика` or another secondary section is open, only `Ще` is highlighted in the visible bottom navigation.
- The centered `+ Нове` is an action, not a navigation destination, so it does not create a second active state.

## Regression protection

- PWA runtime QA asserts all five visible mobile actions are exactly the intended set.
- PWA QA asserts the centered New action rises above the normal navigation row.
- PWA QA opens `Ще`, opens `Аналітика`, and verifies there is no second visible active item.
- Mobile E2E now opens new bookings through the centered mobile action instead of the hidden desktop button.
- Tablet and landscape PWA QA use the same centered action.

## Verification

- `npm run check`: 278 checks PASS
- Stabilization: 131 assertions PASS
- Rental/deposit/slot policy: 46 assertions PASS
- Finance: 19 scenarios PASS
- Session: 4 scenarios PASS
- UX: 17 scenarios PASS
- PWA static: 54 assertions PASS
- Retention/campaign rules: 15 checks PASS
- Operational health contract: PASS
- CSS architecture: PASS, 1 `!important`
- Public booking resilience: PASS
- Installed-PWA visual/runtime suites: 484/484 PASS when run as isolated browser suites (320 / 390 / 430 / tablet / landscape / auth / public-date / public-nearest / desktop)
- Targeted VA HOME-style navigation regression: PASS at 320 / 390 / 430
- Desktop density QA: 60/60 PASS
- Final desktop visual audit: 232/232 PASS
- Pages build: 193 files / 4971 KiB

The monolithic PWA runner in this environment can exhaust its Playwright pipe after hundreds of checks (`EPIPE`). Each constituent suite was therefore rerun in a fresh browser process and all 484 assertions passed; this is an environment runner issue, not counted as a product PASS by the failed monolithic process itself.

## Release boundary

Frontend/mobile navigation + QA only. Supabase, Edge Functions, database schema, booking/finance rules and production data are unchanged.
