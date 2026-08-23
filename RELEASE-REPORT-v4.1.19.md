# VAcleaner v4.1.19 / build 4119

## Scope
Make the 30-second Smart Guide an explicit part of `/yak-tse-pratsiuie/` instead of leaving it only in global navigation/footer.

## Root cause
The page said `Отримуєте точний підбір`, but the main service flow did not explain that VAcleaner has a self-service Smart Guide at `/pidbir/` and did not provide a contextual CTA. A new visitor could reasonably interpret “підбір” as manager-only assistance.

## Fix
- Added a compact Smart Guide card directly inside the process manifesto:
  - `Не знаєте, що саме обрати?`
  - `Підбір за 30 секунд`
  - explains that the site proposes equipment, a package and needed products from a few short answers;
  - direct CTA `Підібрати рішення →` to `/pidbir/`.
- Added the card to server-rendered `/yak-tse-pratsiuie/index.html` through `scripts/sync-static-copy.mjs`.
- Added a runtime guard in `assets/public-experience.js` so the card is restored after hydration/client navigation if the historical Next RSC payload omits it.
- Added responsive styles for desktop/tablet/mobile without changing the existing process grid.
- Added growth-content regression assertions for the visible Smart Guide bridge and `/pidbir/` link.

## Verification
- `npm run check` — PASS, 340 file checks.
- `npm run test:growth-content` — PASS.
- `npm run test:public-visual-contract` — PASS, 206/206.
- `python scripts/test-public-inner-heroes.py` — PASS, 259/259.
- `npm run test:growth-visual` — PASS, 135/135.
- Targeted browser render of `/yak-tse-pratsiuie/`:
  - 1280×800 — Smart Guide card visible, no horizontal overflow;
  - 390×844 — card stacks cleanly and CTA uses full mobile width.
- `npm run build` — PASS, Pages artifact prepared.

## Backend
No Supabase/database/backend changes.
