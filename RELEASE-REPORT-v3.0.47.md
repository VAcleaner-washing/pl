# VAcleaner v3.0.47 — PWA KEYBOARD VIEWPORT LATCH

Release date: 2026-08-08  
Build: 3047

## Scope

This is a narrow PWA stability release based on v3.0.46. No business rules, Supabase schema, Edge Functions, pricing, inventory, campaigns, booking workflow, or desktop navigation were changed.

## Root cause fixed

On iPhone standalone PWA, `focusout` happens before the software keyboard has fully finished closing. The previous runtime defined keyboard state as:

- visual viewport is reduced; **and**
- an input is still focused.

That meant the moment the field blurred, `keyboard-open` could be cleared while `visualViewport.height` was still reduced by the keyboard. The fixed bottom navigation became visible during that transition and WebKit could retain its compositor position at the old, keyboard-sized viewport, leaving the bottom navigation visibly raised after the keyboard finished closing.

## Fix

`assets/admin-v250.js` now uses a small keyboard latch:

- while an input is focused and the visual viewport is reduced, `pwaKeyboardLatched = true`;
- after blur, the keyboard state remains active while the visual viewport is still reduced;
- the latch clears only when the visual viewport has actually returned to full height;
- the bottom navigation therefore cannot reappear in the middle of the iOS keyboard-close animation.

The v3.0.46 compositor fix remains in place: the bottom nav is hidden during keyboard mode with opacity/visibility/pointer-events and is never removed with `display:none`.

## Regression gates added

Static release gates now require the keyboard latch implementation and reject a return to the old `focused && reducedViewport`-only state.

The existing visual regression continues to verify that the fixed nav returns to exact viewport bottom after keyboard close on 320, 390, and 430 px mobile widths.

## QA results

- Build/static release checks: **280 passed**
- Rental/deposit/slot policy: **46/46**
- Stabilization contract: **136/136**
- CSS architecture: **PASS** — 1 `!important` in admin CSS
- Operational health: **PASS**
- Retention/campaign rules: **15/15**
- Public booking resilience: **PASS**
- Finance: **19/19**
- Session: **4/4**
- UX: **17/17**
- PWA static: **56/56**
- Installed-PWA/browser visual QA: **484/484**
  - mobile 320: 142 passed
  - mobile 390: 141 passed
  - mobile 430: 141 passed
  - tablet / landscape / auth / public / desktop supplemental: 60 passed
- Desktop density visual QA: **60/60**
- Final desktop visual audit: **232/232**
  - 1440: 77 passed
  - 1280: 77 passed
  - 1024: 78 passed
- Desktop density guard: **PASS**
- Backend inventory consistency: **PASS**
- Pages build: **193 files / 4971 KiB**

## Local E2E note

The ordinary localhost E2E browser suite is not counted as a product failure because this execution environment blocks navigation to `http://127.0.0.1:4173` with `ERR_BLOCKED_BY_ADMINISTRATOR`. This is the same environment limitation seen in prior releases. GitHub Actions remains authoritative for the repository E2E run after upload.

## Production impact

None before GitHub deployment. No Supabase or Edge Function deployment was performed for v3.0.47.

## Files intentionally excluded from release ZIP

- `dist/`
- local `test-results/`
- Python caches
- temporary QA artifacts/logs
- `.git/`

