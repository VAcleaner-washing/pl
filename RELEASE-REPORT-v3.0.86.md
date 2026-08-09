# VAcleaner v3.0.86 — SMART CLEANING GUIDE

- Added adaptive public Smart Guide / cleaning quiz on the home page.
- Quiz recommends equipment and exact chemistry based on task, contamination and surface safety.
- Urine smell prioritizes Neutralix; stains recommend Carp-Deta.
- Kitchen, bathroom and window branches distinguish daily dirt, fresh grease, carbon, scale, rust and surface restrictions.
- Quiz result can open booking with the recommended product and extras preselected.
- Added temporary lifestyle image before the quiz; image is intentionally replaceable later.
- Neutralix corrected to 250 ml / 200 UAH in shared catalog fallback; production vacleaner_settings catalog also updated to 200 UAH.
- Existing v3.0.85 booking copy and 2-manager live sync retained.

## QA
- `npm run check`: PASS (340 file checks after final patch).
- Rental/deposit/slot policy: PASS (46 assertions).
- Stabilization contract: PASS (159 assertions).
- PWA QA: PASS (551/551).
- Glass V4 mobile QA: PASS at 320 / 390 / 430 px.
- Desktop final QA: PASS (232/232 at 1024 / 1280 / 1440 px).
- Smart Guide runtime smoke: PASS at 390 and 1440 px; urine + stain resolves to Puzzi + Neutralix + Carp-Deta and builds booking preset URL.
- Smart Guide booking preset smoke: PASS; product and both extras are programmatically selectable from quiz parameters.
