# VAcleaner v4.0.8 — full-site visual audit

Дата: 2026-08-09
База: v4.0.7.

Цей реліз не називає статичні unit-checks «повним візуальним аудитом». Перевірка складалась із: порівняння збережених рендерів public-сторінок на 390/768/1024/1440 px, ручного розбору DOM/CSS/React chunks, посилення browser E2E у GitHub Actions і статичних regression-contracts для повторюваних компонентів.

## Конкретні дефекти, знайдені після v4.0.7

1. **GitHub Actions падав на mobile booking stepper.** Причина — v4.0.7 заборонив переходи по верхньому степперу вперед. Відгуки/футер мають бути ізольовані від wizard, але самі 4 кнопки прогресу мають перемикати екрани. Відновлено перемикання без повернення старого наскрізного скролу сторінки.
2. **`/pidbir/` міг бути порожнім чорним екраном при повільному/відключеному JS.** HTML вже мав клас standalone, а CSS ховав fallback до фактичного mount квіза. Тепер fallback ховається лише після `.vq-ready`.
3. **`/dostavka/` на ~1024 px обрізав довгий hero-заголовок справа.** Для 901–1180 px додано безпечнішу editorial grid-геометрію; вона одночасно прибирає надмірно вузькі праві заголовки на інших внутрішніх сторінках.
4. **Світлі service cards на `/dostavka/` успадковували світлий текст.** На cream-блоці заголовки ставали майже невидимими. `.v4-service-grid` тепер явно задає темний текст.
5. **Мобільний fixed-summary бронювання обрізав підказку про залоговий платіж через `…`.** Копію скорочено без втрати змісту: `Залоговий платіж — після вибору дат` / `Залоговий платіж: N грн`.
6. **Однакова CTA шапки мала різні URL.** Частина сторінок використовувала `/bronuvannia`, частина `/bronuvannia/`. Нормалізовано до одного URL, щоб уникати зайвого redirect і component drift.
7. **React hydration міг повертати старий футер.** У referenced chunks ще були `Рішення / Процес / Умови сервісу` і старі URL. Патчено самі hydrated chunks, а не лише post-render JS.
8. **Історичний генератор `scripts/make_v400.py` міг знову повернути старі CSS/JS-проблеми.** Генератор синхронізовано з актуальними `site-v400.css/js`: без delayed patch timers, без runtime nav rewrite, з guard для quiz footer, з новим contrast/grid hardening.
9. **Structured data ще містило старий діапазон `350–3500 UAH`.** Нормалізовано до актуального `500–3500 UAH`; видимі картки товарів цим масово не переписувались.
10. **Admin-regression coverage була слабка саме для client-card і customer/deposit state.** Додані контракти: desktop client-card має структурований Liquid Glass layout, mobile client-card не перекривається desktop fix, edit-mode не показує `Новий клієнт` до customer lookup, а stored deposit snapshot використовується як джерело при редагуванні.

## Перевірені повторювані компоненти

- Public header: однакова desktop nav, CTA, URL і labels на 21 public routes.
- Public footer: один canonical footer у static HTML; referenced React chunks без старих назв.
- Mobile public booking: один активний крок; нижчі public sections приховані під час wizard; fixed summary не має довгої обрізаної підказки.
- Smart Guide: fallback доступний до mount квіза; після mount standalone-режим ізолює guide без зникнення global header.
- Editorial hero: окремий 901–1180 px contract для довгих заголовків.
- Admin client card: desktop-only Glass restoration; mobile layout не змінено.

## Обмеження локального середовища

Локальний headless Chromium у цьому середовищі зависає/блокується при навігації на localhost, тому новий реліз не отримує вигаданий «pixel-perfect browser PASS». Натомість browser E2E у GitHub Actions посилено перевірками 1024px overflow/title fit, no-JS `/pidbir/`, mobile wizard isolation і deposit hint. Green production CI треба підтвердити вже після завантаження релізу в GitHub.
