# VAcleaner v3.0.70 — BOOKING GTM BOOTSTRAP FIX

## Причина
Пряме відкриття `/bronuvannia/` містило GTM лише як Next/React runtime Script payload та noscript iframe. Tag Assistant на цій сторінці не знаходив активний `GTM-KC8FF7FB`, тому `generate_lead` не міг бути перехоплений GTM.

## Виправлення
- `/bronuvannia/` отримав реальний executable GTM bootstrap у `<head>`.
- Runtime/Flight GTM snippet має guard, щоб той самий контейнер не завантажувався двічі після hydration.
- `generate_lead` логіку з v3.0.69 не змінено.
- Адмінка, Supabase, тарифи, залоги та booking business logic не змінювались.
- Додано static QA guard: booking page повинна містити executable GTM bootstrap та duplicate-load guard.
