# VAcleaner v3.0.36 — PWA BOTTOM NAV PIN

Release date: 2026-08-07  
Build: 3036

## Scope

This is a focused PWA shell repair based on v3.0.35. No business logic, campaign logic, database schema, or Supabase Edge Function is changed.

### PWA bottom navigation
- Fixed the large black gap below the installed-PWA bottom navigation seen on a real iPhone.
- Root cause: v3.0.35 changed the whole `.app` shell to `position:absolute`; iOS standalone can size that absolute containing block shorter than the physical screen.
- New contract: `.app` is `position:fixed` and owns the full physical viewport; `.topbar`, `.main`, and `.sidebar` are `position:absolute` inside that shell.
- The bottom navigation stays `bottom:0` inside the fixed shell, while `env(safe-area-inset-bottom)` remains padding inside the navigation itself.
- Keyboard handling remains explicit: only a focused editable control may enter `keyboard-open` mode.

## Regression protection
- Static PWA test now requires a fixed viewport shell plus absolute app chrome.
- Build gate fails if this physical-viewport shell contract disappears.
- Installed-PWA visual QA checks shell and navigation geometry independently, including refresh/resize without keyboard.

## Verification
- Static/build gate: 267 checks PASS.
- PWA static: 50 PASS.
- Stabilization architecture: 117 PASS.
- CSS architecture: PASS; admin CSS remains at 1 `!important` declaration.
- Installed PWA/browser visual QA: 454 PASS / 0 FAIL.
- Pages build: 193 files / 4966 KiB.

## Production backend
Unchanged from v3.0.35. No Supabase deployment is required for this release. VA HOME is untouched.
