# VAcleaner v3.0.46 — PWA KEYBOARD NAV RECOVERY

Date: 2026-08-07
Build: 3046
Base: v3.0.45

## Change

- Fixes the iPhone standalone-PWA regression where the bottom navigation could remain elevated after the software keyboard was dismissed.
- Root cause: `html.keyboard-open .sidebar{display:none}` destroyed the fixed navigation compositor layer while iOS was animating the visual viewport. On restore, WebKit could recreate the fixed layer against the stale keyboard-sized viewport.
- The bottom navigation now stays mounted at `position: fixed; bottom: 0` and is hidden during keyboard mode only with `opacity:0; visibility:hidden; pointer-events:none`.
- No shell, safe-area, navigation geometry, business logic, backend, or Supabase changes.

## Regression contract

- Static gates reject `display:none` for the keyboard-state bottom navigation.
- PWA visual QA verifies that keyboard mode hides the navigation while its computed `display` stays mounted, `position` remains `fixed`, and `bottom` remains `0px`.
- After keyboard mode closes, the navigation must return to the exact viewport bottom.

## Backend

No Supabase / Edge Function / database changes.

## Verification

- `npm run check`: PASS — 278 file checks.
- `npm run test:stabilization`: PASS — 133 assertions.
- `npm run test:css-architecture`: PASS — 1 `!important` declaration (budget unchanged).
- `npm run test:deposit-policy`: PASS — 46 assertions.
- `npm run test:retention`: PASS — 15 checks.
- `npm run test:pwa`: PASS — 484 checks, including mounted fixed-layer keyboard recovery on 320/390/430.
- Desktop density QA: PASS — 60/60.
- Final desktop visual QA: PASS — 232/232.
- `npm run build`: PASS — 193 files / 4971 KiB.
