# VAcleaner v3.0.24 — Clients + 320px CI Repair

Дата: 07.08.2026  
Build: 3024

Цей реліз зроблений поверх v3.0.23 і закриває регресії, знайдені вже після великого stabilization-pass. Бізнес-ядро v3.0.23 не відкотилось: weekend tariff/deposit, half-open inventory, manual 10% discount, settlement, nearest availability та історичний імпорт залишаються чинними.

## 1. Пошук у «Клієнтах» більше не перекидає в «Бронювання»

- Глобальний пошук став контекстним.
- У вкладці «Клієнти» запит фільтрує клієнтів на місці.
- Пошук працює по ПІБ, телефону, Telegram та адресі.
- Автоперехід у «Бронювання» лишився лише для вкладок, де немає власного search-view.
- Доданий runtime regression test на 320 / 390 / 430 px.

## 2. Повний формат «Остання оренда»

- Було: `04.05`.
- Стало: **`04.05.2026`**.
- Формат `DD.MM.YYYY` використовується у списку клієнтів і в редакторі клієнта.
- Доданий runtime test, який перевіряє наявність року.

## 3. Редагування картки клієнта

У «Клієнтах» додана окрема дія редагування. Картка дозволяє змінювати:

- ПІБ;
- телефон;
- Telegram;
- адресу;
- тип документа;
- серію / номер документа;
- позначку «Документ перевірено».

Правила безпеки:

- редактор не змінює орендну суму, залоговий платіж, хімію, extras, статус або settlement;
- якщо змінюється телефон, новий номер перевіряється на конфлікт з існуючим клієнтом;
- контактні ПІБ/телефон/Telegram синхронізуються з історією цього клієнта, фінансові поля бронювань не торкаються;
- історичні записи без реального телефона не отримують вигаданий номер і не редагуються як звичайний контакт.

## 4. Окремий non-financial admin data endpoint

Щоб редагування клієнтів не створило ще один шар бізнес-логіки, доданий окремий Edge endpoint:

- `vacleaner-admin-data-v1`
- production: **v1 ACTIVE**
- `verify_jwt: true`
- SHA-256: `51c614cde66d05a990b52284d32da578787119be1342fb9d4fab98aadd5e5fee`

Він має тільки три задачі:

1. читати список бронювань для UI;
2. читати профілі клієнтів;
3. зберігати контактну картку клієнта.

В endpoint немає розрахунку тарифів, знижок, залогу, availability чи фінального settlement.

## 5. Історичний імпорт більше не може обрізати актуальні бронювання

Після імпорту 356 історичних оренд було знайдено прихований ризик: старий list-path забирав лише перші 250 записів у старому порядку.

У v3.0.24:

- data endpoint віддає до **1000 бронювань**;
- порядок — **найновіші спочатку**;
- історичні записи більше не можуть витіснити актуальні з локального state;
- клієнтська статистика та аналітика отримують повніший набір даних.

## 6. GitHub Actions: 320px «Техніка»

В старому run v3.0.23 падав тест:

`mobile-320: equipment view stays inside viewport`

Причина: desktop-style toolbar / контролі могли розпирати дуже вузький viewport.

Виправлено в основному mobile layout contract:

- toolbar переходить у стабільну одноколонкову схему;
- контроли мають `min-width:0` та не розширюють parent;
- картки/price controls обмежені шириною viewport.

Фінальний runtime test: **PASS**.

## 7. GitHub Actions: 320px «Аналітика»

В старому run v3.0.23 падав тест:

`mobile-320: analytics view stays inside viewport`

Виправлено:

- analytics toolbar не виходить за viewport;
- period controls використовують `minmax(0, 1fr)`;
- product/status blocks дозволяють wrap без горизонтального overflow;
- 320px перевіряється окремим runtime invariant.

Фінальний runtime test: **PASS**.

## 8. Client editor mobile / PWA

Редактор клієнта перевірений на 320 / 390 / 430 px:

- немає horizontal overflow;
- header очищає iPhone top safe-area;
- footer очищає Home Indicator;
- внутрішня форма скролиться без руху app shell;
- основні contact fields доступні;
- native select / checkbox використовують той самий premium control system, що й решта адмінки.

## 9. Manual 10% discount — production backend

Виправлення зі v3.0.23 вже не лише в ZIP.

Production `vacleaner-admin-bookings-v3`:

- **v13 ACTIVE**;
- `verify_jwt: true`;
- SHA-256: `b3013c45f4989571b024dad6d7cf9e87a84e8684190fa1b554a2de089c050825`;
- pinned на код v3.0.23 business core.

Отже regression `600 → 540 → 600` більше не залежить від Pages-деплою: серверний discount fix уже активний у production.

## 10. Збережені правила v3.0.23

Без змін збережені:

- п’ятниця вечір = weekend tariff;
- неділя вечір = weekday tariff;
- залоговий платіж за paid-days/weekend model;
- ранкове повернення звільняє техніку для ранкової видачі того самого дня;
- half-open slot `[start,end)`;
- pending не резервує inventory;
- waiting_payment резервує лише з дійсним hold;
- nearest compatible availability на публічному сайті;
- manual discount має пріоритет над loyalty;
- існуюча фактична хімія `VAC-*` не обнуляється;
- imported `HIST-*` chemistry = 0;
- приватні import-файли не входять у release archive.

## 11. Фінальні QA результати

Після останнього `stamp` v3.0.24:

- Static build gate: **248 file checks — PASS**
- Rental / deposit / slot policy: **46 assertions — PASS**
- Finance: **19 scenarios — PASS**
- Stabilization architecture: **71 assertions — PASS**
- Session: **4 scenarios — PASS**
- UX: **17 scenarios — PASS**
- PWA static: **42 assertions — PASS**
- Installed PWA / mobile visual QA: **304 / 304 — PASS**
- Desktop density visual QA: **60 / 60 — PASS**
- Final desktop visual audit: **205 / 205 — PASS**
- Production backend inventory: **PASS**
- Pages build: **191 files / 4920 KiB — PASS**

### GitHub-specific gate

Локальний `npm run test:e2e` у цьому контейнері все ще не може відкрити навіть `http://127.0.0.1:4173` через системну політику Chromium `ERR_BLOCKED_BY_ADMINISTRATOR`. Це **не позначено як PASS**.

GitHub Actions лишається авторитетним runtime gate для `test:e2e`. Старий GitHub run #14 був для v3.0.23; його конкретні PWA failures на 320px уже відтворені й виправлені у новому PWA regression suite v3.0.24.
