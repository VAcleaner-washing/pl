# VAcleaner v4.1.34 — POLTAVA ADDRESS ASSIST

Дата: 25.08.2026

## Що змінилось

- На публічному бронюванні для доставки додано пошук реальних адрес Полтави з підказками.
- У формі «Нове бронювання» в адмінці працює той самий пошук адрес.
- Для доставки перевіряється наявність вулиці та номера будинку.
- Квартира / під'їзд / поверх винесені в окреме необов'язкове поле, але зберігаються разом із адресою бронювання.
- Якщо адресу не знайдено або сервіс підказок тимчасово недоступний, ручне введення не блокується; така адреса показує попередження про ручний ввід.
- В адмінці при повторному відкритті збереженої адреси основна адреса та деталі знову розділяються по відповідних полях.
- Навігація передає в Apple Maps / Google Maps тільки адресу будинку, без квартири, під'їзду та поверху.
- Додано Supabase Edge Function `vacleaner-address-v1` — проксі пошуку адрес Полтави через OpenStreetMap / Photon. Функція розгорнута у production.

## Перевірено

- `node --check` для нового address runtime, admin runtime та public booking chunk — OK.
- v4.1.34 address regression — 16/16 OK.
- v4.1.33 navigation/typography regression — OK.
- PWA static — 83/83 OK.
- Загальний build check — 365 file checks OK.
- GitHub Pages artifact — 213 files, 6762 KiB.
- Targeted browser QA 390 px: public + admin autocomplete, вибір підказки, ручний fallback, номер будинку, окремі delivery details, відновлення даних при редагуванні, без horizontal overflow — OK.

## Не змінювалось

- Тарифи та розрахунок вартості.
- Статуси бронювання.
- RETURN bonus / Campaigns / SMS.
- Схема таблиць Supabase та існуючі booking API.
