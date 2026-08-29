# VAcleaner v4.2.27 — deployment order

Цей реліз змінює frontend, database schema та три Edge Functions. GitHub Pages workflow розгортає тільки static site, тому backend застосовується окремо й **до** merge у `main`.

## 1. QA branch

Створити окрему гілку `qa/v4.2.27-address-separation`, завантажити цей package без сторонніх змін і дочекатися двох зелених jobs:

- `Static / build gate`;
- `Browser QA aggregate gate`.

## 2. Database migration

Застосувати до Supabase project `Va-home` (`yweluzclearwrazdkahu`) тільки migration:

`supabase/migrations/20260829214500_vacleaner_separate_delivery_address_details.sql`

Migration працює тільки з `vacleaner_customers` і `vacleaner_bookings`. Вона додає окремі колонки та розділяє legacy-адреси. Placeholder `Історична доставка · адреса не збережена` не перетворюється на маршрут.

## 3. Edge Functions

Після успішної migration розгорнути source з цього package:

- `vacleaner-admin-data-v1`;
- `vacleaner-admin-bookings-v4`;
- `vacleaner-booking-v5`.

Не змінювати VA HOME tables, functions, secrets або policies.

## 4. Production site

Після зелених QA jobs і backend deployment merge `qa/v4.2.27-address-separation` у `main`. Pages deploy уже залежить від обох QA jobs.

## 5. Post-deploy smoke

Перевірити:

1. У картці клієнта змінити адресу та під’їзд, зберегти, перевідкрити картку — обидва значення лишаються окремими.
2. Створити admin booking із адресою та під’їздом — `customer_comment` не містить під’їзд.
3. Відредагувати старе бронювання з `18/12 під’їзд 3` — адреса лишається `18/12`, detail — `під’їзд 3`.
4. Створити public booking — route/quote отримує тільки адресу будинку.
5. Крок 4 admin booking не дублює inputs і показує тільки delivery summary / route action.
