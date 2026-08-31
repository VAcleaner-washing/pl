# VAcleaner v4.2.42 — PROMO VISIBILITY UX

## Scope
- Public booking promo control redesigned as a visible full-width secondary action.
- Existing promo validation/pricing logic is unchanged.
- Public assets are cache-busted to build 4242.

## QA
- `npm run qa:static` → TOTAL 100 / PASS 100 / FAIL 0 / FULL QA GREEN.
- `npm run test:v4.2.42-promo-visibility` → 9/9 PASS.
- Computed-style visual check: 1440px = 900×60px promo row; 390px = 358×58px promo row.

## Release rule
Deploy only after GitHub Actions Static/build and Browser QA aggregate gates are green.


### Delivery card alignment correction
- Mobile/desktop booking card: `Доставка` / `Самовивіз` is the left label, delivery fee is a dedicated right-aligned value.
- Route/address stays below and is no longer concatenated with the fee.
- PWA browser QA now asserts the right-aligned 250 грн axis and the separate address row.
