# VAcleaner v4.2.29 — admin context, address data, delivery analytics, referral, typography

## Release rule

Працювати через окрему QA-гілку `qa/v4.2.29-admin-context-data`. `main` не використовувати як тестову гілку. Merge у `main` — тільки після повністю зелених `Static / build gate` і `Browser QA aggregate gate` у GitHub Actions.

## Що входить у v4.2.29

1. Legacy адреси: route-address і під’їзд/поверх/домофон/орієнтир фізично розділені в БД та backend payloads.
2. «Доставка по факту»: вибірка до 30 останніх завершених доставок; окремі знаменники для ціни, маршруту та повністю розрахованих записів; невідома історична ціна не підміняється нулем.
3. Referral: готовий текст видимий; preferred Instagram не демотується до Telegram через відсутній username; Instagram CTA має inbox fallback.
4. Context navigation: booking → client → back; client → referral → back; client → new booking → back.
5. Typography: службові label-и та фінансові рядки не використовують надмірний bold; акцент лишається на сумах, KPI та справжніх заголовках.

## Production Supabase

На production уже застосовані міграції:

- `vacleaner_address_detail_backfill_v429`;
- `vacleaner_address_detail_backfill_v429_pass2`.

У production schema є `vacleaner_customers.address_detail` та `vacleaner_bookings.fulfillment_address_detail`.

На production оновлені Edge Functions:

- `vacleaner-admin-data-v1` → v18;
- `vacleaner-admin-bookings-v4` → v5;
- `vacleaner-booking-v5` → v26.

VA HOME таблиці та функції цими міграціями не змінювалися.

Контроль після backfill: 0 VAcleaner customer route-addresses і 0 delivery booking route-addresses із розпізнаним під’їздом, що лишився всередині адреси.

## QA

Локально після останніх правок підтверджено:

- canonical static/build: `87/87 PASS`;
- PWA suite: `882/882 PASS`;
- admin typography: `13/13 PASS`;
- context navigation: `11/11 PASS`;
- referral modal visual: `7/7 PASS`;
- referral admin responsive: `5/5 PASS`;
- analytics visual: `103/103 PASS`;
- growth visual: `135/135 PASS`;
- content visual: `174/174 PASS`;
- Smart Guide fit: `32/32 PASS`;
- campaign SMS UX: `336/336 PASS`;
- calendar focused: `8/8 PASS`;
- desktop density: `63/63 PASS`;
- final desktop suite: `394/394 PASS`;
- booking gifts visual: `48/48 PASS`;
- Glass V4 QA: GREEN.

Локальні `test:e2e`, `home-mobile-density` та `equipment-mobile-density` у цьому контейнері не можуть відкрити loopback URL через `ERR_BLOCKED_BY_ADMINISTRATOR`. Це environment blocker, не product assertion FAIL. У GitHub runner Chromium встановлюється окремо, тому перед merge обов’язковий штатний Browser QA aggregate gate.

## Post-deploy smoke

1. Відкрити Анну Бабанську: адреса `Полтава, Полтавська 3`, detail `3 підʼїзд` окремо.
2. Відкрити «Фінанси → Доставка по факту»: перевірити вибірку до 30 і зрозумілі знаменники «ціна / маршрут / повністю розраховано».
3. Відкрити referral у клієнта з `Основний канал = Instagram`: текст видно, Instagram primary, Telegram не підміняє preferred channel.
4. Пройти booking → client → back, client → referral → back, client → new booking → back.
5. Перевірити finance/return modal та основні екрани адмінки: label-и читаються regular/medium, суми лишаються акцентними.


## RC2 — stale issue guard
- Production `vacleaner-admin-bookings-v4` deployed as version 6.
- Repeated `issued → issued` request is idempotent and no longer returns raw `invalid_transition`.
- Frontend refreshes booking state before saving issue finance. If another tab/device already issued the booking, the modal closes and current state is rendered without a duplicate write.
