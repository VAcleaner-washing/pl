# VAcleaner v4.2.31 — RELEASE REPORT

## ЗРОБЛЕНО

1. **Дорожня відстань замість прямої.** `route_km` для Полтави тепер означає реальний road route від бази до клієнта; старий `city` straight-line більше не використовується для пального.
2. **Кілометри видно в інтерфейсі.** Finance показує `Середня відстань до клієнта`, а нижче — `повний пробіг = відстань × 4`. У картці бронювання показуються `До клієнта X км` і повний пробіг.
3. **Пальне конкретної доставки.** Для локальної доставки окремо рахуються Passat CC і Fiesta, а в картці бронювання показується їх середня оцінка.
4. **Finance vehicle UI перероблено.** Passat CC і Fiesta — два окремі повноширинні рядки; назва авто, `Пальне / доставка` і `Залишається після пального` розділені на окремі блоки. Числа та пояснення більше не злипаються.
5. **Технічний текст прибрано.** `completed_at`, `route distance` та подібні внутрішні назви не виводяться користувачу. Текст фінансів переписаний людською мовою.
6. **Missing-route copy виправлено.** Замість технічних формулювань показується: для скількох доставок дорожній маршрут ще не збережено, і є зрозуміла дія `Дорахувати маршрути`.
7. **Типографіка Finance перевірена.** Службові підписи regular/medium, суми мають стриманий акцент; глобальний admin typography ceiling збережено.
8. **Browser regression нового бронювання виправлено.** UUID має fallback, тому `#bookingForm` більше не падає в CI/browser context без `crypto.randomUUID()`.
9. **Context navigation regression виправлено.** Booking → client → new booking/referral → back повертає в правильний батьківський контекст.
10. **Застарілі QA assertions оновлено** під актуальні людські формулювання та нову road-distance модель; product logic під ці assertions не відкотилася.

## PRODUCTION / DATA

- `vacleaner-address-v1` production: road-route логіка активна.
- Останні історичні доставки з однозначними адресами перераховані по дорожньому маршруту; неоднозначні адреси не підміняються вигаданою відстанню.
- Перевірений вручну маршрут Юрія Тимошенка 8 зафіксований як `5.2 км` в один бік.

## ПЕРЕВІРЕНО

- SYSTEM SPEC CONTRACT — PASS · v4.2.31 build 4231.
- Build — PASS · 496 file checks.
- Static QA — **89/89 PASS · FULL QA GREEN**.
- `test:v4.2.31-delivery-road-truth` — **18/18 PASS**.
- Finance delivery visual QA — **30/30 PASS** на 1650×900, 1280×800, 1024×768.
- Admin typography browser — **13/13 PASS**.
- Admin context navigation — **11/11 PASS**.
- PWA v4.24 focus — **8/8 PASS**.
- Glass primary — FULL GREEN.
- Desktop density — **63/63 PASS**.
- Desktop final: 1650 і 1440 проходять ключові modal/navigation checks; локальний повний multi-width прогін довший за доступний execution window, тому GitHub Browser aggregate все одно є фінальним merge gate.

## НЕ ЗМІНЕНО

- Тариф доставки.
- Referral −100/−150.
- RETURN/SMS logic.
- Settlement/deposit logic.
- VA HOME objects.
- Формула поїздки: `відстань до клієнта × 4`.

## DEPLOY STATUS

**QA-RC.** Не merge у `main`, доки GitHub `Browser QA aggregate gate` не стане GREEN.
