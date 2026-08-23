# VAcleaner v4.1.10 / build 4110

Release label: **BOOKING UX + STORY BONUS CI FIX**  
Date: **2026-08-23**

## Scope

This release focuses on the booking flow UX around Puzzi chemistry and Stories rewards, and fixes the CI regression that broke the browser test run after the Stories bonus UI was moved.

## What changed

- Step 3 in public booking is reframed as **“Отримання та бонуси”** so the customer better understands that this part is about delivery, base consumables and available rewards.
- The **Puzzi chemistry** block is now more self-explanatory. It explicitly shows that the 8 sealed portions are issued **automatically**, not as a paid extra the customer has to add manually.
- A short helper note was added so the customer immediately understands the logic: this block explains the base Puzzi consumables, while optional extras remain below as separate paid items.
- The Stories reward UX remains explicit and separate, so customers can clearly choose the reward without confusing it with the standard Puzzi chemistry block.

## CI / test fix

- The failing browser smoke test still looked for the Stories checkbox inside `.booking-chemistry`, but the UX had already moved that control into the dedicated `.booking-story-toggle` block.
- `scripts/e2e_smoke.py` now targets the real Stories toggle first and keeps the old chemistry selector as a fallback, which makes the suite resilient to both layouts and removes the false failure.

## Verification

- `npm run stamp` — PASS
- `npm run check` — **340 file checks PASS**
- `npm run test:booking-gifts` — **12/12 PASS**
- `npm run test:booking-extras` — **11/11 PASS**
- `npm run test:booking-cta` — **14/14 PASS**

A direct local run of the full Playwright smoke browser script could not be fully validated in this container because Chromium navigation was blocked by the environment (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). The selector regression itself is fixed in source.

## Release state

- Frontend archive in this package: **4.1.10 / 4110**
- This archive is prepared locally and is **not claimed live**.
