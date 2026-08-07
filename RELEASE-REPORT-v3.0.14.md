# VAcleaner v3.0.14 — PWA VISUAL QA + CONTROLLED UPDATE + PUSH DEEP-LINK

## База релізу

- Єдина база: `VAcleaner-v3.0.13-MOBILE-CONVERSION-PASS.zip`
- Версія: `3.0.14`
- Build: `3014`
- Supabase, Edge Functions і фінансова формула в цьому релізі не змінювалися.

## Що реалізовано

### Контрольоване оновлення PWA

Новий Service Worker більше не підміняє відкритий застосунок автоматично. Коли готова нова версія, адмінка показує окремий блок:

- `Пізніше` — поточна сесія продовжує працювати без раптового перезапуску;
- `Оновити зараз` — новий Service Worker активується через `SKIP_WAITING`, після чого застосунок перезапускається один раз.

Це прибирає ризик одночасної роботи старого JavaScript із новим кешем.

### Push deep-link у конкретне бронювання

Натискання на push тепер:

1. відкриває або фокусує PWA;
2. передає `bookingId` у URL і через повідомлення Service Worker;
3. чекає завантаження списку бронювань;
4. відкриває точну картку заявки;
5. очищає технічний query-параметр після відкриття.

Код бронювання залишається видимим і на вузькому мобільному екрані.

### iPhone safe-area та клавіатура

Окремо враховано:

- верхню зону статус-бара та Dynamic Island;
- нижню зону Home Indicator;
- бокові safe-area у landscape;
- фактичну висоту `visualViewport` при відкритій клавіатурі;
- доступність кнопок модалки над клавіатурою;
- `100dvh` і standalone-режим установленої PWA.

### Уніфіковані PWA-модалки

На mobile і tablet перевірено та виправлено:

- `Нове бронювання`;
- `Опрацювати заявку`;
- `Видача техніки`;
- `Закриття оренди`;
- `Фінальний розрахунок`;
- каталог і службові модалки.

Футери більше не заходять у Home Indicator. `Видача техніки` використовує ту саму повноекранну геометрію, що й інші робочі модалки.

## Реальні баги, знайдені PWA visual QA

1. Верхня панель standalone-PWA не враховувала safe-area iPhone.
2. Кнопки `Опрацювати заявку` та фінального розрахунку заходили в Home Indicator.
3. Модалка видачі мала неповну висоту й чорну порожню зону знизу.
4. Дії у картці бронювання могли перекривати клієнтські та фінансові блоки.
5. Код заявки був прихований на mobile, тому push deep-link неможливо було візуально підтвердити.
6. Позиція списку зберігалася через `window.scrollY`, хоча PWA прокручує `.main`.
7. Швидке повторне відкриття картки могло втрачати позицію списку.
8. Закриття меню `Ще` клавішею Escape не завжди очищало `menu-open`.
9. Повний runtime-тест виявив відсутній загальний modal-helper — його відновлено, а в статичний check додано блокуючу перевірку.
10. PWA screenshots/test-results потрапляли у Pages artifact — build тепер явно виключає QA-артефакти.

## PWA visual QA

Реальний Playwright-рендер запускається з фактичними CSS і JavaScript адмінки та mocked API. Перевірено:

- portrait: 320×844, 390×844, 430×844;
- tablet: 768×1024;
- landscape: 844×390;
- desktop: 1440×1000;
- екран входу з імітацією клавіатури;
- усі 8 розділів desktop-адмінки;
- усі основні робочі модалки;
- overflow, tap-зони, safe-area, offline, update prompt, push deep-link і відновлення scroll.

**Результат: 156/156 — passed.**

## Фінальні перевірки

- `node --check assets/admin-v250.js` — успішно;
- `node --check admin/sw.js` — успішно;
- Python compilation для обох Playwright runner — успішно;
- `npm run stamp` — успішно;
- `npm run check` — 266 file checks;
- `npm run build` — 192 файли, 4905 KiB;
- `npm run test:pwa` — 156/156;
- modal-helper присутній у фінальному `dist`;
- Service Worker cache — `vacleaner-manager-3014`;
- реєстрація — `/admin/sw.js?v=3014`;
- development/QA artifacts у Pages `dist` — відсутні.

## Відоме обмеження перевірки

Звичайний route-based `npm run test:e2e` не запускається в локальному контейнері через системну політику Chromium: `ERR_BLOCKED_BY_ADMINISTRATOR` для `vacleaner.test`. Це не помилка сайту. GitHub Actions встановлює чистий Playwright Chromium і запускає цей тест до deployment.

PWA visual QA не залежить від localhost або DNS і повністю пройшла локально. Фінальне підтвердження поведінки Safari standalone, реального Home Indicator, системної клавіатури та push потребує встановлення v3.0.14 після deployment на фізичний iPhone.

## Production status

Це release candidate. GitHub Pages deployment має відбутися лише після зелених:

- `Run desktop and mobile browser tests`;
- `Run installed-PWA visual QA`.
