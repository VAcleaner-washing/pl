# RELEASE REPORT — VAcleaner v4.2.29

## ЗРОБЛЕНО

1. Розділено старі адреси VAcleaner: маршрутна адреса окремо, під’їзд/поверх/домофон/орієнтир окремо. Backfill виконаний у production Supabase.
2. «Доставка по факту» переведена на до 30 останніх завершених доставок; UI показує окремо кількість записів із фактичною ціною, маршрутом і повними даними.
3. Referral modal: текст повідомлення видно одразу; preferred Instagram має пріоритет і inbox fallback; Telegram не підміняє основний канал.
4. Додана контекстна навігація між booking detail, client card, referral і new booking із поверненням у батьківський контекст.
5. Переглянута типографіка всієї адмінки. Надмірний bold прибраний зі службових label-ів, фінансових рядків і допоміжного тексту; акценти залишені на сумах/KPI/заголовках.
6. SYSTEM SPEC доповнений NAV-004 та v4.2.29 contract/change record.
7. Додані regression/browser тести v4.2.29 для data contract, context navigation та typography.

## SUPABASE / БАЗА

- Production migrations applied: `20260830060316 vacleaner_address_detail_backfill_v429`, `20260830062425 vacleaner_address_detail_backfill_v429_pass2`.
- Production Edge Functions: admin-data v18, admin-bookings-v4 v5, booking-v5 v26.
- Перевірка legacy address leftovers: customers = 0, delivery bookings = 0.
- VA HOME не змінювався.

## ПЕРЕВІРЕНО

- Static/build: 87/87 PASS.
- PWA: 882/882 PASS.
- Typography: 13/13 PASS.
- Context navigation: 11/11 PASS.
- Referral visual: 7/7 PASS; referral responsive: 5/5 PASS.
- Analytics visual: 103/103 PASS.
- Growth visual: 135/135 PASS.
- Content visual: 174/174 PASS.
- Smart Guide: 32/32 PASS.
- Campaign SMS UX: 336/336 PASS.
- Calendar: 8/8 PASS.
- Desktop density: 63/63 PASS.
- Final desktop: 394/394 PASS.
- Booking gifts visual: 48/48 PASS.
- Glass V4: GREEN.

## НЕ ЗАКРИТО ЛОКАЛЬНИМ СЕРЕДОВИЩЕМ

`test:e2e`, `home-mobile-density`, `equipment-mobile-density` блокуються локально політикою Chromium на `127.0.0.1` (`ERR_BLOCKED_BY_ADMINISTRATOR`). Це не позначено як GREEN; перед merge потрібен GitHub Browser QA aggregate gate.

## DEPLOY STATUS

- Production Supabase: оновлено.
- GitHub Pages: у цьому пакеті не деплоїться автоматично.
- Merge/deploy: тільки після GREEN на QA branch у GitHub Actions.


## 6. Видача / stale modal — FIXED
- Причина `invalid_transition` відтворена по production audit: бронювання вже мало статус `issued`, а стара відкрита модалка повторно відправила `issued`.
- Frontend перед фінансовим записом оновлює список і перевіряє фактичний статус. Якщо вже `issued`, модалка закривається без повторного запису та показує нормальне повідомлення.
- Backend `vacleaner-admin-bookings-v4` робить повторний `issued → issued` idempotent success, тому network retry/double tap не дає сирий код помилки.
- `invalid_transition` більше не показується користувачу як технічний текст.
- Production Edge Function оновлена до v6.
