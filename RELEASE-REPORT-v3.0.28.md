# VAcleaner v3.0.28 — ADMIN SCROLL + PWA DETAIL VISUAL REPAIR

Version: **3.0.28**  
Build: **3028**  
Date: **2026-08-07**

## Trigger
Visual audit from production screenshots after v3.0.27 exposed three remaining layout regressions:
1. Desktop scrollbar could visually disappear under the fixed topbar / “Нове бронювання” area, and view switching could feel as if a previous scroll position survived.
2. Single-equipment photography in PWA cards cropped too high, leaving the actual machine close to the lower edge of the frame.
3. Mobile booking detail retained desktop geometry: the “Хід бронювання” timeline overflowed/smashed labels, hero photography could overlap the rental period, and the large sticky detail header covered finance/history while scrolling.

Additional screenshot review showed cramped audit-history change tiles and wrapping in the detail header booking code/back control.

## Scroll architecture repair
- Desktop now has one authoritative vertical scroll owner: `.main`.
- `html`, `body`, and `.app` are locked on desktop; `.main` is fixed strictly between the topbar and viewport bottom.
- Desktop scrollbar track therefore starts **below** the fixed topbar instead of running underneath it.
- `.main` uses `overflow-anchor:none` so DOM replacement cannot resurrect a previous view position through browser scroll anchoring.
- `resetViewScroll()` now performs immediate, microtask, animation-frame and delayed zeroing of both main and document scroll state.
- Booking filters and every admin navigation route continue to call the same reset contract.

## PWA equipment photography
- Equipment image containers now carry a product-specific class.
- Single-equipment PWA cards use a deeper vertical focal point (roughly 67–70%) so Puzzi, SC 2 and ABIR are visibly centered in the crop.
- Single-equipment image viewport increased to 210–240 px on mobile for a clearer product presentation.
- Multi-equipment kit collage behaviour remains unchanged.

## Booking detail mobile repair
- Mobile detail top bar is no longer sticky, so it cannot cover finance/history content while scrolling.
- Back control, booking code and creation date are kept in one compact row without two-line wrapping.
- Hero layout is stacked on mobile: product/status → rental dates → product photography.
- Product photography is no longer absolutely positioned and cannot cover `1 доба` or rental dates.
- “Хід бронювання” is a true one-column section with a four-column contained timeline beneath the heading.
- Step labels use the shorter status wording `Підтверджено` and are allowed to wrap inside their own equal-width cells.
- Mobile audit-history changes collapse to one column to prevent cramped before/after tiles.

## Regression gates added
Runtime PWA QA now explicitly checks:
- desktop `.main` is the sole scroll owner;
- desktop scrollbar begins at the bottom edge of the topbar;
- every desktop view opens at `scrollTop = 0` after switching;
- single-equipment images use the intended vertical focal point and useful image height;
- detail header is non-sticky on mobile;
- detail back/code stay in one compact row;
- all four progress stages remain inside the progress card;
- hero media starts below the rental-period block.

## QA result
- Static build checks: **268 PASS**
- Rental/deposit/slot policy: **46 PASS**
- Finance: **19 PASS**
- Stabilization: **98 PASS**
- Session: **4 PASS**
- UX: **17 PASS**
- PWA static: **48 PASS**
- PWA/browser visual: **385 PASS**
- Desktop density: **60 PASS**
- Final desktop visual audit: **205 PASS**
- Backend inventory: **PASS**
- Pages build: **193 files / 4930 KiB**

## Backend
No Supabase schema or Edge Function change is required in v3.0.28. Production backend state from v3.0.27 remains authoritative.
