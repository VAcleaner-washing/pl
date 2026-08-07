# VAcleaner v3.0.42 — VA HOME FIXED PWA NAV

Date: 2026-08-07
Build: 3042

## Scope

Minimal PWA bottom-navigation repair based on the already stable VA HOME admin mobile navigation contract. No Supabase/backend changes.

## Root cause

The mobile `.sidebar` rule correctly set `position: fixed`, but a later shared rule `.topbar,.sidebar,.main{position:absolute}` overrode it. Previous standalone-specific grid/viewport fixes were compensating for that override instead of removing it.

## Change

- Removed `.sidebar` from the later absolute-position rule: `.topbar,.main{position:absolute}`.
- Removed the v3.0.41 standalone three-row/grid override.
- Bottom navigation now uses one simple viewport contract: fixed + bottom: 0 + safe-area padding.
- Preserved v3.0.40/v3.0.41 functional fixes outside bottom-navigation geometry.

## Verification

- Computed standalone PWA style: `.app` = fixed, `.sidebar` = fixed.
- 390x844 check: sidebar bottom = 844px exactly.
- npm run check: 276 checks PASS.
- Stabilization: 130 PASS.
- PWA static: 54 PASS.
- Rental/deposit/slot: 46 PASS.
- Retention/campaigns: 15 PASS.
- CSS architecture: PASS, 1 !important.
- Installed-PWA/browser visual QA: 481/481 PASS.
- Desktop density: 60/60 PASS.
- Final desktop: 223/223 PASS.
- Pages build: 193 files / 4970 KiB.

## Backend

No Supabase schema, data, RLS or Edge Function changes.
