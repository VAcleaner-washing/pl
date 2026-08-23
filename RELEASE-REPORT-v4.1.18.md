# VAcleaner v4.1.18 / build 4118

## Scope
Public booking deposit summary regression fix.

## Root cause
The public booking UI had two deposit renderers. One legacy renderer still identified the selected product from visible marketing copy. The current client-facing package name `Дивани + кухня та ванна` no longer matched the stale `Текстиль + кухня та ванна / Комбо` selector, so the renderer resolved no product and overwrote the correct deposit with `—`.

## Fix
- `assets/public-booking-slots.js`: selected product now resolves from stable `data-product-code` first; copy matching remains fallback only.
- `assets/public-experience.js`: same stable product identity rule.
- Current public labels were retained as fallback aliases, but financial logic no longer depends on them.
- Added regression guards to `scripts/test-deposit-policy.mjs` so a future marketing rename cannot silently remove the deposit from booking summary.

## Expected deposit result
For `combo` / `Дивани + кухня та ванна` on a normal one-day rental, the deposit group is `twoUnits`, therefore the summary must show `1 500 грн`. Full-weekend deposit remains `3 000 грн` under the existing rules.

## Verification
- `npm run test:deposit-policy` — PASS, 50 assertions.
- Browser DOM regression for `data-product-code="combo"` with intentionally unrelated visible title — PASS, rendered `1 500 грн`.
- `npm run check` — PASS, 340 file checks.
- `npm run test:public-visual-contract` — PASS, 206/206.
- `npm run test:booking-extras` — PASS, 11 checks.
- `npm run test:booking-gifts` — PASS, 21/21.
- `npm run test:public-booking` — PASS.
- `npm run test:growth-visual` — PASS, 135/135.
- `npm run build` — PASS, Pages artifact prepared.

## Not claimed
`test:desktop-final` was started but did not finish within the execution time limit. This release changes public booking JavaScript identity resolution only and does not change admin layout/CSS; no PASS is claimed for that incomplete run.

## Backend
No Supabase/database/backend changes were required. Existing deposit settings and backend deposit groups remain unchanged.
