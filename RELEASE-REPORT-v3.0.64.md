# VAcleaner v3.0.64 — FLEXIBLE DISCOUNTS & RETURN SETTLEMENT UX

## Основа
- Реліз побудовано поверх VAcleaner v3.0.63 (яка своєю чергою базується на чистій v3.0.61).
- Архітектура mobile/PWA navigation не змінювалась.
- VA HOME backend, tables, policies, functions та auth не змінювались.

## Знижки
- Ручна знижка менеджера: без ручної / 5% / 10% / фіксована сума у гривнях.
- Для ручної знижки менеджер фіксує причину: Лояльність / Компенсація / Домовленість / Інше.
- Loyalty, promo та manual не сумуються: застосовується найбільша вигода для клієнта.
- При однаковій сумі знижки пріоритет залишається за автоматичною loyalty/promo, ручна не дублює її.
- Знижка застосовується тільки до rental base. Доставка, extras, хімія та залоговий платіж не дисконтуються.
- Manual fixed amount обмежується сумою оренди; manual percent серверно дозволяє тільки 5% або 10%.

## Повернення / settlement
- Той самий редактор ручної знижки доступний у фінальному розрахунку при поверненні техніки.
- Зміна знижки одразу перераховує оренду, загальні витрати, суму до повернення або доплати.
- `save_finance` зберігає нову `base_amount`, applied discount і окремий `manual_discount` request перед закриттям оренди.
- Ручний запит зберігається навіть якщо його зараз перемагає loyalty або promo, тому його не гублять сторонні редагування.

## UX
- Новий discount editor не використовує browser-native select/radio для вибору знижки.
- 5%, 10%, fixed та reason — власні premium buttons/chips із hover/focus/active станами.
- Fixed amount і reason inputs — кастомні поля, на mobile мають 16px font-size та `inputmode="numeric"` для суми.
- Discount editor працює всередині наявного єдиного mobile `<=900px` shell contract; нового mobile media-layer не додано.
- Booking та finance modal зберігають власні scroll owners; desktop finance scrollbar стилізований, mobile використовує touch-scroll без browser scrollbar.
- Постійний клієнт автозаповнюється за телефоном; earned loyalty більше не має manager toggle і застосовується автоматично.
- Існуюча ручна знижка та причина автоматично підтягуються при повторному відкритті бронювання/повернення.

## Public
- На `/umovy/` додано компактний блок програми лояльності: Start 0% (0–2 оренди), Regular −5% після 3, VIP −10% після 6.
- Публічно пояснено, що promo і loyalty не сумуються, а система обирає вигіднішу знижку.
- Внутрішні можливості ручної знижки менеджера на публічному сайті не рекламуються.

## QA
- Оновлено finance / retention / stabilization / UX / static guards для manual 5/10/fixed і settlement-at-return.
- E2E перевіряє custom discount controls у booking modal та return settlement, live preview, mobile 16px input, scroll owner і відсутність горизонтального overflow.

### Final release QA
- Static build guard: 255 file checks PASS.
- Rental / deposit / slots: 46 assertions PASS.
- Stabilization: 157 assertions PASS.
- Retention / campaigns: 18 checks PASS.
- Finance: 23 scenarios PASS.
- UX: 18 scenarios PASS.
- CSS architecture: PASS; admin CSS has 1 intentional `!important` declaration.
- Operational health: PASS.
- Desktop density guard: PASS.
- GitHub Pages artifact build: 190 files / 5003 KiB.
- Python E2E scripts compile successfully.
- Local browser E2E is NOT marked PASS: this execution environment blocks navigation to `127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR`. GitHub Actions / production / real iPhone remain separate acceptance stages.

### Production deployment note
- This release changes the VAcleaner Edge Function `vacleaner-admin-bookings-v3`.
- The GitHub Pages workflow deploys the static frontend but does not deploy Supabase Edge Functions.
- Therefore 5% / 10% / fixed manager discounts and discount-at-return require a separate deployment of `vacleaner-admin-bookings-v3` with JWT verification enabled.
- VA HOME backend/functions/tables/policies/auth are not part of this release and must not be changed.
