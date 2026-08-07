# VAcleaner v3.0.40 — DETAIL BACK + NAV ACTIVE STATE

Release date: 2026-08-07
Build: 3040
Base: v3.0.39

## Scope

This is a focused admin/PWA UI repair. No Supabase schema or Edge Function changes are included.

### 1. Booking detail navigation
- On mobile/PWA booking details, the `← До бронювань` row is now sticky.
- The return control remains visible while scrolling through long finance/history content.
- Returning to bookings still restores the previous booking-list scroll position.

### 2. Mobile bottom-nav active state
- `Аналітика` is now the only active bottom-nav item while the Analytics view is open.
- `Ще` is no longer highlighted together with Analytics.
- `Ще` is active only for destinations that actually live inside More: Equipment, Clients, Campaigns, Chemistry, Settings.

## Regression coverage

Final local gates after version stamp:
- `npm run check`: 271 file checks PASS
- Stabilization contract: 129 assertions PASS
- Rental/deposit/slot policy: 46 assertions PASS
- Finance: 19 scenarios PASS
- Session: 4 scenarios PASS
- UX: 17 scenarios PASS
- Retention/campaign rules: 15 checks PASS
- PWA static: 53 assertions PASS
- Installed-PWA/browser visual QA: 478 PASS / 0 FAIL
- Desktop density visual QA: 60 PASS / 0 FAIL
- Final desktop visual audit: 223 PASS / 0 FAIL
- Public booking resilience: PASS (19→19 mutation plateau; 409 stays in-page; no React-owned DOM mutation)
- CSS architecture: PASS; admin CSS contains 1 `!important`
- Production backend inventory static check: PASS
- Pages artifact build: 193 files / 4971 KiB

New runtime regression assertions explicitly verify:
- Analytics cannot highlight `Ще` at the same time.
- The detail back row uses sticky positioning on 320/390/430px PWA layouts.
- `← До бронювань` remains inside the visible viewport after scrolling to the bottom of a long booking detail.

## Deployment status

Local gates above are green. GitHub Actions / GitHub Pages deployment is **not claimed green until a new v3.0.40 run is actually observed after upload/push**.

## Backend

No backend deployment is part of v3.0.40. Existing production VAcleaner backend remains unchanged by this release.

## Security / packaging

Release ZIP excludes local build artifacts and visual test evidence (`dist`, `pwa-test-results`, `density-test-results`, `final-desktop-test-results`, generic `test-results`). No booking export/import text file or customer-data dump is included.
