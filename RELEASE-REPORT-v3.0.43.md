# VAcleaner v3.0.43 — CAMPAIGNS DESKTOP CSS REPAIR

Date: 2026-08-07
Build: 3043
Base: v3.0.42

## Fixed

- Fixed desktop `Кампанії` view rendering as almost unstyled HTML.
- Root cause: the main `@media (max-width:900px)` block in `assets/admin-v250.css` was missing one closing `}`. As a result, global Campaigns styles were accidentally scoped to mobile only.
- Moved the global Campaigns rules before the single mobile layout contract, so desktop receives the base styles and mobile keeps its dedicated overrides.
- No PWA navigation, booking logic, finance logic, Supabase schema, Edge Functions, or production data were changed.

## Regression protection

`final_desktop_visual_qa.py` now asserts that the Campaigns view actually has:

- a flex desktop header;
- a 4-column KPI grid;
- a grid campaign row.

This prevents a screenshot-only pass where Campaigns is technically visible but visually unstyled.

## Verification

- `npm run check`: 277 checks PASS
- Stabilization: 130 assertions PASS
- Retention/campaign rules: 15 checks PASS
- CSS architecture: PASS, 1 `!important`
- Finance: 19 scenarios PASS
- Rental/deposit/slot policy: 46 assertions PASS
- Session: 4 scenarios PASS
- UX: 17 scenarios PASS
- Installed PWA visual QA: 481/481 PASS
- Desktop density QA: 60/60 PASS
- Final desktop visual audit: 232/232 PASS
- Pages build: 193 files / 4970 KiB

## Release boundary

Frontend/CSS + QA only. Supabase/backend unchanged.
