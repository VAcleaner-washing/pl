# VAcleaner v4.1.16 / build 4116

Date: 2026-08-23

## Scope

Public online-booking UX clarity pass. No pricing, slot, deposit, promo, inventory or campaign logic was changed.

## Changes

- Removed the redundant client-facing `Хімія для Puzzi · 8 запечатаних порцій` explainer card from step 3.
- Kept the compact Puzzi chemistry rule in the order summary: 50 UAH per used portion.
- Rewrote Story bonus copy in plain language:
  - Puzzi below 1000 UAH: Story mention = first 2 used Puzzi chemistry portions are free.
  - Puzzi-containing rental from 1000 UAH: choose either 2 free portions or a VA HOME 50 ml diffuser.
  - Rental without Puzzi from 1000 UAH: VA HOME 50 ml diffuser.
  - HOME RESET keeps its included diffuser; Story mention adds 2 free Puzzi portions.
- Removed public wording `VA HOME Special Edition` and `fixed scent` explanations. Client-facing name is now `Аромадифузор VA HOME · 50 мл`.
- HOME RESET scent help link now opens the exact Entry collection: `https://vahome.com.ua/catalog?collection=entry`.
- Simplified the professional extras intro so clients immediately understand those products are optional, paid separately and stay with them.
- Simplified booking hero, product/date step descriptions and contact copy.
- Replaced `ПІБ` with the explicit `Прізвище, ім’я, по батькові` label.
- Clarified prepayment/deposit language in the booking summary and rental terms.
- Telegram username remains removed from public booking and admin/customer UX.

## Production backend

`vacleaner-story-bonus-v1` production Edge Function updated to version 2 and verified ACTIVE. Story diffuser persistence now uses the clear label `Сторіс-бонус · аромадифузор VA HOME · 50 мл`. Core `vacleaner-booking-v5` was not redeployed.

## QA

- `npm run check` — PASS, 340 file checks.
- `npm run test:booking-gifts` — PASS, 21/21.
- `npm run test:booking-gifts-visual` — PASS, 48/48 across 320, 390, 430, 768, 1024, 1280, 1650x760 and 1920 viewports.
- `npm run test:booking-extras` — PASS, 11/11.
- `npm run test:public-booking` — PASS.
- `npm run test:public-visual-contract` — PASS, 206/206.
- `npm run test:package-language` — PASS.
- `npm run test:desktop-final` — PASS, 319/319.

GitHub Actions is not claimed as PASS because this archive has not been pushed as a new commit/run.
