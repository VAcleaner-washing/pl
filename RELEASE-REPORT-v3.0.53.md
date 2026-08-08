# VAcleaner v3.0.53 — STATIC PWA NAV ROOT

## Why this release exists

Real-device Safari/PWA screenshots showed the bottom navigation at the same vertical level in both modes. Safari simply covered the area below with browser chrome; standalone PWA exposed it as a black strip. This ruled out a simple `bottom:0` / safe-area spacing problem.

## Structural fix

VA HOME ships its mobile navigation in the initial HTML before JavaScript executes. VAcleaner still created `.mobile-nav` later inside `shell()` by replacing `document.body.innerHTML`.

v3.0.53 changes that contract:

- `#adminMount`, `.mobile-nav`, and `#layer` now exist in the initial admin HTML.
- `.mobile-nav` is a direct body-level root element before the first JS paint.
- `shell()` renders only the workspace into `#adminMount`.
- `auth()` renders only the login view into `#adminMount`.
- Runtime JavaScript no longer contains or creates another `.mobile-nav`.
- Before authentication the static nav remains laid out but invisible/noninteractive; after shell start it is revealed.
- This also prevents update/reload flows from briefly owning two independently-created bottom nav layers.

## Regression gates added/updated

- Initial admin HTML must contain the root mobile nav.
- Runtime must not contain/create another mobile nav.
- PWA visual QA now loads the real initial admin root structure instead of assuming JS creates the shell from an empty body.

## QA

- `npm run check`: 291 file checks PASS
- PWA static: 63 PASS
- PWA visual: 487/487 PASS
- Stabilization: 148 PASS
- Rental/deposit: 46 PASS
- Finance: 19 PASS
- Retention: 15 PASS
- CSS architecture: PASS
- Operational health: PASS
- Desktop density: 60/60 PASS
- Final desktop visual: 232/232 PASS

`npm run test:e2e` cannot complete in the current local execution environment because localhost navigation is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`. GitHub Actions remains the browser-E2E authority after upload.

## Backend

No Supabase/backend changes in this release.

## Real-device acceptance

The remaining acceptance test is the physical iPhone standalone PWA. Unlike earlier releases, this version changes the exact DOM timing difference that remained between VAcleaner and the working VA HOME implementation.
