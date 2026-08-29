# VAcleaner — SYSTEM SPEC / SOURCE OF TRUTH

**Статус:** нормативний документ продукту.  
**Baseline version:** 4.2.25  
**Baseline build:** 4225  
**Останнє оновлення:** 2026-08-29  
**Власник логіки:** VAcleaner  

> Якщо поведінка коду суперечить цьому документу, це вважається regression, доки зміна не була окремо погоджена, внесена сюди та захищена тестом.

---

## 0. Навіщо існує цей файл

Це єдина точка правди про те, **що є у VAcleaner, як воно має працювати і що не можна випадково ламати наступним релізом**.

Документ описує не лише екрани, а й:

- бізнес-правила;
- статуси та переходи;
- джерело правди для кожного типу даних;
- взаємозв’язки між бронюванням, клієнтом, кампаніями, referral, фінансами та доставкою;
- PWA-поведінку;
- UX-інваріанти;
- помилки/empty states;
- regression-контракти;
- обов’язковий процес зміни функціоналу.

**Правило релізу:** зміна поведінки без оновлення цього документа і regression-тесту — незавершена зміна.

---

# 1. RELEASE / QA CONTRACT

## REL-001 — main не є тестовою гілкою

- `main` — production-only.
- Будь-яка зміна починається з актуального успішного production commit.
- Робоча гілка: `qa/vX.X.X-назва`.
- Проміжні fix/fix2/final-final у `main` заборонені.

## REL-002 — реліз лише після повного QA

До merge у `main` обов’язково:

- `npm run check`;
- усі regression tests;
- build/release coherence;
- Pages artifact;
- backend/static contracts;
- service worker/cache bust;
- усі browser suites з workflow;
- responsive QA: 320 / 390 / 430 / 1024 / 1280 / 1440 / 1648 px.

Не можна писати `FULL QA GREEN`, якщо частина suites фактично не запускалась або завершилась timeout/blocked.

## REL-003 — один production commit

Після FULL GREEN:

- squash робочої гілки;
- один release commit у `main`;
- одна версія;
- один build;
- один фінальний ZIP.

## REL-004 — coherence версії

Однаковими мають бути:

- `package.json` version;
- `release.json` version/build;
- `PWA_BUILD`;
- admin/public asset query versions;
- service worker cache version;
- stamped backend config.

## REL-005 — System Spec є release gate

Кожен новий реліз з новою поведінкою повинен:

1. оновити `Baseline version/build` у цьому файлі;
2. додати `Change record` для нової версії;
3. описати змінену логіку;
4. назвати regression-тести, що її захищають.

---

# 1A. AI OPERATING CONTRACT

## AI-ROLE-001 — роль виконавця

Ти працюєш як **Senior Front-end Architect, Senior Product/UX Designer, QA & Regression Engineer, Technical SEO/Performance Specialist і технічний власник всього продукту VAcleaner: публічного сайту, квізу, підбору комплекту, бронювання, адмінки/PWA та інтеграцій із Supabase.**

Цей контракт обов’язковий для будь-якої наступної роботи з VAcleaner. Він не замінює product contracts нижче, а визначає спосіб, у який їх дозволено змінювати.

## AI-RULE-001 — тільки актуальна production-база

- Працювати лише з актуальною production-версією або з QA-кандидатом, який явно базується на ній і ще не був задеплоєний.
- Перед будь-якою правкою окремо визначити: `current main`, останній успішний production deploy, його commit, `release.json`, version/build.
- Не вважати `main` автоматично production, якщо останній workflow/deploy не завершився успішно.

## AI-RULE-002 — перевірка репозиторію перед змінами

Перед змінами обов’язково перевірити:

- актуальний репозиторій;
- останній commit у `main`;
- останній успішний production release/deploy;
- GitHub Actions стан;
- `package.json`;
- `release.json`;
- PWA/service-worker build coherence.

## AI-RULE-003 — `main` не використовується для тестування

- `main` — production-only.
- Не пушити у `main` проміжні `fix`, `fix2`, `final-final`, browser fixes або QA-експерименти.

## AI-RULE-004 — усі зміни тільки в `qa/vX.X.X-*`

- Кожна функціональна/UX/SEO/backend правка виконується в окремій QA-гілці `qa/vX.X.X-*`.
- Після виправлень у цій же гілці повторно проходить повний QA.
- Merge у `main` дозволений лише після FULL QA GREEN.

## AI-RULE-005 — scope lock бізнес-логіки

Не змінювати поза погодженим завданням:

- бізнес-логіку;
- фінансові формули;
- тарифи доставки;
- доступність/ресурси техніки;
- SMS/RETURN/referral правила;
- Supabase schema/functions/settings;
- ціни, знижки, передплату, залог або settlement rules.

Якщо для виправлення потрібна суміжна зміна — спочатку явно визначити її як dependency, оновити відповідний contract у цьому документі й додати regression test.

## AI-RULE-006 — QA кожної частини продукту окремо

Кожен реліз окремо перевіряє:

- public-сайт;
- Smart Guide / квіз;
- підбір комплекту;
- public booking;
- admin;
- installed PWA;
- mobile/browser responsive;
- Technical SEO;
- analytics/attribution;
- Supabase/static contracts, якщо вони зачеплені.

Green одного шару не означає green усього продукту.

## AI-RULE-007 — повний regression QA після кожного fix

Після кожного виправлення failure або regression повторно запускається **весь повний regression QA**, а не тільки тест, який впав.

Якщо test застарів через погоджену нову архітектуру, його можна оновити тільки після оновлення цього System Spec. Не послаблювати assertion лише заради green.

## AI-RULE-008 — зелений build ≠ готовий реліз

Реліз не вважається готовим лише тому, що:

- `npm run build` успішний;
- Static / build gate зелений;
- частина browser suites зелена.

Готовність = усі обов’язкові static/regression/browser/PWA/responsive gates реально пройдені.

## AI-RULE-009 — перевірка Actions, deploy і `release.json`

Перед фінальним релізом обов’язково перевірити:

- точний GitHub Actions run і всі jobs;
- exact logs кожного failure;
- фактичний deployed commit;
- реальний сайт після deploy;
- `release.json` на задеплоєному сайті;
- version/build/PWA/SW coherence.

Не писати `FULL QA GREEN`, якщо хоча б один з цих пунктів не перевірений.

## AI-RULE-010 — ізоляція VA HOME у спільному Supabase

VAcleaner і VA HOME можуть використовувати спільний Supabase project, але **VA HOME є окремим продуктом**.

Під час роботи над VAcleaner заборонено без прямого окремого погодження:

- змінювати таблиці/дані VA HOME;
- змінювати VA HOME Edge Functions;
- змінювати VA HOME auth/settings/storage;
- запускати migrations, які зачіпають VA HOME objects;
- перейменовувати або видаляти shared objects без доказу, що VA HOME їх не використовує.

Будь-яка Supabase mutation для VAcleaner повинна бути scope-checked на відсутність впливу на VA HOME.

## AI-RULE-011 — Source of Truth оновлюється з кожною зміною

Після кожної погодженої поведінкової зміни оновлюється єдиний source of truth: `docs/VAcleaner-SYSTEM-SPEC.md`.

Обов’язково:

1. оновити/додати affected contract;
2. додати change record;
3. додати або оновити regression test;
4. зафіксувати, що спеціально PRESERVED;
5. не дозволяти CI пропустити behavioral diff без оновлення System Spec.

Якщо код і System Spec суперечать один одному — код вважається regression, доки зміна не була окремо погоджена й внесена у Source of Truth.

---

# 2. DOMAIN MODEL / ДЖЕРЕЛА ПРАВДИ

## DATA-001 — бронювання

Source of truth: `vacleaner_bookings` + `vacleaner_booking_resources` + snapshot у `extras`.

Ключові сутності бронювання:

- booking code;
- product code;
- resources;
- дати/слоти;
- fulfillment;
- customer data snapshot;
- base amount;
- extras amount;
- delivery amount;
- total amount;
- prepayment;
- deposit;
- issue payment;
- return payment;
- status;
- promo/discount snapshot;
- settlement snapshot;
- route/delivery metadata, якщо фактично відомі.

## DATA-002 — клієнт

Source of truth: `vacleaner_customers`.

Customer profile зберігає актуальні:

- ПІБ;
- телефон;
- Instagram;
- Telegram;
- preferred channel;
- чисту адресу будинку;
- документ;
- marketing consent;
- referral send metadata.

**Актуальний customer profile має пріоритет над старим booking JSON** для контактів.

## DATA-003 — ресурси техніки

`product_code` — це комерційний продукт/комплект.  
`resources` — це фізична техніка, яка реально входить у бронювання.

Приклад:

- `puzzi_jimmy` → `puzzi + jimmy`;
- `combo` → `puzzi + sc2`;
- `general` → `puzzi + sc2 + jimmy`;
- `elite / HOME RESET` → `puzzi + sc2 + jimmy + abir`.

Фінансова окупність фізичної техніки не повинна визначатись пошуком слова у назві продукту.

## DATA-004 — налаштування

Глобальні бізнесові налаштування мають зберігатися серверно через `vacleaner_settings`, а не тільки в `localStorage`.

Локальний браузерний стан допустимий лише для UI preference/cache, але не для фінансової правди бізнесу.

## DATA-005 — unknown ≠ zero

У бізнесових метриках:

- `0` = достовірно відомий нуль;
- `null / missing` = даних немає.

Невідомі дані не можна автоматично перетворювати на `0 грн`, `0 км`, `8 км` чи іншу умовну цифру.

UI у такому випадку показує:

- `Недостатньо даних`;
- `Відстань не зафіксована`;
- `Не налаштовано`;
- інший точний empty-state.

---

# 2A. PUBLIC WEBSITE — ПОВНИЙ SOURCE OF TRUTH

Цей блок описує **публічний сайт VAcleaner**, а не лише адмінку. Він є нормативним для головної, каталогу, Smart Guide, бронювання, сторінок техніки, рішень, комплектів, доставки, умов, блогу, SEO, аналітики й public responsive UX.

**Правило:** зміна public JS/CSS/HTML/config, яка змінює поведінку або видимий UX, повинна оновити відповідний `WEB-* / QUIZ-* / PUBBOOK-* / TECH-* / PUBVIS-* / SEO-*` contract і regression test.

---

## WEB-001 — роль публічного сайту

Публічний сайт не є просто каталогом техніки. Його funnel:

`задача клієнта → зрозуміле рішення → техніка/комплект → дата → отримання → контакти → заявка`.

Клієнта не змушують знати слова `екстрактор`, `ресурс`, `product_code` чи інші внутрішні терміни. Комунікація описує **що можна почистити і який результат отримати**.

Основні CTA:

- `Підібрати рішення / Підбір за 30 сек` → `/pidbir/`;
- `Перевірити вільну дату / Забронювати онлайн` → `/bronuvannia/` або `/bronuvannia/?product=...`;
- контекстні CTA з solution/equipment/package page повинні передавати правильний `product`.

## WEB-002 — глобальна навігація

Основне public menu:

1. Що почистити → `/rishennia/`
2. Комплекти → `/komplekty/`
3. Як це працює → `/yak-tse-pratsiuie/`
4. Відгуки → `/vidhuky/`
5. Підбір за 30 сек → `/pidbir/`
6. Забронювати онлайн → `/bronuvannia/`
7. Контакти → `/kontakty/`
8. Instagram → `@vacleaner_washing.pl`

Footer додатково містить:

- Про VAcleaner;
- Поради / Blog;
- Доставка й оплата;
- FAQ;
- Умови оренди;
- Політика конфіденційності.

Навігація не повинна мати дубльованих пунктів, dead links, різних URL для однієї canonical сторінки або кнопок із однаковим текстом і різною логікою.

## WEB-003 — canonical public routes

Основні індексовані маршрути:

- `/`
- `/pidbir/`
- `/rishennia/`
- `/rishennia/textile/`
- `/rishennia/mattress/`
- `/rishennia/steam/`
- `/rishennia/windows/`
- `/komplekty/`
- `/bronuvannia/`
- `/tekhnika/karcher-puzzi-8-1/`
- `/tekhnika/karcher-sc-2-deluxe/`
- `/tekhnika/robot-dlia-vikon-abir/`
- `/vidhuky/`
- `/yak-tse-pratsiuie/`
- `/pro-nas/`
- `/dostavka/`
- `/faq/`
- `/umovy/`
- `/kontakty/`
- `/blog/`
- blog article routes із sitemap;
- `/polityka-konfidenciynosti/`.

Legacy static routes типу `/karcher-puzzi.html`, `/karcher-sc2.html`, `/abir-wd8.html`, `/jimmy-jv35.html` — compatibility/legacy layer. Вони не повинні ставати новими canonical destinations або створювати дубльований SEO-контент.

---

# 2B. PUBLIC HOME / РІШЕННЯ / КОМПЛЕКТИ

## WEB-HOME-001 — головна сторінка

Головна відповідає на питання **«що я можу почистити сам і як VAcleaner допоможе?»**.

Обов’язкова логічна ієрархія:

1. Hero: `Глибоке прибирання — без виклику майстра.`
2. Primary CTA до бронювання / перевірки дати.
3. Secondary CTA до Smart Guide.
4. Блок задач: дивани/крісла, матрац, кухня/ванна, вікна.
5. Сервісна цінність: підбір, чиста перевірена техніка, зрозумілий інструктаж, менеджер на зв’язку.
6. HOME RESET / маршрут повного прибирання.
7. Готові комплекти.
8. Реальний процес / відгуки.
9. FAQ / важливі умови.
10. фінальний CTA.

Головна не повинна перетворюватися на список усієї техніки без пояснення задач.

## WEB-SOL-001 — сторінка «Що почистити»

`/rishennia/` — task-first entry point.

Чотири основні напрями:

- текстиль → `/rishennia/textile/`;
- кухня/ванна/пара → `/rishennia/steam/`;
- матрац → `/rishennia/mattress/`;
- вікна/дзеркала → `/rishennia/windows/`.

Поряд із готовими напрямами завжди доступні:

- Smart Guide;
- загальне бронювання.

## WEB-SOL-002 — solution → product mapping

Нормативні primary recommendations:

| Solution | Primary product |
|---|---|
| Диван / м’які меблі | `puzzi` |
| Матрац із сухим пилом/алергенами + промивання | `puzzi_jimmy` |
| Кухня / ванна / плитка / шви | `sc2` |
| Тільки скло / дзеркала | `abir` |
| Вікна + рами/кути/стики | `ideal_windows` |

Solution page може пропонувати ширший комплект, але CTA `Перевірити вільну дату` не повинен передавати випадковий або неправильний product code.

## WEB-KIT-001 — комплекти

`/komplekty/` показує готові сценарії, а не технічний inventory list.

Публічні комплекти:

- `puzzi_jimmy` — Глибоке очищення диванів і матраців;
- `puzzi_abir` — Дивани + вікна;
- `combo` — Дивани + кухня та ванна;
- `general` — Генеральне прибирання;
- `ideal_windows` — Ідеальні вікна;
- `elite` — HOME RESET.

Кожна package card повинна:

- мати чітку задачу;
- показувати актуальну ціну з canonical catalog;
- пояснювати склад людською мовою;
- вести в `/bronuvannia?product=<code>`;
- не вигадувати інший склад, ніж `resources` у catalog.

## WEB-KIT-002 — HOME RESET

HOME RESET = `elite`:

- Puzzi;
- SC 2;
- Jimmy;
- ABIR;
- подарунок VA HOME Entry відповідно до чинної gift policy.

Подарунок не повинен змінювати rental revenue, resources або delivery fee. Gift UX не може маскувати основну ціну оренди.

---

# 2C. PUBLIC CATALOG / ТЕХНІКА

## TECH-001 — canonical catalog source

Source of truth для public catalog:

- `config/vacleaner.json`;
- stamped `assets/vacleaner-core.js`;
- server `vacleaner-settings` як remote refresh.

Public HTML не є незалежним джерелом ціни. Якщо remote settings недоступні, сайт використовує stamped canonical config, а не випадкові hardcoded альтернативи.

## TECH-002 — products, ціни та resources

| Code | Public label | Будні | 1 вихідний | Сб+Нд | Resources |
|---|---|---:|---:|---:|---|
| `puzzi` | Kärcher Puzzi 8/1 | 700 | 800 | — | Puzzi ×1 |
| `puzzi_jimmy` | Глибоке очищення диванів і матраців | 1050 | 1150 | — | Puzzi + Jimmy |
| `puzzi_abir` | Дивани + вікна | 1500 | 1700 | — | Puzzi + ABIR |
| `sc2` | Kärcher SC 2 | 500 | 600 | — | SC 2 ×1 |
| `abir` | Робот для вікон | 800 | 900 | — | ABIR ×1 |
| `combo` | Дивани + кухня та ванна | 1000 | 1200 | 1800 | Puzzi + SC 2 |
| `general` | Генеральне прибирання | 1300 | 1400 | 2200 | Puzzi + SC 2 + Jimmy |
| `ideal_windows` | Ідеальні вікна | 1200 | 1300 | 1900 | SC 2 + ABIR |
| `elite` | HOME RESET | 2300 | 2500 | 3500 | Puzzi + SC 2 + Jimmy + ABIR |

**Тарифи самостійно не змінювати.** Якщо ціни змінено погоджено, одночасно оновлюються config, server settings, public cards, booking, System Spec і regression tests.

## TECH-003 — rental day pricing

Pricing source: `VACLEANER_CORE.rentalBase()`.

- paid period залежить від дат і morning/evening slot;
- weekend moment має weekend rate;
- для продуктів із `saturdaySunday` повний двомоментний weekend використовує спеціальний тариф;
- UI summary і backend повинні використовувати ту саму семантику.

Не допускається окремий frontend calculator, який дає іншу суму, ніж backend.

## TECH-004 — canonical equipment pages

Публічні SEO/product pages:

### Kärcher Puzzi 8/1
`/tekhnika/karcher-puzzi-8-1/`

Має пояснювати:

- дивани/крісла;
- матраци;
- невеликі килими після перевірки;
- салон авто;
- 8 порцій базової професійної хімії з оплатою за використане;
- Stories bonus;
- інструктаж і підтримку;
- 5-step cleaning process;
- тарифи, залог, отримання, слоти;
- CTA з `product=puzzi`.

### Kärcher SC 2 Deluxe
`/tekhnika/karcher-sc-2-deluxe/`

Має пояснювати:

- кухня;
- ванна;
- шви/кути;
- тверді поверхні;
- обмеження матеріалів і необхідність перевірки;
- насадки, інструктаж, підтримку;
- CTA з `product=sc2`.

### ABIR WD8
`/tekhnika/robot-dlia-vikon-abir/`

Має пояснювати:

- звичайні склопакети;
- панорамні вікна;
- дзеркала;
- гладкі поверхні;
- робот не замінює ручне очищення рам/країв;
- базовий засіб для робота входить у комплект;
- CTA з `product=abir`.

Jimmy JV35 зараз не має окремої canonical SEO-сторінки в sitemap; він продається як частина сценарію/комплекту. Не створювати нову canonical сторінку без окремого рішення про IA/SEO.

## TECH-005 — product page consistency

На product page одночасно мають збігатися:

- назва;
- product code у CTA;
- weekday/weekend price;
- deposit group;
- склад комплекту;
- фото;
- linked solution;
- FAQ/умови;
- structured metadata.

Якщо змінено product code/label у catalog, product page та booking prefill не можуть залишитися зі старим alias як primary source.

---

# 2D. SMART GUIDE / КВІЗ

## QUIZ-001 — роль Smart Guide

`/pidbir/` і modal Smart Guide — один product logic.

Мета: за ~30 секунд визначити:

1. потрібний продукт/комплект;
2. релевантні додаткові засоби;
3. safety warnings;
4. передати результат у booking без повторного вибору.

Smart Guide не показує весь каталог хімії «про всяк випадок».

## QUIZ-002 — перший крок: зони

Клієнт може вибрати одну або кілька зон:

- диван / крісла (`textile`);
- матрац (`mattress`);
- невеликий килим (`carpet`);
- кухня (`kitchen`);
- ванна (`bathroom`);
- вікна / дзеркала (`windows`).

Вибір кількох зон повинен формувати один сумісний комплект.

## QUIZ-003 — textile branching

Для текстилю доступні проблеми:

- їжа/жир/косметика/невідома пляма → кандидат `spot_lifter`;
- кава/чай/вино/ягоди/натуральний сік → кандидат `stain_exit`;
- запах → додаткове питання про тип запаху;
- пил/шерсть/пилові кліщі/алергени → потреба у Jimmy;
- нічого з цього → лише базове очищення.

`none` взаємовиключний з іншими textile problems.

## QUIZ-004 — запахи

Типи запаху:

- urine → Neutralix;
- pet → Neutralix;
- unknown/local persistent → Neutralix;
- musty → Odour Zero;
- smoke → Odour Zero;
- food → Odour Zero.

Засіб має рекомендуватися з поясненням **чому базового промивання може бути мало** і що дає засіб.

## QUIZ-005 — kitchen branching

Проблеми кухні:

- regular dirt → Eco Clean;
- fresh/regular grease → Soft Degreaser;
- carbon → Grill Force тільки для safe material;
- light scale → Shower Care, якщо surface safe;
- heavy scale/rust → Scalex Pro тільки для acid-safe surfaces;
- odor → Odour Zero;
- corners → premium nozzles.

Для нагару обов’язково уточнюється surface:

- steel/enamel → Grill Force допустимий;
- aluminum/copper/teflon/painted/lacquered → не рекомендувати;
- unknown → не додавати агресивний засіб автоматично.

Для scale surface:

- glass/ceramic/chrome/stainless = acid-safe;
- aluminum;
- natural stone;
- painted;
- unknown.

## QUIZ-006 — bathroom branching

Проблеми:

- regular dirt → Eco Clean;
- light soap/lime scale → Shower Care на сумісних поверхнях;
- heavy scale/rust → Scalex Pro тільки acid-safe;
- grout/corners → premium nozzles.

Natural stone (`marble/travertine/dolomite`) не отримує кислотний засіб автоматично. Для регулярного догляду може бути Eco Clean.

## QUIZ-007 — windows branching

- `glass` → ABIR;
- `frames` (скло + рами/кути/стики) → рішення з SC 2 + ABIR.

Glass Perfect Care — необов’язковий фініш; базовий засіб для робота вже входить у комплект.

## QUIZ-008 — product decision matrix

Нормативна matrix:

| Selected need | Product |
|---|---|
| text only | `puzzi` |
| text + dry debris/allergens | `puzzi_jimmy` |
| hard surfaces only (kitchen/bath) | `sc2` |
| windows glass only | `abir` |
| windows + frames | `ideal_windows` |
| text + hard | `combo` |
| text + hard + Jimmy need | `general` |
| hard + windows | `ideal_windows` |
| text + windows | `puzzi_abir` |
| text + windows + Jimmy need або window steam | `elite` |
| text + hard + windows | `elite` |

Зміна цієї матриці — бізнесова зміна і потребує окремого погодження.

## QUIZ-009 — stain safety

Якщо одночасно `SPOT FIX` і `STAIN OX`:

- не використовувати одночасно;
- промити поверхню між етапами;
- протестувати на непомітній ділянці;
- для делікатної/невідомої тканини — погодження з менеджером.

Smart Guide не повинен радити сильну хімію без surface/material guard.

## QUIZ-010 — бонус −5%

Завершений Smart Guide передає promo `PIDBIR5`.

Booking URL:

`/bronuvannia?from=quiz&product=<code>&promo=PIDBIR5&extras=<codes>`.

На result screen:

- показується original weekday rental price;
- показується −5% rental price;
- selected extras додаються окремо;
- −5% не повинен знижувати delivery/chemistry/extras, якщо бізнес-правила не змінено.

## QUIZ-011 — quiz → booking continuity

Після переходу в booking:

- selected product уже вибраний;
- selected extras уже checked;
- promo already filled;
- показується preset banner;
- клієнт може змінити техніку/extra;
- не потрібно проходити Smart Guide повторно.

Якщо один preset extra відсутній у DOM/config, це error/regression, а не причина мовчки втратити решту selection.

## QUIZ-012 — analytics

Мінімальні events:

- `cleaning_quiz_started`;
- `cleaning_quiz_completed`;
- `cleaning_quiz_booking_click`.

Event повинен містити product і extras без PII.

---

# 2E. PUBLIC BOOKING

## PUBBOOK-001 — booking має 4 робочі кроки

`/bronuvannia/`:

1. **Техніка**
2. **Дата**
3. **Отримання**
4. **Контакти**

На mobile ці кроки працюють як компактний step flow; на desktop форма й summary можуть бути видимі одночасно.

Кнопка progress не повинна перескакувати `2 → 4`, губити введені дані або відкривати крок із невалідним прихованим field state.

## PUBBOOK-002 — крок 1 / вибір продукту

Booking показує canonical public products із `TECH-002`.

Додатково може бути Smart Entry `Що плануєте почистити?`, який лише фільтрує/ранжує релевантні продукти. Він **не створює іншу pricing/product logic**.

Якщо URL має `?product=<valid code>`:

- цей продукт preselected;
- UI показує compact `Ваш вибір`;
- клієнт може натиснути `Змінити техніку` і розгорнути каталог.

Invalid product code не повинен ламати форму.

## PUBBOOK-003 — draft restoration

Незавершене бронювання може зберігатися у session storage як draft.

Draft включає щонайменше:

- product;
- task;
- fulfillment;
- dates;
- slots;
- contact fields;
- comment;
- promo/address controls;
- active step.

Якщо відкрито URL з explicit preset (`product/from/promo/extras/hash`), external preset має пріоритет над старим draft.

Після успішного booking draft очищається.

## PUBBOOK-004 — крок 2 / дати і слоти

Слоти:

- Ранок `08:00–10:00`;
- Вечір `17:30–20:00`.

Source: `vacleaner-settings`, fallback canonical config.

Дата повернення не може бути раніше дати видачі. Rental duration/pricing використовує єдину core-логіку.

## PUBBOOK-005 — availability

Availability перевіряється по фактичних `resources`, а не лише по product label.

Якщо selected period unavailable:

- не дозволяти створити конфліктну бронь;
- показати найближче доступне вікно, якщо backend його повернув;
- CTA `Обрати <дата/ранок|вечір>` переносить suggestion у date controls;
- клієнт завжди може вибрати іншу дату вручну.

## PUBBOOK-006 — крок 3 / fulfillment

Два варіанти:

- Самовивіз · Полтава · 0 грн;
- Доставка.

Для самовивозу точну точку отримання не публікуємо автоматично; менеджер повідомляє її при опрацюванні заявки.

Для доставки address controls стають активними й обов’язковими відповідно до `PUBADDR-*`.

## PUBADDR-001 — public address structure

Public booking має:

1. **основне поле адреси** — вулиця + номер будинку;
2. **Під’їзд / орієнтир** — необов’язкова додаткова інформація.

У route/geocoding передається **лише чиста адреса будинку**.

Під’їзд/орієнтир не повинен погіршувати Google/OpenStreetMap routing або address match.

Для storage/display може використовуватися composed string із separator ` · `, але parser зобов’язаний вміти відокремити base address від details.

## PUBADDR-002 — autocomplete

Autocomplete:

- починає пошук після достатньої кількості символів;
- показує keyboard-accessible listbox;
- Arrow Up/Down — навігація;
- Enter — вибір;
- Escape — закриття;
- house number required для verified address.

Після verified selection зберігаються metadata:

- settlement;
- lat/lon;
- route/pricing distance, якщо доступно;
- distance source;
- verified state.

## PUBADDR-003 — manual fallback

Якщо address provider unavailable або точного match немає:

- **не блокувати бронювання назавжди**;
- дозволити manual address;
- показати, що менеджер перевірить адресу/тариф до передоплати;
- не вигадувати coordinates або distance.

Delivery booking без вулиці + номера будинку не submit-иться і має явну помилку.

## PUBADDR-004 — public delivery tariff

Поточна canonical логіка:

- Полтава / Розсошенці / Щербані / Горбанівка → 250 грн;
- інші адреси → distance-zone tariff згідно з canonical settings;
- якщо route quote не вдалось отримати або адреса поза стандартною зоною → `тариф підтвердить менеджер до передоплати`.

Не можна підставляти фіктивну відстань.

## PUBBOOK-007 — професійні засоби / extras

Extras показуються як **покупка окремого засобу, який залишається у клієнта**, якщо це саме така позиція.

Поточні active extras:

| Code | Public label | Price |
|---|---|---:|
| `premium_nozzles` | Насадки «Преміум» до SC 2 | 200 |
| `odour_zero` | Odour Zero · 250 мл | 250 |
| `neutralix` | Neutralix · 250 мл | 200 |
| `shower_care` | Shower Care · 250 мл | 250 |
| `soft_degreaser` | Soft Degreaser · 250 мл | 250 |
| `grill_force` | Grill Force · 250 мл | 250 |
| `scalex_pro` | Scalex Pro · 250 мл | 250 |
| `eco_clean` | Eco Clean · 250 мл | 250 |
| `spot_lifter` | VA SPOT FIX · 50 мл | 100 |
| `stain_exit` | VA STAIN OX · 30 мл | 100 |
| `glass_perfect` | Glass Perfect Care · 250 мл | 150 |

`carp_deta` — legacy/inactive; не повинен повертатися в public UI як active choice без погодження.

## PUBBOOK-008 — Puzzi base chemistry

Для Puzzi-вмісних продуктів:

- видаються 8 запечатаних порцій базового засобу;
- вони не входять автоматично у rental price;
- після повернення оплачується лише фактично використане по 50 грн/порція;
- невикористане повертається без оплати;
- Stories bonus: 2 використані порції безкоштовно за чинним правилом.

Цю модель не змішувати з extra bottles `SPOT FIX/STAIN OX/Neutralix/...`.

## PUBBOOK-009 — promo + loyalty

За телефоном public booking перевіряє loyalty і **активований** phone promo.

Loyalty:

- Start: 0–2 completed;
- Regular: −5% після 3 completed;
- VIP: −10% після 6 completed.

Promo і loyalty не сумуються; застосовується вигідніша допустима rental discount.

Delivery, extras та chemistry не знижуються через loyalty/promo, якщо contract не змінено.

**Важливо:** pending RETURN після самого SMS не повинен автоматично з’являтися на public booking як active discount. Public auto-apply дозволений лише для вже активованого персонального bonus.

## PUBBOOK-010 — contacts

Обов’язкові/доступні поля:

- ПІБ;
- телефон;
- Telegram — optional;
- Instagram — optional;
- preferred contact — phone / Telegram / Instagram;
- comment/задача;
- required consent;
- optional marketing consent окремо.

Preferred contact не може вказувати на канал, якого фактично немає; fallback → інший доступний канал або phone.

## PUBBOOK-011 — consent

Required consent для заявки:

- обробка контактних даних;
- acceptance `/umovy/`;
- acceptance `/polityka-konfidenciynosti/`.

Marketing consent — окрема необов’язкова дія. Не можна робити marketing consent умовою бронювання.

## PUBBOOK-012 — передплата і залог у public summary

Передплата:

- 200 грн;
- тільки після підтвердження заявки менеджером;
- закріплює дату;
- входить у вартість.

Залоговий платіж:

- окремий від вартості;
- залежить від product/deposit group і weekend policy;
- сплачується під час отримання;
- фінальний розрахунок робиться після повернення.

Public UI не може називати deposit частиною rental price.

## PUBBOOK-013 — deposit groups

Canonical groups:

- oneUnit: day 1000 / weekend 2000;
- twoUnits: day 1500 / weekend 3000;
- general: day 2000 / weekend 3000;
- elite: day 3000 / weekend 4000.

Weekend deposit визначається core period logic, а не просто `дата припала на суботу`.

## PUBBOOK-014 — summary

Summary повинно окремо показувати:

- product/rental;
- selected extras;
- delivery;
- promo/discount, якщо є;
- rental booking total;
- передплату як payment step;
- залог як separate refundable/security payment.

Невідомий delivery quote не можна показувати як 0 грн; UI пише `за погодженням / після підтвердження`.

## PUBBOOK-015 — submit

Submit не може «нічого не робити».

Перед create обов’язково валідні:

- product;
- period/slots;
- availability;
- fulfillment;
- address, якщо delivery;
- customer name;
- phone;
- required consent.

При validation failure:

- перейти/прокрутити до проблемного кроку;
- показати конкретну причину;
- focus проблемного control;
- не створювати duplicate booking.

При server/network failure — явний error state з можливістю повторити, без втрати введених даних.

## PUBBOOK-016 — success state

Після успішного create клієнт повинен розуміти:

- заявку прийнято;
- це ще не автоматично confirmed rental;
- менеджер опрацює заявку;
- передоплата сплачується після підтвердження;
- booking code/наступна дія відображається, якщо backend її повертає.

Draft очищається тільки після фактичного success.

## PUBBOOK-017 — query/preset contract

Supported entry params:

- `product`;
- `from=quiz`;
- `from=extras`;
- `promo`;
- `extras`.

Контекстний CTA з equipment/solution/package/quiz повинен передавати валідний product code. Query prefill не повинен блокувати можливість змінити вибір.

---

# 2F. PUBLIC VISUAL / RESPONSIVE UX

## PUBVIS-001 — загальний стиль

Public site має виглядати як **спокійний premium service**, а не marketplace чи технічна панель.

Основні візуальні принципи:

- editorial hierarchy;
- великі, але контрольовані hero headlines;
- теплий ivory/stone контент + dark premium sections;
- gold як accent/primary CTA, не як колір кожного елемента;
- достатній whitespace;
- картки без зайвої вкладеності;
- secondary text читається, а не стає надто світлим;
- жодного випадкового bold у кожному рядку.

## PUBVIS-002 — global container

Основні editorial sections орієнтуються на max content width близько `1380px` там, де це передбачено layout.

На вузьких екранах padding зменшується, але content не торкається країв і не створює horizontal overflow.

## PUBVIS-003 — mobile header/menu

На `≤620px`:

- header ≈ 68 px;
- burger control мінімум 44×44;
- desktop CTA у header не стискає logo/menu;
- mobile menu має scroll і safe-area bottom;
- menu не обрізає останні links;
- відкритий menu не залишає interactive content під собою.

## PUBVIS-004 — touch targets

Ключові public controls на mobile мають touch target не менше приблизно 44 px:

- CTA;
- menu;
- booking progress buttons;
- form buttons;
- FAQ summary;
- quiz options;
- select/dropdown interactions.

## PUBVIS-005 — booking responsive

Booking перевіряється мінімум на:

- 320;
- 390;
- 430;
- 1024;
- 1280;
- 1440;
- 1648 px.

На mobile:

- progress compact;
- один active step не має показувати частини іншого кроку;
- mobile summary не перекриває CTA;
- keyboard не ховає focused input;
- address suggestion list не виходить за viewport;
- довгі product/extras labels wrapping без горизонтального scroll.

На desktop:

- form і summary не створюють непропорційну пустоту;
- sticky summary не перекриває footer/fields;
- cards мають однаковий rhythm;
- CTA видно без пошуку по сторінці.

## PUBVIS-006 — quiz responsive

Smart Guide modal/page:

- не виходить за viewport height/width;
- body scroll — усередині modal;
- footer/result CTA не перекриває content;
- 320/390 px не обрізають тексти й prices;
- selected option state чітко читається;
- кнопка Back/Close залишається доступною;
- Escape закриває modal там, де це не standalone `/pidbir/`.

На standalone `/pidbir/` закриття повертає на головну, а не залишає пусту сторінку.

## PUBVIS-007 — equipment pages

Equipment page не повинна виглядати як нескінченний SEO-текст.

Потрібен rhythm:

- hero;
- use cases;
- що входить;
- процес;
- ціна/умови;
- real proof;
- guide links;
- CTA.

На mobile headings не повинні створювати 1–2 слова в рядку через завелику font-size.

## PUBVIS-008 — no visual regressions

Заборонено релізити public visual change, якщо є:

- horizontal overflow;
- обрізана modal;
- text/button overlap;
- різні висоти сусідніх controls без причини;
- недоступний CTA;
- невидимий focus;
- sticky element поверх поля;
- hero/text за межами screen;
- skeleton/error-looking block у normal state;
- duplicate CTA з різною логікою.

---

# 2G. PUBLIC TRUST / CONTENT

## TRUST-001 — «Як це працює»

`/yak-tse-pratsiuie/` пояснює сервісний процес:

1. клієнт описує задачу / проходить Smart Guide;
2. отримує точний підбір;
3. фіксує дату;
4. VAcleaner готує техніку;
5. проводить інструктаж;
6. підтримує під час роботи.

Ця сторінка не повинна створювати інші умови, ніж booking/terms.

## TRUST-002 — доставка й оплата

`/dostavka/` пояснює:

- самовивіз;
- delivery;
- передплату 200;
- залоговий платіж;
- CTA до terms і booking.

Цифри повинні братися з чинної бізнес-логіки. Якщо tariff changed, сторінка не може залишитися зі старим copy.

## TRUST-003 — умови

`/umovy/` — public contract summary, зокрема:

- booking/prepayment;
- cancellation/reschedule;
- rental term;
- pickup/delivery;
- document/contract;
- deposit;
- комплектність;
- return;
- support;
- loyalty;
- дбайливе користування.

Не додавати штрафи/умови, яких немає у погодженій бізнес-логіці.

## TRUST-004 — FAQ

FAQ copy повинно бути узгоджене з:

- 8 Puzzi packets;
- 50 грн за використану порцію;
- Stories bonus;
- delivery tariff;
- prepayment;
- deposit;
- document rule;
- cancellation rule;
- drying times;
- support.

FAQ — не окреме джерело правил; він відображає основні contracts.

## TRUST-005 — reviews

`/vidhuky/` та public proof blocks можуть вести до реальних Instagram Highlights.

Не вигадувати testimonial quotes або кількість відгуків, якщо це не підтверджено актуальним джерелом.

## TRUST-006 — contact channels

Public contacts:

- Telegram;
- Instagram;
- phone;
- Полтава.

Номер/username у header/footer/contact page мають бути узгоджені. Broken deep link у Telegram/Instagram — regression.

---

# 2H. BLOG / CONTENT SYSTEM

## CONTENT-001 — роль блогу

Blog — практичні матеріали, які ведуть до solution/quiz/booking, а не окремий контентний сайт.

Canonical topics включають:

- як почистити диван вдома;
- скільки сохне диван;
- як прибрати запах;
- як почистити матрац;
- що можна/не можна чистити пароочисником;
- як помити вікна роботом;
- робота з плямами;
- матрац після дитини.

## CONTENT-002 — safety/content accuracy

Гайд не повинен суперечити chemistry safety у Smart Guide/product pages.

Особливо:

- не радити агресивно втирати пляму;
- не змішувати SPOT FIX/STAIN OX;
- тест на непомітній ділянці;
- не використовувати кислотні/агресивні засоби на несумісних матеріалах;
- не давати гарантію видалення плями/запаху.

---

# 2I. PUBLIC SEO / TECHNICAL

## SEO-001 — canonical / sitemap / robots

Кожен indexable route має:

- self-consistent canonical;
- коректний title/description;
- locale `uk_UA`, де доречно;
- sitemap inclusion, якщо сторінка повинна індексуватися;
- robots policy без випадкового `noindex`.

404 / internal utility route не повинні потрапляти в sitemap як normal content.

## SEO-002 — local intent

Public core pages повинні послідовно комунікувати **Полтаву** без keyword stuffing.

Не створювати fake location pages для районів/передмість лише заради SEO.

## SEO-003 — structured data

LocalBusiness / relevant structured metadata повинні містити актуальні:

- VAcleaner;
- site URL;
- phone;
- area served;
- social profile.

Не залишати старі ціни/контакти у JSON-LD після зміни visible site data.

## SEO-004 — 404 / redirects

Неправильний URL повинен мати нормальний 404 experience і шлях на головну.

При перенесенні canonical page старий URL отримує контрольований redirect/compatibility behavior; не створювати silent duplicate pages.

## SEO-005 — metadata coherence

Build stamping не повинен зламати:

- favicon;
- apple-touch-icon;
- OG images;
- canonical;
- GTM;
- sitemap;
- static route asset paths.

---

# 2J. PUBLIC ANALYTICS / ATTRIBUTION

## WEBANA-001 — GTM/GA4

Public site зберігає GTM/GA4 integration. UI/CSP/performance cleanup не повинен випадково видалити tracking container із production pages.

## WEBANA-002 — booking funnel

Мінімально важливі funnel events:

- booking started;
- product/task selected;
- quiz started/completed/booking click;
- booking success;
- source/attribution, якщо доступно.

Analytics не повинна містити document number або інші чутливі PII.

## WEBANA-003 — attribution

Перехід із Instagram/Google/direct/quiz/product page не повинен ламати source attribution під час SPA-like navigation або booking preset.

---

# 2K. PUBLIC RESILIENCE / ACCESSIBILITY

## WEBRES-001 — remote settings fallback

Якщо `vacleaner-settings` тимчасово недоступний:

- public catalog/slots повинні працювати зі stamped canonical config;
- booking не повинен стати білим екраном;
- UI може показати stale/fallback data лише якщо вона є частиною цього build.

## WEBRES-002 — address provider failure

Address provider failure не блокує заявку з валідною manual address, але tariff позначається як такий, що потребує підтвердження.

## WEBRES-003 — keyboard/focus

Public interactive controls повинні мати:

- видимий focus;
- logical tab order;
- Escape для modal/menu, де доречно;
- keyboard address list;
- no focus trap bugs;
- після validation error focus переходить до проблемного field.

## WEBRES-004 — JS enhancement principle

Runtime enhancement layer не повинен дублювати уже наявний DOM-функціонал так, щоб з’являлося дві однакові кнопки/форми/CTA.

MutationObserver enhancement має бути idempotent: повторний scan не створює duplicate block.

## WEBRES-005 — public service worker/cache

Public service worker:

- не повинен кешувати старий JS/CSS після build bump;
- cache version = release build;
- admin route не повинен випадково отримати public service-worker behavior, який ламає admin PWA;
- network update не може залишити суміш assets різних build.

---

# 2L. PUBLIC CROSS-CONTRACTS

## CROSS-001 — config → cards → booking → backend

Для кожного product зміна має пройти ланцюг:

`config/resources/price → public card → query CTA → booking selection → availability → backend create → admin booking`.

Якщо хоч один етап використовує інший code/resources/price — release blocked.

## CROSS-002 — quiz → booking

`quiz result product/extras/promo` = `booking preset product/extras/promo`.

Нічого не губиться між сторінками.

## CROSS-003 — booking → admin

У створеній public заявці admin повинен бачити те, що реально ввів/обрав клієнт:

- product/resources;
- dates/slots;
- fulfillment;
- address + delivery metadata;
- extras;
- customer contacts;
- preferred channel;
- promo/loyalty snapshot;
- comment;
- source.

## CROSS-004 — terms consistency

Ціни, delivery, prepayment, deposit, chemistry, loyalty, cancellation і document rules не можуть відрізнятися між:

- homepage;
- FAQ;
- delivery page;
- terms;
- equipment page;
- booking;
- admin.

## CROSS-005 — public visual change

CSS-only change все одно вважається behavioral, якщо вона може:

- приховати control;
- змінити responsive step;
- перекрити modal/footer;
- зламати click/focus;
- змінити visual hierarchy настільки, що primary action стає неочевидною.

Тому public CSS входить у System Spec gate.

---

---

# 3. ADMIN INFORMATION ARCHITECTURE

## NAV-001 — основні розділи

Адмінка має такі розділи без дублювання:

1. Бронювання
2. Календар
3. Найближчі
4. Техніка
5. Клієнти
6. Кампанії
7. Фінанси
8. Аналітика
9. Хімія
10. Налаштування

Не допускаються дубльовані пункти меню або однакові дії з різною логікою.

## NAV-002 — головна дія екрана

Кожен робочий екран повинен мати одну очевидну primary action.

Gold fill використовується насамперед для primary CTA; secondary actions не повинні конкурувати з ним.

## NAV-003 — контекст не губиться

Перехід з картки клієнта в конкретне бронювання зберігає `return context`.

Сценарій:

`Картка клієнта → Остання/активна оренда → ← До картки клієнта`.

Закриття detail не повинно змушувати менеджера повторно шукати клієнта.

---

# 4. GLOBAL SEARCH

## SEARCH-001 — області пошуку

Глобальний пошук шукає по:

- бронюваннях;
- клієнтах;
- ПІБ;
- телефону;
- booking code;
- referral code;
- витратах;
- кампаніях.

## SEARCH-002 — exact match priority

Точний збіг по:

- телефону;
- booking code;
- referral code

має підніматися вище нечітких текстових збігів.

## SEARCH-003 — UX видачі

Пошук не повинен розвалюватися у великі важкі колонки.

Результат має бути компактним ranked list із типом сутності та достатнім контекстом для одного кліку.

## SEARCH-004 — лічильники

Якщо UI показує лише частину результатів, текст повинен відрізняти:

- `знайдено N`;
- `показано X із N`.

Не можна писати `8 знайдено`, якщо знайдено 27, а відображено 8.

---

# 5. BOOKING — STATUS MACHINE

## BOOK-001 — основні статуси

Основний робочий ланцюжок:

`Нова (pending)` → `Очікує передплату (waiting_payment)` → `Підтверджена (confirmed)` → `Видана (issued)` → `Повернена (completed)`.

Додаткові неактивні стани:

- cancelled;
- declined.

## BOOK-002 — completed не ставиться ручною корекцією

Завершення оренди відбувається через settlement/return workflow, а не простим ручним status change.

Це потрібно, щоб не обійти:

- доплату;
- повернення депозиту;
- фактичне завершення;
- referral reward;
- фінансові snapshot-и.

## BOOK-003 — нова заявка

До підтвердження менеджер повинен мати можливість перевірити/зафіксувати:

- клієнта;
- контакти;
- документ/статус документа;
- умови;
- передплату;
- продукт;
- дати/слоти;
- fulfillment;
- адресу;
- bonus/promo;
- коментар.

## BOOK-004 — передплата

Передплата: **200 грн**.

Вона:

- вноситься після підтвердження заявки менеджером;
- закріплює дату;
- входить у загальну вартість.

## BOOK-005 — видача

Видача повинна фіксувати фактично отриманий депозит та платежі, а не тільки теоретичну суму.

## BOOK-006 — повернення

Return workflow повинен фіксувати:

- фактичну фінальну суму;
- доплату;
- повернення депозиту;
- завершення;
- snapshot знижок/promo;
- тригери referral, якщо застосовно.

---

# 6. BOOKING — ДАТИ ТА СЛОТИ

## SLOT-001 — часові слоти

Ранок: **08:00–10:00**.  
Вечір: **17:30–20:00**.

## SLOT-002 — мінімальний термін

Мінімальний термін оренди — одна доба.

## SLOT-003 — ресурсна доступність

Доступність бронювання визначається не лише `product_code`, а фактичними `resources`, щоб комплект не міг подвійно зайняти ту саму фізичну техніку.

---

# 7. BOOKING — АДРЕСА

## ADDR-001 — адреса є в кожному admin booking

У формі нового бронювання є одна редагована строка **Адреса** незалежно від fulfillment.

Вона потрібна як customer profile data навіть для самовивозу.

## ADDR-002 — повторний клієнт

Після введення телефону повторного клієнта:

- підтягується остання/збережена чиста адреса;
- менеджер може її відредагувати;
- адреса сама по собі **не перемикає** fulfillment на delivery.

## ADDR-003 — Google Maps address чиста

У маршрут передається тільки адреса будинку.

Приклад:

`Юрія Тимошенка 8, 7 під’їзд` →

- route address: `Юрія Тимошенка 8`;
- booking comment: `7 під’їзд`.

## ADDR-004 — під’їзд / орієнтир

Під’їзд, поверх, код домофона, орієнтир, уточнення двору — це **додаткова інформація/коментар**, а не Google Maps address.

## ADDR-005 — delivery validation

Якщо fulfillment = delivery:

- route-safe address обов’язкова;
- delivery pricing UI має бути видимим;
- submit не може мовчки нічого не робити;
- при помилці менеджер отримує точне пояснення.

## ADDR-007 — одна адреса в booking UX

Адреса редагується тільки в кроці **Клієнт**. Крок **Видача та оплата** не дублює повний текст адреси — він використовує те саме значення лише для тарифу та кнопки маршруту.

Для локальної адреси без явного префікса `Полтава,` (наприклад `Бульвар Богдана Хмельницького 12а`) система не повинна помилково трактувати її як передмістя.

---

# 8. CATALOG / PRODUCTS

Source of truth: `config/vacleaner.json`.

## CAT-001 — техніка та комплекти

| Код | Назва | Будні | Вихідний | Сб+Нд | Resources |
|---|---|---:|---:|---:|---|
| puzzi | Kärcher Puzzi 8/1 | 700 | 800 | — | Puzzi |
| sc2 | Kärcher SC 2 Deluxe | 500 | 600 | — | SC2 |
| abir | Робот для вікон | 800 | 900 | — | ABIR |
| puzzi_jimmy | Глибоке очищення текстилю | 1050 | 1150 | — | Puzzi + Jimmy |
| puzzi_abir | Текстиль + вікна | 1500 | 1700 | — | Puzzi + ABIR |
| combo | Дивани + кухня та ванна | 1000 | 1200 | 1800 | Puzzi + SC2 |
| general | Генеральне прибирання | 1300 | 1400 | 2200 | Puzzi + SC2 + Jimmy |
| ideal_windows | Ідеальні вікна | 1200 | 1300 | 1900 | SC2 + ABIR |
| elite | HOME RESET | 2300 | 2500 | 3500 | Puzzi + SC2 + Jimmy + ABIR |

Ціни не можна дублювати в UI вручну, якщо існує catalog source of truth.

## CAT-002 — Puzzi chemistry packets

Базова ціна однієї використаної порції: **50 грн**.

Story bonus та інша chemistry-логіка повинні бути окремою складовою від rental revenue.

## CAT-003 — назви

Комерційні назви мають використовувати canonical labels із catalog.

`HOME RESET` не можна самовільно повертати до старої назви.

---

# 9. DISCOUNTS / LOYALTY

## DISC-001 — знижки мають джерело

Кожна знижка повинна мати явне джерело:

- promo/campaign;
- loyalty;
- referral;
- manual discount;
- інше погоджене правило.

UI не повинен просто показувати зменшену суму без пояснення.

## DISC-002 — manual discount

Менеджер може застосовувати manual discount через контрольований editor.

Причина manual discount має бути збережена.

## DISC-003 — loyalty автоматична

Зароблений loyalty tier не повинен залежати від ручного toggle менеджера.

Менеджер не може випадково «вимкнути» вже зароблену клієнтом лояльність.

---

# 10. RETURN / SMS BONUS

## RET-001 — SMS sent ≠ active

Факт `sent/delivered` означає лише, що персональна пропозиція **видана**.

Вона ще не активна.

## RET-002 — стани RETURN

Логічна state machine:

`issued / pending` → `activated` → `used`.

Окремо можливий стан unavailable/expired.

## RET-003 — активація клієнтом

Бонус може активуватись через персональний link клієнта.

Після активації діє **21 день**.

Повторний перехід не повинен нескінченно продовжувати строк.

## RET-004 — ручна активація менеджером

Якщо клієнт звернувся напряму і показав/підтвердив SMS, при додаванні/редагуванні бронювання менеджер бачить pending RETURN та checkbox:

**Клієнт підтвердив SMS**.

Тільки після checkbox виконується server-side activation існуючого персонального promo.

Activation source фіксується як admin.

## RET-005 — auto apply

Автоматично застосовувати можна тільки **already active** bonus.

Pending SMS не може автоматично давати −10% лише через факт доставки SMS.

## RET-006 — used once

Після redemption цей самий RETURN не можна використати вдруге.

## RET-007 — ignored SMS

Якщо клієнт отримав SMS, не активував його і просто зробив звичайне бронювання — знижка автоматично не надається.

## RET-008 — приклад regression

Номер `0661301450` був показовим regression: SMS був delivered, персональний RETURN існував, але production backend не повертав pending state. Цей клас помилки повинен покриватися контрактом backend/frontend coherence.

---

# 11. REFERRAL — «ПРИВЕДИ ДРУГА»

## REF-001 — персональний код

Referral code:

- постійний;
- безстроковий;
- може передаватися кільком друзям.

## REF-002 — бонус друга

Друг отримує **−100 грн** на **першу оренду**.

## REF-003 — reward власника коду

Клієнт, який рекомендував, отримує **−150 грн** після успішного завершення оренди друга.

## REF-004 — reward lifetime

Reward діє **150 днів**.

Кожен завершений друг створює окремий reward.

Максимум один referral reward на одну оренду.

## REF-005 — канали відправки

Referral modal використовує актуальний customer profile.

Якщо є:

- Instagram — показати Instagram;
- Telegram — показати Telegram;
- обидва — показати обидва.

Preferred channel може бути primary, але не приховує інший доступний канал.

## REF-006 — Telegram fallback

Telegram:

1. `@username`, якщо є коректний username;
2. номер телефону як fallback.

## REF-007 — send analytics

Перший клік відкриває канал/копіює текст, але **не записує факт відправки**.

Лише після `Так, надіслано` send записується в referral analytics.

## REF-008 — видимість у client card

`Приведи друга` — важлива робоча дія картки клієнта; її не можна ховати внизу або робити недоступною.

---

# 12. CLIENT CARD — CRM HUB

## CLIENT-001 — дані картки

Картка клієнта містить:

- ПІБ;
- телефон;
- Instagram;
- Telegram;
- preferred channel;
- адресу;
- документ;
- кількість оренд;
- витрачено;
- останню оренду;
- історію оренд;
- відкриття конкретної броні;
- Нова оренда;
- активна/остання оренда;
- бонуси;
- SMS;
- Що робити далі;
- Приведи друга.

## CLIENT-002 — одна дія = одна логіка

Не допускається дві кнопки `Нова оренда`, якщо одна відкриває prefilled клієнта, а інша глобальну чисту форму.

Runtime compatibility/glass layer не має права інжектити дубльовані actions.

## CLIENT-003 — нова оренда з клієнта

`Нова оренда` з client card відкриває форму з prefill:

- ПІБ;
- телефон;
- актуальні контакти;
- адреса;
- loyalty/promo context.

## CLIENT-004 — мобільні KPI

На 390/430 summary KPI залишається компактним 2×2, а не чотири великі блоки по одному.

## CLIENT-005 — mobile actions

На мобільному:

- одна primary CTA;
- контакти компактні;
- referral видимий, але не перекрикує booking CTA;
- не повинно бути orphan button або гігантської вертикальної «драбини» дій.

## CLIENT-006 — save footer

Якщо дані не змінені, мобільний disabled footer `Зберегти` не повинен постійно забирати висоту.

При dirty state save action стає доступною.

---

# 13. CAMPAIGNS / SMS

## CAMP-001 — сегменти

RETURN-аудиторія формується за завершеними орендами та dormancy правилами, а не лише за ручним списком.

## CAMP-002 — consent / opt-out

SMS кампанії повинні поважати:

- explicit consent;
- legacy policy, якщо вона дозволена поточною логікою;
- opt-out;
- cooldown;
- наявність активної броні.

## CAMP-003 — cooldown

Після недавньої рекламної SMS клієнт не повинен автоматично знову потрапити в selectable audience, доки діє cooldown.

## CAMP-004 — UI кодів

Один або кілька promo codes не повинні створювати модалку з величезньою пустою висотою.

Список прокручується всередині; modal має адекватний max-height.

## CAMP-005 — RETURN backend coherence

Frontend action `pending_bonus` / `activate_bonus` має існувати у фактично deployed campaign Edge function тієї ж версії логіки.

Static code green при старому backend не вважається release green.

---

# 14. DELIVERY — ТАРИФИ

## DEL-001 — база

База доставки: **Європейська, 146Е**.

Вона використовується як route origin для внутрішнього розрахунку, але не повинна публікуватись як постійна адреса видачі там, де це юридично/SEO некоректно.

## DEL-002 — локальний тариф

Полтава, Розсошенці, Щербані, Горбанівка: **250 грн** у два боки за поточною бізнес-логікою.

Тарифи самостійно не змінювати без прямого погодження.

## DEL-003 — route multiplier

Реальний маршрут доставки:

`база → клієнт → база → клієнт → база`.

Тобто `one-way distance × 4`.

## DEL-004 — відстань

Для собівартості використовується тільки реально зафіксована one-way route distance.

Заборонено:

- `routeKm || 8`;
- виробляти 8 км з max zone;
- іншу умовну відстань.

## DEL-005 — останні 15 доставок

`Карта прибутковості доставки` використовує **останні 15 завершених реальних доставок**, а не умовний маршрут.

UI повинен чітко пояснювати sample:

- `Останні 15 завершених доставок`;
- `X із N мають відстань`.

## DEL-006 — два авто

Міський розхід:

- твоє авто: **11 л/100 км, А-95 бензин**;
- авто дружини: **10 л/100 км, LPG/газ**.

Для одного й того самого sample показується:

- собівартість, якби возило твоє авто;
- собівартість, якби возило авто дружини;
- за потреби середня між двома авто.

## DEL-007 — траса/передмістя

Траса/передмістя має окремий consumption setting і не змішується з міським розходом двох авто.

## DEL-008 — fuel settings hierarchy

У Settings візуально окремо:

1. База доставки;
2. Ціна палива: бензин / газ;
3. Розхід: траса/передмістя / твоє авто місто / авто дружини місто.

## DEL-009 — старі доставки без distance

Якщо зі старої доставки відомо, скільки клієнт заплатив, але route distance нема:

можна врахувати у:

- кількості доставок;
- середній отриманій ціні.

Не можна включати її у:

- fuel cost average;
- average route distance;
- margin after fuel.

## DEL-010 — ключова метрика

Головне питання блоку:

**Яка середня фактична ціна доставки і скільки після неї залишається після пального?**

## DEL-011 — локальний маршрут теж зберігається

Фіксований локальний тариф 250 грн не означає `routeKm = 0`. Після вибору точної адреси в локальній зоні система окремо рахує one-way route від бази і зберігає його для аналітики пального.

## DEL-012 — backfill старих доставок

Для останніх доставок без route distance адміністратор може повторно розрахувати маршрут за збереженою адресою. Зберігати backfill дозволено тільки коли address provider повернув точний будинок; приблизні координати вулиці не перетворюються на «факт». Якщо точного збігу нема — доставка залишається без distance.

---

# 15. FINANCE — EQUIPMENT PAYBACK

## FIN-001 — фізична техніка ≠ продукт

Окупність рахується по фізичному виду ресурсу:

- Puzzi;
- SC2;
- Jimmy;
- ABIR.

Не по комерційному package label.

## FIN-002 — стартова вартість

Для кожного виду техніки зберігається:

- кількість;
- стартова ціна за одиницю;
- загальна стартова вартість парку.

Приклад:

`2 Puzzi × 26 000 = 52 000 грн`.

Ремонт або ручка не може підмінити цю стартову базу.

## FIN-003 — global baseline

Equipment baseline зберігається глобально через settings API, не лише у браузері.

## FIN-004 — rental revenue only

В equipment payback не входять:

- доставка;
- хімія;
- deposit;
- extras, що не є rental price конкретної техніки.

Джерело — rental/base revenue після відповідних rental discounts.

## FIN-005 — комплекти

Якщо в оренді комплект, повна сума комплекту **не може** бути приписана кожній одиниці техніки.

Rental pool розподіляється між фактичними resources за versioned allocation model.

## FIN-006 — allocation invariant

Сума revenue allocation усіх resources одного booking:

**ніколи не перевищує rental revenue цього booking** і в нормальному завершеному snapshot дорівнює йому.

## FIN-007 — snapshot

При завершенні бронювання allocation бажано/потрібно заморожувати snapshot-ом із model version.

Пізні зміни тарифів не повинні переписувати історичну окупність заднім числом.

## FIN-008 — вкладення

Окремо показуються:

- стартова вартість;
- додаткові вкладення;
- ремонти;
- модернізації;
- виручка;
- % окупності;
- залишилось до окупності.

## FIN-009 — expense linkage

Нова витрата, яка стосується техніки, повинна мати явну прив’язку до виду обладнання.

Inference із тексту `vendor/note` допускається лише для historical fallback, не як основна модель нових записів.

## FIN-010 — окупність

Основний показник стартової окупності:

`розподілена rental revenue / стартова вартість парку`.

Ремонти та модернізації показуються окремо і не підміняють denominator без окремо погодженої метрики total invested capital.

---

# 16. FINANCE — ДОСТОВІРНІСТЬ

## FINTRUTH-001 — period completeness

Наявність хоча б однієї витрати в базі не означає, що витрати поточного місяця повністю внесені.

Фінансовий UI не повинен називати неповні дані «реальним прибутком» без відповідного status/caveat.

## FINTRUTH-002 — estimated vs actual

Якщо метрика використовує середній cost або неповні route/vehicle data, назва повинна бути `Оцінка` / `Попередня оцінка`.

`Фактична` / `Реальна` допускається лише при достатніх фактичних даних.

---

# 17. PUSH

## PUSH-001 — UI структура

Push settings окремо показують:

- статус;
- увімкнути / перепідключити;
- тест;
- назву пристрою;
- список підключених пристроїв.

## PUSH-002 — visual consistency

Input та button одного ряду мають однакову оптичну висоту, alignment та spacing.

## PUSH-003 — функції не ламаються CSS-правками

Зберегти:

- production subscription;
- test push;
- локальні notifications;
- admin icon;
- device naming.

---

# 18. PWA

## PWA-001 — bottom navigation

Bottom nav не повинна перекривати останній контент, footer форми чи CTA.

Standalone PWA content має резервувати safe bottom space.

## PWA-002 — keyboard

При відкритій клавіатурі mobile nav не повинна накладатися на inputs/CTA. Використовується той самий fixed nav node: він стає прозорим, неактивним і зсувається за робочу область; `display:none` / DOM recreation / layout reflow не використовуються. Після закриття клавіатури nav повертається на той самий safe-area inset.

Root shell не має панитися/скролитися у порожній простір через Safari keyboard behavior.

## PWA-003 — iPhone input zoom

Текстові input на iPhone мають достатній font-size, щоб Safari не викликав auto-zoom.

## PWA-004 — overflow

На 320/390/430 px не допускається horizontal overflow через:

- modal;
- table;
- action row;
- long code/phone;
- select/input;
- fixed/sticky element.

## PWA-005 — initial nav

Mobile navigation існує у початковому admin HTML і не повинна вдруге створюватися runtime-ом.

## PWA-006 — service worker

Кожен build має узгоджений SW/cache bust.

Старий cache не повинен залишати frontend на попередній логіці після production deploy.

---

# 19. UI / VISUAL SYSTEM

## UI-001 — typography hierarchy

- regular → secondary/meta;
- medium → основна робоча інформація;
- semibold/bold → заголовки, важливі суми, CTA.

Не робити весь екран bold.

## UI-002 — cards

Не упаковувати кожну цифру в окрему важку card без причини.

Nested card-in-card допускається лише коли є реальна зміна контексту.

## UI-003 — actions

Action row повинен витримувати реальну кількість кнопок без:

- orphan button;
- випадкового 4+1 layout;
- різної висоти;
- притиснутого тексту;
- переповнення.

## UI-004 — modal

Modal має:

- зрозумілий header;
- scrollable body при довгому контенті;
- footer, який не перекриває body;
- max-height під viewport;
- mobile safe areas.

## UI-005 — empty state

Порожній блок не повинен виглядати як skeleton/error.

Пояснення має сказати, чому даних нема і що робити далі, якщо дія можлива.

## UI-006 — desktop whitespace

Дві сусідні cards не повинні насильно мати однакову висоту, якщо це створює велику мертву порожню площу.

## UI-007 — compatibility layers

`admin-glass-test.*` або інший compatibility layer не повинен створювати другу бізнес-логіку поверх native admin runtime.

Він може стилізувати/маркувати, але не дублювати action ownership.

## UI-008 — finance surfaces

Фінанси не будуються як card-inside-card-inside-card. Усередині основної фінансової секції метрики та рядки мають використовувати separators, compact rows і спокійну типографіку. Окрема важка card потрібна тільки при реальній зміні контексту.

---

# 20. CALENDAR / UPCOMING

## CAL-001 — календар

Календар відображає ті самі booking facts/statuses, що й основний booking state.

Не допускаються різні status interpretations між Calendar і Bookings.

## CAL-002 — найближчі

Upcoming фокусується на операційних діях:

- видача;
- повернення;
- прострочення;
- очікування передплати.

---

# 21. ANALYTICS

## ANA-001 — роль Analytics

Analytics відповідає за:

- динаміку;
- повторних клієнтів;
- продукти;
- завантаження;
- джерела;
- тренди;
- referral funnel.

Finance відповідає за фінансову правду.

Не дублювати складну фінансову модель у двох незалежних реалізаціях.

## ANA-002 — completed

Метрики завершених оренд мають однаково визначати completed booking у всіх модулях.

---

# 22. CHEMISTRY

## CHEM-001 — source of truth

Назви, ціни, об’єм, active/legacy status та короткі описи chemistry зберігаються в catalog/config та/або відповідному backend source of truth.

Не дублювати ручні ціни в кількох UI-файлах.

## CHEM-002 — legacy products

Legacy/disabled позиція не повинна випадково повертатися у primary recommendations після unrelated UI change.

---

# 23. SETTINGS

## SET-001 — логічні групи

Settings не змішує різні сутності в одну випадкову сітку.

Delivery settings: база / fuel prices / consumption — окремими групами.

Equipment baselines — окремо від repairs/expenses.

Push — окремий блок.

## SET-002 — analytics не маскується під setting

Фактична profitability analytics не повинна виглядати як input setting.

Якщо в Settings є preview/calculator, він явно позначається як прогноз.

## SET-003 — task-focused tabs

Налаштування мають п’ять робочих вкладок: `Оренда`, `Доставка`, `Техніка`, `Сповіщення`, `Система`. Одночасно видима тільки одна вкладка. Це не декоративна навігація: кожна вкладка володіє своїм сценарієм і своїми save/actions.

- `Оренда` — часові слоти + залогові платежі;
- `Доставка` — тарифи + база + пальне/розхід;
- `Техніка` — стартова вартість парку;
- `Сповіщення` — push status/test/device naming/list;
- `Система` — production health.

Фактична прибутковість доставки не дублюється у Settings — вона живе у Finance.

## SET-004 — compact settings surfaces

Settings не будується як довга стіна рівнозначних cards. Усередині активної вкладки використовуються compact rows/tables/separators. Gold fill — тільки для основної save/action поточного сценарію. На 320–430 px вкладки можуть горизонтально прокручуватися, але сам page не має horizontal overflow.

---

# 24. ERROR HANDLING


## SET-005 — equipment baseline persistence

- `Кількість × ціна за 1 шт` має одразу показувати живу суму `Разом` до збереження.
- Екран техніки також має показувати загальну кількість одиниць і загальну стартову вартість усього парку; summary оновлюється під час вводу.
- Стартова вартість зберігається глобально через `vacleaner-settings`, а не лише в localStorage конкретного пристрою.
- Сирі backend-коди (`nothing_to_save`, `invalid_*`) не показуються менеджеру як текст toast.
- На PWA при numeric keyboard bottom navigation не повинна накривати input або save action.

## ERR-001 — кнопка не може «нічого не робити»

Submit/action завжди має один із результатів:

- success;
- loading;
- disabled із поясненням;
- видима validation error;
- server/network error.

Silent failure заборонений.

## ERR-002 — server errors

Відомі backend error codes повинні мапитися на людські повідомлення.

Не показувати менеджеру сирий `service_error`, якщо причина відома.

## ERR-003 — network

Offline/network error не повинен виглядати як validation error або скидання даних.

---

# 25. SECURITY / DATA SAFETY

## SEC-001 — customer PII

Customer PII не повинна потрапляти у release ZIP як historical import payload або debug fixture.

## SEC-002 — document photo

Фото документа — приватне, не публічний asset.

## SEC-003 — admin-only writes

Критичні зміни status, finance, promo activation, referral reward та customer documents виконуються через контрольований admin/backend path.

---

# 26. REGRESSION CONTRACT MAP

Цей розділ описує мінімальні тести, які повинні існувати після зміни відповідної логіки.

| Область | Контракти | Мінімальний regression gate |
|---|---|---|
| Booking core | BOOK / SLOT / ADDR | `test-v4-2-22-admin-truth-ux`, booking e2e, public_booking |
| Client card | CLIENT / NAV | client-card-mobile, glass, desktop-final |
| RETURN | RET | v4.1.30 return activation, client-promo-regression, v4.2.22 contracts |
| Referral | REF | v4.2.1, v4.2.9, v4.2.10, referral-admin-mobile |
| Delivery | DEL | delivery-settings, v4.1.47.2, v4.1.58, v4.2.22 |
| Finance | FIN / FINTRUTH | financial-control, finance truth, v4.2.22 |
| PWA | PWA | pwa-static, pwa visual, glass 320/390/430 |
| Campaigns | CAMP | sms-campaigns, campaign-sms-ux, client-promo-regression |
| Calendar | CAL | calendar-live, calendar-focused |
| Search | SEARCH | v4.2.22 + browser search scenario |
| UI | UI | glass, density, desktop-final, keyboard-nav |
| Public IA/catalog | WEB / TECH / CROSS | e2e, public-architecture, header parity, public visual contract |
| Smart Guide | QUIZ | smart-guide-logic, smart-guide-fit, quiz positioning, booking preset continuity |
| Public booking | PUBBOOK / PUBADDR | public_booking, booking CTA, booking step order, address fallback/provider/delivery tests |
| Public visual | PUBVIS | public visual contract, home/equipment density, inner heroes, content/growth visual |
| Public SEO/content | SEO / TRUST / CONTENT | public SEO audit, static copy integrity, growth content |
| Public resilience | WEBRES / WEBANA | e2e, booking resilience, keyboard-nav, process metadata, attribution checks |

**Правило:** якщо додана нова бізнесова можливість, для неї створюється новий contract ID та мінімум один автоматичний regression test.

---

# 27. ОБОВ’ЯЗКОВИЙ CHANGE PROTOCOL

Перед реалізацією будь-якої функції:

1. знайти affected contract IDs у цьому файлі;
2. описати очікувану зміну;
3. визначити, які існуючі інваріанти не можна змінити;
4. перевірити source of truth;
5. додати/оновити regression test **до merge**;
6. прогнати повний QA;
7. оновити Change record нижче.

Якщо зміна навмисно змінює старе правило:

- старий contract не видаляється мовчки;
- у Change record пишеться `CHANGED`;
- нова поведінка стає новою нормативною версією;
- тест на стару поведінку оновлюється лише після цього.

---

# 28. CHANGE RECORD TEMPLATE

Копіювати цей блок у наступному релізі:

```md
## Change record — vX.X.X

### ADDED
- CONTRACT-ID — що додали.

### CHANGED
- CONTRACT-ID — що було → що стало → чому.

### FIXED
- CONTRACT-ID — який regression виправлено.

### PRESERVED
- CONTRACT-ID — які сусідні правила спеціально перевірені, щоб не зламались.

### TESTS
- назва regression test;
- browser suite;
- responsive widths.
```

---

# 29. Change record — v4.2.22

### ADDED

- **REL-005** — System Spec стає обов’язковим release gate.
- **DEL-005/006** — profitability delivery рахується по останніх 15 завершених доставках окремо для 11 та 10 л/100 км, плюс середня між авто.
- **FIN-005/006/007** — bundle rental revenue розподіляється між фактичними resources, allocation заморожується versioned snapshot-ом при завершенні.
- **RET-004** — manager checkbox `Клієнт підтвердив SMS` для ручної activation pending RETURN.
- **ADDR-001/002** — адреса присутня у будь-якому admin booking та підтягується повторному клієнту з можливістю редагування.
- **WEB-001…003 / WEB-HOME / WEB-SOL / WEB-KIT** — повний source of truth для public IA, головної, рішень і комплектів.
- **TECH-001…005** — canonical public catalog, equipment pages, price/resources consistency.
- **QUIZ-001…012** — повна логіка Smart Guide: питання, branching, product matrix, chemistry safety, −5% і quiz→booking continuity.
- **PUBBOOK-001…017 / PUBADDR-001…004** — повний контракт public booking: 4 кроки, dates/slots, availability, delivery, address, extras, loyalty/promo, contacts, consent, deposit, submit/success.
- **PUBVIS / TRUST / CONTENT / SEO / WEBANA / WEBRES / CROSS** — visual, responsive, content, SEO, analytics, resilience та cross-layer contracts публічного сайту.

### CHANGED

- **CLIENT-004/005** — мобільна client card стала компактнішою: KPI 2×2, actions з нормальною ієрархією.
- **NAV-003** — booking detail, відкритий із client card, зберігає шлях назад.
- **SEARCH-001** — global search включає referral code.
- **FIN-003** — equipment baseline переноситься з browser-only storage у global settings source of truth.

### FIXED

- **DEL-004** — видалено вигаданий fallback `8 км`.
- **CLIENT-002** — прибрано duplicated client actions із compatibility/glass layer.
- **RET-001/005** — delivered SMS більше не прирівнюється до активного RETURN.
- **ADDR-003/004** — під’їзд/орієнтир більше не забруднює Google Maps route address.
- **ERR-001** — booking delivery UI синхронізується після customer lookup; submit не має мовчки провалюватися.
- **CAMP-004** — promo code modal не розтягується порожнім екраном.
- **PWA-001/002** — safe bottom та keyboard behavior не повинні перекривати робочі controls.

### PRESERVED

- **REF-001…008** — referral logic не змінюється.
- **BOOK-001…006** — статусний ланцюжок і settlement guards не змінюються.
- **CAT-001…003** — canonical catalog/resources не змінюються.
- **PUSH-001…003** — production push functionality не змінюється UX cleanup-ом.
- **WEB / QUIZ / PUBBOOK / TECH / PUBVIS** — поточна public funnel логіка зафіксована як нормативна й не може змінюватись мовчки наступними admin/backend релізами.

### TESTS

- `scripts/test-v4-2-22-admin-truth-ux.mjs`;
- `test:client-card-mobile`;
- `test:referral-admin-mobile`;
- `test:campaign-sms-ux`;
- `test:pwa-static`;
- `test:public-booking`;
- `test:public-visual-contract`;
- `test:smart-guide-logic`;
- `test:smart-guide-fit`;
- `test:public-seo`;
- `test:booking-cta`;
- `test:public-inner-heroes`;
- `test:home-mobile-density`;
- `test:equipment-mobile-density`;
- `glass` widths 320 / 390 / 430 / 1024 / 1280 / 1440 / 1648;
- full workflow suites перед production merge.

---

# 30. НЕ МОЖНА РОБИТИ

- Не вигадувати відсутні дані.
- Не змінювати тарифи без прямого погодження.
- Не використовувати `main` як QA branch.
- Не додавати другу реалізацію тієї ж дії у compatibility layer.
- Не визначати equipment finance по текстовій назві продукту, якщо є resources.
- Не вважати SMS delivered автоматично активованим RETURN.
- Не класти під’їзд у Google Maps address.
- Не втрачати client context при переході у booking detail.
- Не робити silent submit failure.
- Не оновлювати regression test лише «щоб став green», якщо реально зламана погоджена логіка.
- Не релізити behavioral change без оновлення цього System Spec.
- Не міняти public product/price/resources лише в HTML або лише в config — ланцюг config → card → booking → backend має залишатися coherent.
- Не ламати quiz → booking передачу product/extras/promo.
- Не радити у Smart Guide агресивну хімію без material/surface guard.
- Не блокувати public booking через недоступний address provider, якщо клієнт ввів валідну адресу вручну.
- Не показувати pending RETURN як active bonus на public booking.
- Не створювати public visual regressions (overflow/overlap/hidden CTA) під виглядом CSS-only правки.

# 31. Change record — v4.2.23

### ADDED

- **AI-ROLE-001 / AI-RULE-001…011** — нормативний operating contract для наступних AI/engineering змін: production baseline, QA branch, scope lock, full regression, deploy verification, VA HOME isolation і обов’язковий Source of Truth update.
- **REL-005** — System Spec Guard тепер перевіряє AI operating contracts як частину release gate.
- **ADDR-006** — admin booking має окреме редаговане поле `Під’їзд / орієнтир` так само, як public booking.

### CHANGED

- **ADDR-002/003/004** — repeat-customer restore розкладає legacy address на чисту route address + окремий entrance/landmark control; pickup при цьому не перемикається автоматично на delivery.
- **REL-002/005** — workflow явно запускає System Spec / AI contract gate до build; checkout history доступна guard-у для behavioral diff.

### FIXED

- **PWA-003 / ADDR-006** — виправлено GitHub Actions regression `mobile-390: repeat customer restores editable route address plus separate entrance/comment while pickup remains selected`.
- **QA-001** — прибрано Python `SyntaxWarning` у PWA fixture для regex `\D`.
- **QA-002** — legacy v4.1.34 address regression оновлено під погоджену архітектуру окремого `Під’їзд / орієнтир`, без послаблення route-address перевірки.
- **QA-003** — v4.2.22 address contract оновлено під ту саму погоджену архітектуру: clean route address зберігається окремо, access detail відновлюється у власному UI-контролі та при save переходить у booking comment.

### PRESERVED

- **RET-001…007** — RETURN pending → activated → used не змінюється.
- **DEL-001…006 / FIN-001…007** — доставка й окупність не змінюються цим fix.
- **PUBADDR-001…004** — public address UX і manual fallback не змінюються.
- **PUSH-001…003** — push не змінюється.
- **AI-RULE-010** — VA HOME objects у Supabase не змінюються.

### TESTS

- `scripts/test-v4-2-23-system-spec-pwa-guard.mjs`;
- `scripts/pwa_visual_qa.py` — exact repeat-customer address regression;
- `npm run check`;
- повний browser aggregate workflow перед production merge;
- responsive widths 320 / 390 / 430 / 1024 / 1280 / 1440 / 1648.



# 32. Change record — v4.2.24

### ADDED

- **DEL-011** — точна локальна адреса тепер зберігає реальний one-way route від бази навіть при фіксованому локальному тарифі 250 грн.
- **DEL-012** — у фінансах є керований backfill останніх доставок без distance; зберігаються тільки точні house-level маршрути.
- **DEL-013** — legacy delivery address перед backfill очищається від під’їзду/орієнтира/коментаря та повторно шукається через кілька нормалізованих варіантів; приблизні street-only координати як і раніше не записуються.
- **DEL-014** — production `vacleaner-admin-data-v1` підтримує authenticated `save_delivery_route`; backfill не вважається успішним, доки route snapshot реально не записаний у booking extras.
- **DEL-015** — після вибору локальної адреси UI завжди явно підтверджує модель доставки «до під’їзду» і можливість додати орієнтир; розрахунок route distance для аналітики не може прибирати це пояснення.
- **RET-001/004 coherence** — production `vacleaner-campaigns-v1` синхронізовано з source, щоб pending RETURN був видимий менеджеру до ручної активації.

### CHANGED

- **ADDR-007** — адреса редагується один раз у кроці «Клієнт»; крок «Видача та оплата» більше не дублює повний текст адреси.
- **DEL-002/011** — локальна адреса без тексту `Полтава,` все одно отримує локальний тариф, якщо це звичайна адреса вулиці/будинку.
- **UI-008** — блоки «Окупність техніки» і «Доставка по факту» переведені з nested tiles у compact rows / separators.
- **SET-003/004** — Налаштування переведені на 5 task-focused вкладок; активний сценарій показується один, profitability доставки перенесена тільки у Finance, а input-групи стали compact rows/table замість стіни cards.
- **UI-006** — Finance dashboard більше не розтягує сусідні блоки до однакової висоти й не створює великі порожні площі.

### ADDED / HARDENED

- **QA-004** — перед передачею ZIP запускається локальний `npm run qa:full`; release candidate не видається, якщо summary містить хоча б один failure.
- **QA-005** — локальний `qa:full` і GitHub Browser/Static gates повинні використовувати той самий перелік regression/browser suites; browser QA завжди завершує всі suites і лише потім агрегує failures.
- **PWA-004** — keyboard mode зберігає один і той самий fixed bottom-nav node: `opacity:0 + pointer-events:none + offscreen transform`, без `display:none`, `visibility:hidden` або DOM recreation.
- **ADDR-008** — крок «Видача та оплата» не друкує адресу вдруге; він показує тариф і route action, які використовують єдину адресу з кроку «Клієнт».

### FIXED

- **SET-005 / PWA-002** — збереження стартової вартості техніки більше не повертає сирий `nothing_to_save`: production `vacleaner-settings` синхронізований із source, totals рахуються одразу під час вводу, а клавіатура прибирає bottom nav з робочої області.
- RETURN для клієнта з доставленим SMS більше не зникає через відставання deployed campaign function від GitHub source.
- локальний booking більше не показує `0,0 км за межами Полтави` та порожній тариф для адреси типу `Бульвар Богдана Хмельницького 12а`.
- локальний autocomplete більше не записує `routeKm = 0` лише тому, що тариф фіксований.

### PRESERVED

- тариф локальної зони 250 грн не змінюється.
- RETURN лишається `pending → activated → used`; SMS delivered саме по собі не активує −10%.
- **FIN-004…010** — формули окупності й bundle allocation не змінюються цим visual/delivery fix.
- public booking, quiz, referral, push та VA HOME objects не змінюються.

### TESTS

- `scripts/test-v4-2-24-finance-delivery-return.mjs` — RETURN/delivery/finance/settings tab contracts, legacy-route normalization і backfill persistence;
- `scripts/pwa_visual_qa.py` — усі 5 settings tabs на mobile/PWA;
- `scripts/final_desktop_visual_qa.py` — усі 5 settings tabs на desktop;
- `npm run check`;
- `npm run check:backend`;
- `node --check assets/admin-v250.js`;
- `node --check assets/address-autocomplete.js`;
- full browser/PWA aggregate in QA branch before production merge.

# 33. Change record — v4.2.25

### ADDED

- Окремий тип пального для кожного міського авто: `petrol` для авто Вадима та `lpg` для авто дружини.
- Окреме поле «Під’їзд / орієнтир» у картці клієнта; воно не потрапляє в Google Maps route query.

### CHANGED

- Метрика доставки підписана як повний пробіг і показує розрахунок `відстань в один бік × 4`.
- Середні операційні витрати в деталях бронювання показують суму витрат і кількість завершених оренд, з яких отримано середнє.

### FIXED

- **UI-009** — глобальний пошук використовує тільки shell page heading; другий заголовок «Пошук» усередині результатів заборонений.
- **CRM-008** — збережені Instagram і preferred contact не губляться під час побудови картки клієнта з профілю та історії бронювань; після save UI повторно читає серверний стан.
- **ADDR-009** — картка клієнта й admin booking мають два окремі значення: route-safe «Адреса доставки» та необов’язковий «Під’їзд / орієнтир». У route calculation передається лише адреса будинку.
- **AUDIT-001** — блок «Історія бронювання» має реальний authenticated loader, empty/error/retry states і не може назавжди залишатися у стані «Завантажуємо історію…».
- **DEL-016** — кожен профіль авто зберігає fuel type. Твоє авто рахується за ціною А-95, авто дружини — за ціною LPG; спільна ціна бензину для обох авто заборонена.
- **DEL-017** — `Середній повний пробіг` прямо показує джерело формули: середня one-way route distance × 4.
- **FIN-011** — у booking margin показується база середніх операційних витрат: сума операційних витрат / кількість завершених оренд за останні 30 днів.
- **REF-008** — готовий текст referral-повідомлення видимий одразу; менеджер не повинен шукати його в закритому details-блоці.

### PRESERVED

- Тариф доставки, джерело маршруту, останні 15 завершених доставок і правило відсутності умовних кілометрів не змінені.
- Старі доставки без збереженого маршруту беруть участь тільки в кількості та середній отриманій ціні, але не у пробігу, пальному чи маржі.

### TESTS

- `scripts/test-v4-2-25-admin-qa-repair.mjs`;
- static, build, browser, desktop and PWA QA gates before release ZIP.
