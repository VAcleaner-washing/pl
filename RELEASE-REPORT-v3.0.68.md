# VAcleaner v3.0.68 — CONTACT CLICK TRACKING SYNC

## Причина
У v3.0.67 форма бронювання вже використовувала `contact_click`, але головна та більшість public-сторінок продовжували завантажувати старі Next.js chunks із `contact_instagram`, `contact_telegram` та `contact_phone`. Через це GTM Custom Event `contact_click` не спрацьовував на цих сторінках.

## Що виправлено
- Реально підключені public Next.js chunks нормалізовано на одну подію `contact_click`.
- Канал контакту передається окремо як `contact_method`: `instagram`, `telegram` або `phone`.
- У `public-experience.js` додано cache-safe normalizer: навіть якщо браузер/CDN тимчасово тримає старий fingerprinted chunk, legacy `contact_*` буде перетворено на `contact_click` до обробки GTM.
- Static QA тепер перевіряє всі public Next.js chunks і падає, якщо повернуться старі per-channel event names.
- `generate_lead` лишається тільки після успішної відповіді backend на створення заявки.

## Не змінювалось
- Supabase business logic / booking workflow.
- Адмінка та PWA UX.
- Тарифи, залоги, finance settlement.
- VA HOME.
