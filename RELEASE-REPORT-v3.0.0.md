# VAcleaner v3.0.0 — P3 / архітектурна стабілізація

Дата: 06.08.2026

## Що було метою

Реліз закриває архітектурний етап із експертного аудиту: єдиний каталог для сайту й адмінки, одна версія збірки, завершення консолідації CSS, менше зайвого клієнтського JavaScript, ізоляція адмінської PWA, production-перевірка доступів Supabase та журнал фінансових/статусних змін.

## 1. Єдине джерело правди для каталогу

Створено `config/vacleaner.json`. У ньому зібрані:

- техніка та комплекти;
- клієнтські назви й описи;
- ресурси кожного комплекту;
- будні, вихідні та тариф Сб + Нд;
- групи залогових платежів;
- додаткові позиції;
- базові часові слоти;
- зображення техніки.

`scripts/generate-config.mjs` формує з цього файлу браузерний модуль `assets/vacleaner-core.js` та `config.ts` для трьох Supabase Edge Functions. Поточний контрольний хеш конфігурації: `9230ced0dcc409f4`.

Таким чином назви, ціни, склад комплектів і залог більше не підтримуються окремо в декількох несинхронних словниках.

## 2. Автоматична версія збірки

Єдине джерело версії — `release.json`:

- version: `3.0.0`;
- build: `3000`.

Команда `npm run stamp` автоматично:

- генерує спільну конфігурацію;
- проставляє `?v=3000` у CSS/JS;
- оновлює cache name адмінського Service Worker.

Команда `npm run check` не пропускає збірку, якщо версії розійшлися, конфігурація застаріла, публічна PWA знову потрапила на сайт або development metadata лишилась у файлах.

## 3. CSS адмінки

`assets/admin-v250.css` приведено до стану:

- 117 273 байти;
- 1 `!important` — лише службовий `.hidden`;
- 1 285 CSS-правил;
- 0 повторних selector + media-context блоків.

Тобто однаковий селектор більше не воює сам із собою в одному контексті. Нові правки не повинні випадково програвати старим оверрайдам.

## 4. Клієнтський JavaScript

Маркетингові сторінки більше не завантажують каталог без потреби:

- головна та сторінка відгуків: лише `public-experience.js`;
- бронювання: `vacleaner-core.js`, календар/слоти, каталог і experience;
- адмінка: `vacleaner-core.js` + `admin-v250.js`.

Прибране старе періодичне опитування DOM каталогу. Оновлення працює подієво та через короткий контрольний повтор після рендера.

Глибше скорочення стандартних Next.js chunks потребує вихідного Next-проєкту й повного rebuild. У цій статичній збірці безпечно оптимізований власний runtime, а не хешовані framework chunks.

## 5. Адмінська PWA ізольована

Публічні маршрути більше не містять активного manifest або root Service Worker:

- видалено кореневі `manifest.webmanifest` і `sw.js`;
- очищено HTML та Next RSC metadata публічних сторінок;
- додано одноразове відключення старого root Service Worker у браузерах, де він уже був установлений;
- `/admin/manifest.webmanifest` і `/admin/sw.js` залишились тільки для менеджерської PWA зі scope `/admin/`.

## 6. Чистий GitHub Pages deployment

Додано `.github/workflows/pages.yml`:

1. Node.js 22;
2. генерація й stamp версії;
3. автоматичні перевірки;
4. створення чистого `dist`;
5. завантаження тільки deploy-артефакту;
6. GitHub Pages deploy.

`cancel-in-progress: true` не дозволяє старим Pages deployment накопичуватися в черзі. У deploy більше не потрапляють `.github`, вихідні конфіги, Supabase-код, міграції, звіти та root PWA-файли.

Тестовий артефакт: 190 файлів, приблизно 4,85 MiB raw.

## 7. Production Supabase: доступи та RLS

У production застосовані міграції:

- `vacleaner_v3_audit_security`;
- `vacleaner_v3_performance`;
- `vacleaner_v3_audit_backfill`.

Для `vacleaner_bookings`, `vacleaner_customers`, `vacleaner_settings` і нового `vacleaner_booking_audit` підтверджено:

- RLS увімкнено;
- `anon` не має прямого SELECT;
- звичайний `authenticated` не має прямого SELECT;
- `service_role` має серверний доступ.

Публічна форма й адмінка працюють через Edge Functions, а не через відкриті таблиці.

Додано індекс `vacleaner_push_subscriptions(user_id)` і оптимізовано policy `admin_users`, щоб `auth.uid()` не обчислювався для кожного рядка.

## 8. Журнал змін бронювання

Створено `vacleaner_booking_audit` і database trigger. Фіксуються:

- створення;
- зміна статусу;
- передплата;
- оплата при видачі та поверненні;
- залог: сума, отримання, повернення;
- оренда, доставка, додаткові позиції та підсумкова сума;
- склад хімії в `extras`.

Для наявних бронювань створені початкові snapshots: 5 записів для 5 бронювань на момент релізу.

Нові дії менеджера позначаються `actor_id` та джерелом Edge Function. В адмінці в деталях бронювання додано преміальний блок «Історія бронювання» з попереднім і новим значенням.

## 9. Edge Functions у production

Активні версії після релізу:

- `vacleaner-settings` — v4, ACTIVE;
- `vacleaner-booking-v5` — v3, ACTIVE;
- `vacleaner-admin-bookings-v3` — v7, ACTIVE, JWT required.

Вони використовують згенеровану конфігурацію з хешем `9230ced0dcc409f4`.

Додатково сервер не дозволяє позначити залог поверненим, якщо його отримання не було зафіксовано.

## 10. Перевірки

Успішно виконано:

- `npm run stamp`;
- `npm run check` — 227 файлових перевірок;
- `npm run build` — чистий Pages artifact;
- Node syntax check для власних JS;
- TypeScript transpile diagnostics для Edge Functions;
- перевірка єдиного config hash у браузері та backend;
- перевірка відсутності public manifest/root SW;
- перевірка наявності admin manifest/SW;
- CSS duplicate-selector scan;
- mock-render деталей бронювання з audit log на 390 px;
- ключові public/admin стани на 390 і 1440 px без горизонтального overflow та page errors у виконаному прогоні.

## 11. Що свідомо не чіпалось

Supabase-проєкт спільний із VA HOME. Тому не змінювалися project-wide попередження, які можуть належати іншому бренду:

- `pg_net` у schema public;
- `claim_customer_orders()`;
- `is_admin()`;
- leaked-password protection у налаштуваннях Auth;
- performance-поради для таблиць orders, promo_codes, reviews, discovery_credits та інших VA HOME-сутностей.

Це не варто виправляти навмання в межах релізу VAcleaner.

## Статус

Backend і міграції вже активні в production Supabase.

Для оновлення сайту та PWA потрібно завантажити вміст архіву `VAcleaner-v3.0.0-ARCHITECTURE-P3.zip` у корінь GitHub-репозиторію. Новий workflow сам перевірить збірку, створить чистий артефакт і виконає deploy.
