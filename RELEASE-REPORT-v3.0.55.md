# VAcleaner v3.0.55 — IOS PWA STATUS BAR VIEWPORT FIX

Release date: 2026-08-08  
Build: 3055  
Base: VAcleaner v3.0.54 — IOS STANDALONE SAFE-AREA FIX

## Real-device evidence

The physical iPhone screenshot after v3.0.54 is pixel-identical in bottom-nav geometry to v3.0.53. This proves the standalone 34px CSS clamp did not affect the real rendering and must not be treated as the root fix.

The rendered navigation box is visibly much taller than its 66px base height, with the controls remaining near the top and a large blank region below. The DOM remains a single body-level fixed navigation.

## Root cause addressed

The admin PWA entry HTML used the legacy iOS mode:

`apple-mobile-web-app-status-bar-style=black-translucent`

Together with `viewport-fit=cover`, this mode is involved in documented WebKit installed-web-app viewport/safe-area positioning bugs. The previous CSS clamp tried to compensate for the symptom while leaving this viewport mode unchanged.

## Changes

- Admin PWA entry points now use opaque `black` status-bar mode instead of `black-translucent`.
- `viewport-fit=cover` remains enabled.
- The failed v3.0.54 `--pwa-safe-bottom-raw` / 34px clamp is removed instead of being layered with another override.
- Mobile navigation remains one root-level sibling with `position:fixed; bottom:0`.
- No `visualViewport`, keyboard-state, transform, `100dvh`, duplicate-nav, business-rule, Supabase-schema or VA HOME changes were added.

## Regression gates

- Admin PWA HTML must contain opaque `apple-mobile-web-app-status-bar-style=black`.
- Admin PWA HTML must not contain `black-translucent`.
- CSS must use the native `env(safe-area-inset-bottom)` contract and must not contain the failed v3.0.54 clamp.
- Existing root-nav, keyboard, safe-area, mobile, finance, rental/deposit, session and desktop gates remain active.

## Real-device acceptance

Production is not considered fixed until this build is deployed and the installed PWA is checked on the physical iPhone.

## QA completed

- Build/static: **292 PASS**.
- PWA static: **64 PASS**.
- PWA visual/runtime: **487 / 487 PASS** in split runs:
  - mobile 320 + 390: **285 PASS**;
  - mobile 430: **142 PASS**;
  - tablet / landscape / auth / public date / nearest availability / desktop: **60 PASS**.
- Rental / deposit / slot policy: **46 PASS**.
- Stabilization: **148 PASS**.
- Finance: **19 PASS**.
- Session: **4 PASS**.
- Retention / campaigns: **15 PASS**.
- UX: **18 PASS**.
- CSS architecture: **PASS**, admin remains at one authored `!important` declaration.
- Operational health: **PASS**.
- Backend inventory: **PASS**.
- Desktop density 1024 / 1280 / 1440: **60 / 60 PASS**.

The monolithic PWA run exceeded the local execution time while progressing through the 430px suite, so the same suite was completed in split runs. No failed PWA assertion remains.

## Deployment status

This archive is packaged for GitHub/Pages upload. Production and the physical iPhone PWA are not claimed as fixed until the new build is deployed and checked on the real device.
