# VAcleaner · Native FULL PWA Test

Паралельний тестовий mobile UI для всієї адмінки/PWA. Production не замінюється.

## Маршрути

- Production / стара PWA: `/admin/bronuvannia/`
- Test / Native FULL PWA: `/admin/bronuvannia-native-test/`
- Test route має окремий `manifest-native-test.webmanifest` і не підміняє production PWA.

## Покриття FULL PWA

Єдина native visual system застосована до:

- `Найближчі`
- `Бронювання`
- `Календар`
- `Техніка`
- `Клієнти`
- `Кампанії`
- `Фінанси`
- `Аналітика`
- `Хімія`
- `Налаштування`
- глобального пошуку
- повноекранного `Ще`

Також стилізовані ключові робочі flow/modal surfaces:

- створення та редагування бронювання
- detail бронювання
- картка клієнта
- опрацювання заявки
- видача
- попередній / фінальний розрахунок
- продовження оренди
- витрати
- кампанії / SMS
- secondary admin modals

## Візуальний контракт

- темний graphite shell + точковий warm-gold accent
- крупніша Apple-like типографіка та спокійніша ієрархія
- пласкі dark surfaces, менше декоративних border/glass ефектів
- єдина mobile bottom navigation
- мінімальний touch target 44 px
- без horizontal page overflow на 320 / 390 / 430 px
- ліва статусна смуга збережена у `Найближчі`, `Бронювання` та detail бронювання

## Логіка

Native test використовує ту саму business logic, Supabase, booking actions, statuses, finance/delivery/deposit, RETURN/referral та availability, що й production. Це окремий presentation layer; production-файли не переписуються.

## QA

- Canonical static QA: `38/38 PASS · FULL QA GREEN`
- Native FULL PWA mobile QA: `77/77 PASS`
- Viewports: `320 / 390 / 430 px`
- Перевірено primary views, booking form, booking detail, More, client card, SMS flow та status rails.
- `test:ci-pipeline`: `18/18 PASS`

Canonical Browser QA залишається release-blocking перед перенесенням native UI у production. Test archive не перемикає production route на native UI.

## Deep visual QA pass v3.2

Додатково пройдено глибокі mobile surfaces, які не можна вважати перевіреними лише за головними вкладками:

- issue / видача та finance / попередній і фінальний розрахунок — booking context не стискається в порожню смугу;
- Calendar — прибрано дубль технічної ISO-дати під людською датою;
- SMS — `Журнал`, `Вибрати всіх`, Back та step controls мають touch target 44+ px;
- Analytics — metric/month/year controls мають touch target 44+ px;
- mobile micro-copy у native test не опускається нижче 10 px на ключових видимих поверхнях;
- 320 px має окремий fallback для issue/finance booking context.
