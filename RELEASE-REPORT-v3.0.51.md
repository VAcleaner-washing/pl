# VAcleaner v3.0.51 — iOS Root Viewport + Clean Mobile UX

Release date: 2026-08-08
Build: 3051
Base: VAcleaner v3.0.50

## Why this release exists

Real-device iPhone/PWA evidence showed that the bottom navigation could remain visually above the physical bottom of the screen even though `.mobile-nav` itself had `position: fixed; bottom: 0`.

The remaining architectural difference from the stable VA HOME PWA was above the navigation: VAcleaner locked the mobile root (`html/body`) with `overflow:hidden`. The navigation fixes were therefore operating on the fixed element while iOS could still leave the root/layout viewport visually panned after keyboard/viewport transitions.

## Changes

- Mobile dashboard root is no longer locked with `overflow:hidden`.
- `html/body/.app` use an unlocked root contract on <=900px; `.main` remains the dedicated fixed scroll owner.
- Bottom navigation remains a body-level root sibling with `position:fixed; bottom:0`, not a repurposed desktop sidebar.
- No keyboard state changes, hides, recreates, translates, or repositions the mobile nav.
- Mobile nav SVG descendants explicitly use `fill:none; stroke:currentColor` for Safari/iPhone consistency.
- `Ще` remains the compact two-column VA HOME-style popover with six secondary sections.
- Removed legacy `.mobile-more-sheet` / `.mobile-more-card` CSS.
- Browser E2E now targets `.mobile-more-menu:visible` and verifies all six secondary sections.
- Dedicated `vacleaner-status-correction-v1` remains the single frontend/backend path for manual booking status correction; duplicate `correct_status` implementation was removed from `vacleaner-admin-bookings-v3` release source.
- HOME RESET gift messaging remains present: any VA HOME Entry Collection diffuser is included as a gift.
- Public CTA decorative orbit remains non-interactive (`pointer-events:none`) so CTA buttons receive taps/clicks.
- Fixed an unrelated real CSS regression where `.modal-form .close` was accidentally grouped with `.date-control`, causing the desktop close button to receive date-field geometry.
- Added iOS/PWA metadata for the admin standalone shell.

## Backend

No new production backend deployment is required by this archive.

The previously deployed `vacleaner-status-correction-v1` v1 is the intended status-correction endpoint. VA HOME backend/tables/policies/functions are not modified by this release.

## QA completed locally

- Static/build checks: 360 PASS
- Rental / deposit / slot policy: 46 PASS
- Stabilization contract: 147 PASS
- Retention / campaigns: 15 PASS
- UX: 17 PASS
- Session: 4 PASS
- Finance: 19 PASS
- Backend inventory: PASS
- CSS architecture: PASS (admin remains at 1 `!important` declaration)
- Operational health contract: PASS
- Installed-PWA visual QA: 487/487 PASS
- Desktop density: 60/60 PASS
- Final desktop visual audit: 232/232 PASS
- Public booking resilience: PASS
- Python QA scripts compile successfully

## Local E2E limitation

`npm run test:e2e` cannot navigate to the local HTTP test server in the current execution environment and stops at `ERR_BLOCKED_BY_ADMINISTRATOR`. This is an environment restriction, not reported as a product PASS. GitHub Actions must run the browser E2E after the archive is committed.

## Real-device acceptance

The iPhone installed PWA is the final authority for the original bottom-nav issue. v3.0.51 changes the root viewport/scroll contract rather than adding another navigation recovery hack. Do not call the real-device issue closed until it is verified after deployment on the user's iPhone.
