# VAcleaner v3.0.41 — STABLE PWA BOTTOM NAV GRID

Release date: 2026-08-07
Build: 3041
Base: v3.0.40

## Scope

Focused installed-iPhone/PWA layout repair. No Supabase schema or Edge Function changes are included.

### 1. Stable installed-PWA bottom navigation
- The installed PWA no longer positions the bottom navigation as an independent `bottom: 0` overlay.
- Standalone mode now uses one intrinsic three-row shell: `topbar / scrollable main / bottom navigation`.
- The standalone shell uses the large viewport unit (`100lvh`) so transient iOS viewport changes cannot independently lift the navigation.
- Safari/mobile-browser keeps the existing browser-specific mobile layout contract; this change is scoped to installed standalone PWA.
- Keyboard mode still hides the navigation instead of pushing it upward.

### 2. Regression protection
- Installed-PWA QA now requires `.sidebar` to participate in the shell grid as a relative third row.
- QA checks the shell fills the viewport and the navigation returns to the exact bottom after keyboard close.
- QA checks content scroll and resize/refresh signals cannot make the navigation walk independently.

## Regression coverage

Final local gates after version stamp:
- `npm run check`: 275 file checks PASS
- Stabilization contract: 129 assertions PASS
- Rental/deposit/slot policy: 46 assertions PASS
- Finance: 19 scenarios PASS
- Session: 4 scenarios PASS
- UX: 17 scenarios PASS
- Retention/campaign rules: 15 checks PASS
- Installed-PWA/browser visual QA: 481 PASS / 0 FAIL
- Desktop density visual QA: 60 PASS / 0 FAIL
- Final desktop visual audit: 223 PASS / 0 FAIL
- Public booking resilience: PASS (19→19 mutation plateau; 409 stays in-page; no React-owned DOM mutation)
- CSS architecture: PASS; admin CSS contains 1 `!important`
- Pages artifact build: 193 files / 4972 KiB

## Deployment status

Local gates above are green. GitHub Actions / GitHub Pages deployment is **not claimed green until a new v3.0.41 run is actually observed after upload/push**.

## Backend

No backend deployment is part of v3.0.41. Production Supabase/Edge Functions remain unchanged by this release.

## Security / packaging

Release ZIP excludes local build artifacts and visual test evidence (`dist`, `pwa-test-results`, `density-test-results`, `final-desktop-test-results`, generic `test-results`). No booking export/import text file or customer-data dump is included.
