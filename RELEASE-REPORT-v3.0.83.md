# VAcleaner v3.0.83 — ANALYTICS MONTHLY TRACKING

- Liquid Glass remains the primary admin UI; Classic remains reserve.
- Removed the analytics-only fixed fade/strip visible while scrolling.
- Analytics periods: 7 days, 30 days, specific month, specific year, all time.
- Month selector includes calendar months from current month back to earliest booking month.
- Year selector includes years represented in booking history.
- Month/year comparisons use the previous calendar month/year.
- Push two-device control and black/gold favicon from v3.0.83 are preserved.
- Supabase schema/functions are not changed by this release.

## QA
- Static build check: PASS (349 file checks after final stamp/build).
- Rental/deposit/slot policy: PASS (46 assertions).
- Stabilization contract: PASS (159 assertions).
- Retention/campaign rules: PASS (18 checks).
- CSS architecture: PASS.
- Operational health contract: PASS.
- Liquid Glass QA: PASS at 320 / 390 / 430 px, including month selector and analytics strip removal.
- Installed PWA visual QA: 551/551 PASS after final analytics logic change.
- Desktop density: 60/60 PASS.
- Final desktop visual audit: 232/232 PASS.
- Full e2e smoke could not start in this local environment because localhost navigation was blocked by administrator policy (ERR_BLOCKED_BY_ADMINISTRATOR); this is environment-level, not an application assertion failure.

## Period semantics
- Current month uses month-to-date and compares against the same day span of the previous month.
- Past months use full calendar months and compare against the previous full calendar month.
- Current year uses year-to-date; past years use full calendar years.


## Premium canvas + scroll
- Liquid Glass primary admin background aligned to the public site dark/gold language.
- Removed the green ambient wash from the primary mobile canvas.
- Desktop scrollbars use a slim transparent-track gold thumb.
- iOS/mobile scroll remains native and visually hidden to avoid a browser-like rail.
- No business logic or Supabase changes.
