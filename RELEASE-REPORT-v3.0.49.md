# VAcleaner v3.0.49 — VA HOME ROOT MOBILE NAV + UPDATE STABILITY

Release date: 2026-08-08  
Build: 3049

## Scope

This release fixes the persistent iPhone/PWA bottom-navigation displacement that could appear after the software keyboard closed, plus the brief duplicated/flickering navigation seen during an in-app PWA update.

No Supabase schema, Edge Function, booking-finance logic, pricing, inventory, customer, campaign, or public-booking business rules were changed.

## Root cause

The problem was not the bottom offset itself.

VAcleaner had been reusing the desktop `.sidebar` element as the mobile bottom navigation. On mobile that same element was restyled from desktop sidebar into `position:fixed; bottom:0`, while it remained nested inside `.app`.

In addition, a stale later CSS override from the previous shell experiments still reapplied:

- `.app { position: fixed }`
- `.topbar, .main { position: absolute }`

This meant the mobile bottom navigation was still participating in a fixed-ancestor/compositor stack unlike VA HOME, even after several earlier fixes.

VA HOME uses a different, simpler structure:

- desktop sidebar is a desktop-only fixed element;
- mobile navigation is a separate root-level fixed element;
- mobile topbar is independently fixed;
- mobile main is independently fixed between topbar and mobile nav;
- the mobile nav is not nested in the fixed app wrapper.

v3.0.49 adopts that structure.

## Changes

### Dedicated mobile navigation

- Desktop `.sidebar` remains desktop-only.
- At <=900px the desktop sidebar is hidden.
- A separate `.mobile-nav` is rendered as a sibling of `.app` directly under `body`.
- `.mobile-nav` owns the five mobile actions:
  - Бронювання
  - Календар
  - + Нове
  - Найближчі
  - Ще
- Техніка / Клієнти / Кампанії / Аналітика / Хімія / Налаштування remain in `Ще`.
- `Аналітика` activates only `Ще` in mobile navigation.
- Mobile booking badge is synchronized independently from the desktop sidebar badge.

### Mobile shell

At <=900px:

- `.app` is no longer a fixed ancestor; it is `position: static`.
- `.topbar` is independently `position: fixed`.
- `.main` is independently `position: fixed` between topbar and bottom navigation.
- `.mobile-nav` is independently `position: fixed; bottom: 0`.
- The stale v3.0.36 `.app fixed / topbar+main absolute` override was removed.
- A conflicting `inset-block-start:auto` that could override the mobile main `top` value was removed.

This now follows the same architectural pattern used by the stable VA HOME mobile admin.

### PWA update transition

When the manager presses `Оновити зараз`:

- the outgoing mobile navigation is hidden before `SKIP_WAITING`;
- the existing worker activates;
- `controllerchange` reloads the app;
- the new page paints one mobile navigation layer.

This prevents the outgoing and incoming fixed navigation layers from briefly appearing at two different Y positions during the iOS PWA reload transition.

## Verification

### Static / business / architecture

- Build checks: 287 passed
- Rental / deposit / slot policy: 46 passed
- Stabilization: 139 passed
- Finance: 19 passed
- Session: 4 passed
- UX: 17 passed
- Retention / campaigns: 15 passed
- PWA static: 62 passed
- Backend inventory: PASS
- CSS architecture: PASS, 1 authored `!important`
- Public booking resilience: PASS

### PWA runtime

The visual PWA suite was executed in split runs because the environment can terminate one very long Playwright pipe with EPIPE.

Completed runtime assertions:

- 320px mobile: 143 / 143
- 390px mobile: 142 / 142
- 430px mobile: 142 / 142
- Tablet: 7 / 7
- Landscape: 7 / 7
- Auth / keyboard: 10 / 10
- Public date controls: 5 / 5
- Public nearest availability: 5 / 5
- Desktop PWA shell: 26 / 26

Total split PWA assertions: **487 / 487 passed**.

Dedicated keyboard navigation regression on 320 / 390 / 430 confirms that before, during and after keyboard state:

- `.mobile-nav` remains `position: fixed`;
- CSS `bottom` remains `0px`;
- physical bottom equals viewport bottom;
- desktop `.sidebar` is not visible on mobile;
- `.mobile-nav` is a direct child of `body`.

### Desktop

- Desktop density: 60 / 60
- Final desktop visual:
  - 1440px: 77 / 77
  - 1280px: 77 / 77
  - 1024px: 78 / 78
- Total final desktop visual: **232 / 232**

### Build artifact

- Pages build: 193 files / 4972 KiB

## Local environment note

The normal localhost E2E environment remains subject to the existing environment-level Chromium localhost restriction. This release does not treat a blocked local origin as a product pass/fail result.

GitHub Actions must still be checked after upload before calling the production deployment green.

## Production / backend

No Supabase or Edge Function changes are included in this release.
