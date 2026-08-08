# VAcleaner v3.0.69 — GENERATE LEAD DATALAYER FIX

## Причина
У public booking bundle подія `generate_lead` після успішної відповіді backend використовувала `window.dataLayer?.push(...)`. Якщо `dataLayer` ще не існував у момент submit, подія тихо пропускалась.

## Зміни
- Після `success:true` booking API гарантовано ініціалізується `window.dataLayer = window.dataLayer || []`.
- `generate_lead` пушиться до переходу UI на success-state.
- `value` береться з `backend estimate.totalAmount` з fallback на поточний estimate форми.
- Додано static guard, який вимагає явну ініціалізацію `dataLayer` і backend-derived lead value.
- Бізнес-логіка бронювання, ціни, Supabase, адмінка та PWA не змінювались.
