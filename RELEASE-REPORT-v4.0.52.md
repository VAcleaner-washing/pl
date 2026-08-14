# VAcleaner v4.0.52 — PUBLIC PACKAGE CATALOG PARITY

Released: 2026-08-14
Build: 4052

## Scope

Client-facing package naming/catalog parity between `/komplekty/` and `/bronuvannia/`.
Admin operational labels remain unchanged.

## Changes

- Added `Текстиль + вікна` to the public `/komplekty/` catalogue.
- Public package catalogue is now six cards, matching the six package choices available in booking:
  - Глибоке очищення текстилю
  - Текстиль + вікна
  - Текстиль + кухня та ванна
  - Генеральне прибирання
  - Ідеальні вікна
  - HOME RESET
- `/bronuvannia/` server HTML now includes `Текстиль + вікна`, matching the hydrated booking chunk and avoiding first-paint/hydration catalogue drift.
- Legacy public title `Комбо` is replaced by `Текстиль + кухня та ванна` in client-facing surfaces.
- `/komplekty/` structured data now exposes the same six canonical package offers and no longer publishes `Комбо · Puzzi + SC 2`.
- Added runtime `syncPackageCatalog()` guard so a Next/RSC soft navigation cannot restore a five-card catalogue.
- Admin operational labels remain unchanged (`Puzzi + Jimmy`, `Puzzi + робот`, `Puzzi + SC 2`, `Puzzi + SC 2 + Jimmy`, `SC 2 + робот`, `HOME RESET`).
- Added regression coverage for 3×2 package catalogue completeness and booking/package name parity.
- Google verification file remains in the site root: `google23d85db681a5b7ee.html`.

## QA

- `npm run stamp` — PASS, including a second consecutive stamp (idempotence)
- `npm run check` — 318 file checks PASS
- `npm run test:package-language` — PASS
- `npm run test:copy-integrity` — PASS
- `npm run test:delivery-settings` — 14 PASS
- `npm run test:deposit-policy` — 46 PASS
- `npm run test:stabilization` — 171 PASS
- `npm run test:booking-cta` — 14 PASS
- `npm run test:process-metadata` — 29 PASS
- `npm run test:issue-workflow` — 12 PASS
- `npm run test:public-seo` — 295 PASS
- `npm run test:public-visual-contract` — 178 PASS
- `npm run test:smart-guide-logic` — 13 PASS
- `npm run test:retention` — 23 PASS
- `npm run check:backend` — PASS
- `npm run build` — Pages artifact built: 204 files

## Browser verification limitation

A direct local Chromium navigation to `127.0.0.1` is blocked by the execution environment with `ERR_BLOCKED_BY_ADMINISTRATOR`, so this report does not claim a local Playwright visual PASS. The exact public catalogue structure is protected by static/runtime regression tests and should be confirmed by GitHub Actions/browser QA after upload.

## Production

Not verified in this local release. Confirm after GitHub deployment via `release.json` and GitHub Actions.
