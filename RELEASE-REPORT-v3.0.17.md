# VAcleaner v3.0.17 — CI E2E HOTFIX

Дата: 2026-08-07  
База: v3.0.16 FINAL DESKTOP VISUAL AUDIT  
Build: 3017

## Причина релізу

GitHub Actions run `31148972021`, job `92774445363`, commit `7682c9b820de903c8df59b2d30695a76e355c006` зупинив Pages deployment на `Run desktop and mobile browser tests`.

Завантажений GitHub artifact `vacleaner-browser-test-results` підтвердив 4 невдалі E2E-перевірки. Візуальні артефакти показали, що продукт у цих місцях був коректним; дефекти були в самих тестових припущеннях/селекторах.

## Виправлено

### 1. Weekend deposit false negative

UI фактично показував `2 000 грн`, що видно на GitHub `public-desktop.png`.
`Intl.NumberFormat('uk-UA')` використовує Unicode whitespace, а тест шукав ASCII-пробіл.

В E2E додано `normalized_text()`, який нормалізує всі Unicode-пробіли перед порівнянням.

### 2. Mobile hero stale threshold

Після mobile conversion pass актуальний mobile hero свідомо має іншу геометрію, але E2E зберіг старий поріг `<=560px`.
GitHub `home-mobile.png` показує коректний, не обрізаний hero.

Перевірка тепер прив'язана до viewport і дозволяє максимум `min(700px, 85vh)`.
Це все ще блокує реально роздутий hero, але не карає актуальний дизайн.

### 3. Native select false negative

Headless Linux Chromium не є надійним джерелом кольору OS-rendered `<option>` popup.
У продукті вже є `color-scheme: dark` і явні CSS rules для `.field select option`.

E2E тепер перевіряє:
- `appearance:none`;
- `color-scheme:dark`;
- наявність явного темного CSS-контракту для option.

### 4. Strict mode ambiguous modal close

`locator('[data-close]')` знаходив дві валідні кнопки:
- `×` у header;
- `Скасувати` у footer.

Тест тепер клікає точний селектор:
`#bookingForm header [data-close]`.

## Захист від повторення

`npm run check` тепер додатково блокує збірку, якщо:
- зникнуть E2E helpers для Unicode/text/select checks;
- повернеться generic `page.locator("[data-close]").click()`;
- зникне конкретний modal-close selector.

## Продуктові зміни

Немає.

- Візуал v3.0.16 не змінено.
- Фінансову логіку не змінено.
- Supabase/Edge Functions не змінено.
- PWA UX не змінено, окрім стандартного bump cache/version до build 3017.

## Перевірки локально

- `python -m py_compile scripts/e2e_smoke.py` — PASS
- `npm run stamp` — PASS
- `npm run check` — PASS
- `npm run build` — PASS
- Finance — 15/15
- Session — 4/4
- UX — 17/17
- Backend inventory — PASS
- Installed-PWA visual QA — 156/156
- Desktop density QA — 54/54
- Final desktop visual audit — 202/202

Новий повний `npm run test:e2e` має бути підтверджений наступним GitHub Actions run на hosted Chromium. Локальний системний Chromium у робочому середовищі блокує navigation policy, тому цей результат не підмінюється локальною заявою.
