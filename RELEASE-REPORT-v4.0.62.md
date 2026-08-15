# VAcleaner v4.0.62 — TARGETED BOOKING UX & PUBLIC PACKAGE PARITY

## Scope
- Booking shows task-relevant professional chemistry after a product is selected, with an explicit “show all” control.
- Extras summary updates immediately from local checkbox state and lists selected item names when concise.
- Odour Zero is visually/copy-distinguished from Neutralix; Neutralix copy is unchanged.
- Booking conditions use a compact 3-step overview with expandable full financial/legal explanation.
- Header nav now distinguishes “Що почистити” from the interactive “Підбір за 30 сек”.
- Mobile HOME RESET route block is compacted to reduce scroll depth.
- Homepage package cards now use the same client-facing package titles as /komplekty/ and booking. Internal admin labels and legacy aliases remain untouched.
- Added payment flow: Заявка → Отримання → Повернення.

## Not changed
- Rental prices, deposit rules, delivery fee, slot logic, discounts, booking API contract, admin workflow, Supabase business tables.
- Redirects/301 rules were not changed in this release.

## Source note
Odour Zero wording reflects Kill Odor Plus positioning as a combined cleaner / odor eliminator for carpet/textile and hard surfaces; Neutralix retained the approved existing VAcleaner copy.

## QA
- `npm run check` — 319 file checks PASS.
- `npm run test:public-visual-contract` — 191/191 PASS after updating the intentionally changed canonical nav expectation.
- `npm run test:booking-cta` — 14/14 PASS.
- `npm run test:stabilization` — 171 assertions PASS.
- `npm run test:smart-guide-logic` — 13/13 PASS.
- `npm run test:smart-guide-fit` — 32/32 PASS.
- `npm run test:deposit-policy` — 46 assertions PASS.
- `npm run test:process-metadata` — 29 checks PASS.
- `npm run test:issue-workflow` — 12/12 PASS.
- `npm run test:public-seo` — 295/295 PASS.
- `npm run test:public-booking` — PASS.
- `npm run test:package-language`, `test:copy-integrity`, `test:css-architecture` — PASS.
