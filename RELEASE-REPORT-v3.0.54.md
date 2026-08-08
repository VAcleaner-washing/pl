# VAcleaner v3.0.54 — IOS STANDALONE SAFE-AREA FIX

Release date: 2026-08-08  
Build: 3054  
Base: VAcleaner v3.0.53 — STATIC PWA NAV ROOT

## Real-device evidence

A physical iPhone installed-PWA screenshot still showed the bottom navigation visually too high, with a large black strip below the controls.

The v3.0.53 root-level DOM fix was present and correct: there is one `.mobile-nav`, it is a direct child of `body`, and it remains `position:fixed; bottom:0`. The remaining displacement therefore was not caused by a duplicate nav, fixed ancestor, stale keyboard class, or runtime recreation.

## Root cause

The mobile shell used `env(safe-area-inset-bottom)` directly for both:

- the bottom-nav total height (`66px + safe area`);
- bottom padding inside the nav;
- the matching main/footer clearances.

The local PWA suite injected the normal iPhone portrait value of `34px`, so it could not reproduce an installed-PWA WebKit case where the reported bottom safe area is inflated by browser chrome that is not actually rendered in standalone mode.

The real-device screenshot geometry is consistent with an oversized bottom safe-area value: the fixed nav remains bottom-anchored, but its total box becomes much taller and the controls are pushed upward.

## Fix

No navigation architecture was rebuilt.

- The raw WebKit value is preserved as `--pwa-safe-bottom-raw`.
- Normal Safari/browser behavior continues to use the raw safe-area value.
- Installed standalone PWA mode caps the effective bottom safe area at `34px`:
  - via `@media (display-mode: standalone)` for first-paint CSS;
  - via the existing `html.pwa-standalone` detection as a fallback.
- `.mobile-nav` remains a root-level `position:fixed; bottom:0` element.
- No `visualViewport`, keyboard-state, transform, `100dvh`, display-hide, or duplicate-nav workaround was added.

This is intentionally a narrow WebKit compatibility correction rather than another shell rewrite.

## Regression coverage

- Static PWA checks require the raw/effective safe-area split and standalone 34px cap.
- Visual PWA QA now simulates an inflated `92px` raw bottom safe area in standalone mode and requires:
  - effective nav height = `66 + 34px`;
  - bottom padding = `34px`;
  - CSS `bottom = 0px`;
  - one root-level nav only.

## Backend

No Supabase, RLS, Edge Function, booking, finance, inventory, campaign, or VA HOME changes.

## Real-device acceptance

This release must still be accepted on the physical iPhone installed PWA. Local/browser QA can verify the regression contract, but it cannot prove WebKit compositor behavior on the real device.

## QA completed

- Build/static: **301 PASS**.
- PWA static: **65 PASS**.
- PWA visual/runtime: **490 / 490 PASS**, including the new simulated `92px` inflated standalone safe-area regression at mobile 320 / 390 / 430.
- Rental / deposit / slot policy: **46 PASS**.
- Stabilization: **148 PASS**.
- Finance: **19 PASS**.
- Retention / campaigns: **15 PASS**.
- Session: **4 PASS**.
- UX: **18 PASS**.
- CSS architecture: **PASS**, admin remains at one authored `!important` (`.hidden`).
- Operational health: **PASS**.
- Backend inventory: **PASS**.
- Public booking resilience: **PASS**.
- Desktop density 1024 / 1280 / 1440: **60 / 60 PASS**.
- The long final-desktop Playwright suite was started twice but exceeded the local execution time budget after progressing through 1440 and most of 1280; it is therefore **not reported as a complete PASS**. This release changes only the `<=900px` mobile safe-area contract, and the dedicated desktop-density suite is green.

## Deployment status

This archive is packaged for GitHub/Pages upload. Production and the physical iPhone PWA have **not** been claimed as updated or accepted.
