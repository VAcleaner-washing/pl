# VAcleaner v4.0.19 — PUZZI SEO LANDING & SEARCH ICON HARDENING

## Зміни
- Додано `/tekhnika/karcher-puzzi-8-1/` — окрему SEO-посадкову сторінку під device-intent у Полтаві.
- Сторінка містить актуальні тарифи, 8 порцій хімії, stories-бонус, залоговий платіж, доставку, слоти, процес, результати й FAQ.
- Додано Service + Offer, FAQPage, BreadcrumbList і LocalBusiness JSON-LD.
- Додано внутрішній перехід між `/rishennia/textile/` і сторінкою Puzzi.
- Сторінку додано в sitemap.xml.
- Favicon URL у public/static HTML переведено зі старого `?v=3081` на стабільні `/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png`.
- Додано Google Search Console verification file `google23d85db681a5b7ee.html` у корінь релізу.

## Бізнес-логіка
Не змінювалась. Бронювання, ціни, залог, фінанси, Supabase та PWA-адмінка не перебудовувались.

## Production
Локальний реліз. Production підтверджувати тільки після GitHub Actions і `/release.json = 4.0.19`.

## QA
- `npm run check` — 298 file checks PASS у чистому release tree.
- Public visual contract — 150 PASS, включно з новою `/tekhnika/karcher-puzzi-8-1/`.
- Окремий Chromium geometry QA нової сторінки — 7/7 PASS: 320 / 390 / 430 / 768 / 1024 / 1280 / 1440; horizontal overflow відсутній, mobile menu та CTA працездатні.
- Rental/deposit/slots — 46 PASS.
- Finance — 23 PASS.
- Stabilization — 159 PASS.
- Booking CTA — 14 PASS.
- Process metadata / push — 29 PASS.
- Issue-payment workflow — 12 PASS.
- Retention/campaign — 18 PASS.
- CSS architecture — PASS.
- Operational health contract — PASS.
- Pages artifact — 216 files; `release.json`, Puzzi landing і Google verification file включені.
- Повний PWA visual runner локально не завершився в межах execution-timeout; до timeout усі виведені перевірки були PASS. Бізнес-логіка й admin runtime у цьому релізі не змінювались.
