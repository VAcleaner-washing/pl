# VAcleaner — SYSTEM SPEC / SOURCE OF TRUTH

**Статус:** нормативний документ продукту.  
**Baseline version:** 4.2.47  
**Baseline build:** 4247  
**Останнє оновлення:** 2026-09-01  
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
- Будь-яка зміна починається з актуального успішного production commit / release archive, що точно йому відповідає.
- Обов’язкова окрема QA-гілка **не використовується**: робота й перевірки виконуються локально в окремому release-candidate каталозі/архіві, не в `main`.
- У `main` дозволений тільки вже перевірений release commit.
- Проміжні `fix`, `fix2`, `final-final`, browser-fix або QA-експерименти у `main` заборонені.

## REL-002 — реліз лише після повного pre-commit QA

До production commit у `main` обов’язково:

- `npm run check`;
- усі regression tests;
- build/release coherence;
- Pages artifact;
- backend/static contracts;
- service worker/cache bust;
- усі локально доступні browser/PWA suites з canonical workflow;
- responsive QA: 320 / 390 / 430 / 1024 / 1280 / 1440 / 1648 px;
- **visual screenshot audit** мінімум на 320 / 390 / 430 / 768 / 1440 px;
- перегляд ключових екранів, а не лише генерація скрінів: overflow, overlap, clipping, вирівнювання, типографіка, відступи, safe-area, floating controls, модалки, hidden CTA;
- контрольні user-flow сценарії для змінених функцій: не лише render, а реальні click/save/confirm/back/retry стани;
- якщо дія змінює backend — перевірка фактичного persisted state, відсутності duplicate/partial-success і коректного retry;
- **changed-file audit**: кожен змінений файл має бути очікуваним для поточного scope; випадкові unrelated зміни блокують commit.

Visual audit повинен охоплювати ключові admin/PWA екрани (список і detail бронювань, клієнт, налаштування, фінанси, аналітика, кампанії, критичні модалки), а для shared/public змін — відповідні public home/quiz/booking екрани. Орієнтир — 20–30 контрольних скрінів на реліз; transient `visual-audit/` артефакти не входять у фінальний ZIP.

Не можна писати `FULL QA GREEN`, якщо частина обов’язкових suites фактично не запускалась або завершилась timeout/blocked. Якщо конкретний browser gate недоступний через середовище, це явно фіксується як blocker, а не маскується під green.

## REL-003 — один production commit

Після локального PRE-COMMIT GREEN:

- один release commit у `main`;
- без обов’язкової QA-гілки і без проміжних fix-комітів;
- одна версія;
- один build;
- один фінальний ZIP;
- GitHub Actions після commit є release verification gate: production deploy/закриття релізу дозволені лише після GREEN;
- фінальний ZIP має бути тотожним committed release tree або повторно зібраним із точного release commit.

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

## AI-RULE-004 — локальний release candidate до production commit

- Кожна функціональна/UX/SEO/backend правка виконується локально в окремому release-candidate каталозі/архіві, що базується на актуальному production baseline.
- Окрема `qa/vX.X.X-*` гілка не є обов’язковою і не повинна створювати зайву бюрократію.
- `main` не використовується як місце для експериментів: commit у `main` робиться лише після повного pre-commit gate.
- Якщо перевірки не GREEN — продовжувати виправлення локально, не створюючи серію проміжних production commits.

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

## AI-RULE-007 — targeted QA після fix + один повний QA перед commit

- Після кожного окремого fix запускається відповідний targeted regression/visual/user-flow test для зміненої зони.
- Після завершення всього пакета правок запускається **один повний regression/browser/PWA/responsive QA** перед production commit.
- Якщо targeted fix зачепив shared CSS, shell, data contract або backend dependency, scope перевірки розширюється на всі залежні екрани/сценарії.
- Якщо test застарів через погоджену нову архітектуру, його можна оновити тільки після оновлення цього System Spec. Не послаблювати assertion лише заради green.

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

## AI-RULE-012 — обов’язковий visual + scenario audit перед commit

Перед тим як сказати «можна комітити» або передати release archive:

1. згенерувати контрольні скріншоти ключових екранів мінімум на 320 / 390 / 430 / 768 / 1440 px;
2. **візуально переглянути** кожен контрольний скрін, а не покладатися лише на pixel/DOM assertions;
3. порівняти з попереднім стабільним visual baseline там, де зміна не повинна була впливати на екран;
4. пройти реальні сценарії змінених функцій із success/error/retry/back станами;
5. для backend mutations перевірити фактичний запис у Supabase і відсутність duplicate/partial state;
6. перевірити diff/changed-file scope перед commit;
7. не класти screenshot/test-result/debug артефакти у фінальний ZIP.

Візуальний дефект, який видно на контрольному скріні (криве поле, зміщення, обрізаний текст, чорна зона, overlap, неправильний safe-area, невірна типографіка), вважається release blocker навіть якщо automated assertions GREEN.

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
- окремо під’їзд / поверх / домофон / орієнтир у `address_detail`;
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

Canonical storage завжди розділене: `fulfillment_address` містить тільки адресу будинку, а `fulfillment_address_detail` — під’їзд / поверх / домофон / орієнтир. Composed string із separator ` · ` дозволений лише як legacy input для міграційного parser, але не для нового запису.

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

## NAV-004 — дочірня картка повертає в батьківський контекст

Якщо менеджер із booking detail або client card відкриває іншу картку / modal через робочу кнопку, новий шар отримує `return context`.

Користувацьке закриття через `×`, backdrop, `Escape` або явну кнопку `← Назад` повертає саме до попередньої картки/деталі, а не в корінь розділу. Успішна програмна дія (save/confirm/create), яка свідомо завершує flow, може закрити ланцюжок без автоматичного повернення.

Canonical приклади:

- `Бронювання → Картка клієнта → ×/Назад → Бронювання`;
- `Картка клієнта → Приведи друга → ×/Назад → Картка клієнта`;
- `Картка клієнта → Нова оренда → ×/Назад → Картка клієнта`;
- `Картка клієнта → Остання оренда → ← До картки клієнта`.

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

Повторний submit зі старої вкладки/модалки після вже успішної видачі не є бізнес-помилкою: UI перед записом звіряє актуальний статус, а backend трактує повторний `issued → issued` як idempotent retry. Сирий `invalid_transition` користувачу не показується.

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

`Юрія Тимошенка 8` + `7 під’їзд` →

- route address: `Юрія Тимошенка 8`;
- delivery detail: `7 під’їзд`.

## ADDR-004 — під’їзд / орієнтир

Під’їзд, поверх, код домофона, орієнтир, уточнення двору — це **окреме поле доставки**, а не Google Maps address і не `customer_comment`.

`vacleaner_customers.address_detail` зберігає актуальне значення профілю, а `vacleaner_bookings.fulfillment_address_detail` — незмінний snapshot конкретного бронювання. Старі склеєні адреси розкладаються data migration; placeholder `Історична доставка · адреса не збережена` не перетворюється на вигадану адресу.

## ADDR-014 — legacy backfill є production-міграцією, а не лише файлом у ZIP

Колонки `address_detail` / `fulfillment_address_detail` та backfill старих адрес вважаються виконаними тільки після фактичного застосування migration у production Supabase і перевірки даних. Parser/backfill повинен розуміти щонайменше `·`, ` - `, `–`, `—`, кому/крапку, `3 під’їзд`, `під’їзд 3`, `6й під’їзд`, `2п`, `подъезд 1`, поверх/домофон/квартиру/орієнтир. Номер будинку/корпусу не можна помилково переносити в detail.

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

Лише після явного підтвердження `□ Так, надіслано` send записується в referral analytics. Після успішного запису control переходить у явний стан `✓ Надіслано`, а referral status показує канал і час.

Запис повинен бути retry-safe: повтор після network/backend retry не створює дубль журналу, а якщо journal уже існує, customer/reward state доводиться до того самого `sent_at`.

## REF-008 — видимість у client card

`Приведи друга` — важлива робоча дія картки клієнта; її не можна ховати внизу або робити недоступною.

## REF-009 — referral modal communication UX

Referral modal використовує **актуальні контактні дані CRM**, а не випадковий старий snapshot бронювання. Порожнє або застаріле поле з іншого джерела не може затерти непорожній Instagram / Telegram / preferred channel актуального профілю.

Якщо preferred channel = Instagram, він лишається primary навіть коли username ще не збережений: у такому випадку CTA відкриває Instagram Direct/inbox без вигаданого username. Сам факт відсутності handle не дозволяє автоматично понизити preferred channel до Telegram.

- `Надіслати в Instagram` є першим і primary CTA;
- Telegram лишається доступним як додатковий канал, якщо він доступний через username або номер телефону;
- UI явно підписує основний канал.

Готовий referral-текст показується **одразу у відкритій картці**, без `details`/accordion. Кнопка копіювання знаходиться поруч із текстом.

Desktop modal не може залишати порожню праву колонку через невідповідність ширини `.modal-card` і внутрішньої referral-form: контейнер діалогу має відповідати реальній ширині контенту.

Двоетапне підтвердження фактичної відправки та referral analytics не змінюються.

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

## CLIENT-007 — desktop geometry

На wide desktop client card лишається візуально центрованою відносно viewport і не може виглядати «зсуненою вліво» через односторонній scrollbar gutter або grid-row, де коротка третя секція резервує порожню висоту.

Починаючи з 1221 px, CRM-контент формують три **незалежні вертикальні колонки** з однаковим gap і спільним центрованим max-width:
- контакти + referral;
- документ + next action;
- історія + бонуси + SMS.

На 1220 px і нижче wrappers стають `display: contents`, щоб зберегти існуючий tablet/mobile порядок і responsive contract.

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

## DEL-005 — останні 30 доставок з чесними знаменниками

`Карта прибутковості доставки` використовує **до 30 останніх завершених реальних доставок** (`fulfillment = delivery`), включно з історичними доставками, навіть якщо старий запис не має окремо збереженої ціни доставки або route distance.

Метрики мають різні чесні знаменники:

- sample count — усі фактичні завершені доставки у вибірці;
- average delivery price — тільки записи, де фактична ціна доставки відома;
- route/mileage/fuel — тільки записи з реальною route distance;
- `залишається після пального` — тільки записи, де одночасно відомі і ціна доставки, і маршрут.

Невідомі історичні значення не перетворюються на `0 грн` або `0 км`. UI прямо показує `X із N` для ціни, маршруту та matched sample, щоб менеджер розумів, по скількох доставках порахована кожна цифра.

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

## PWA-001 — edge-to-edge shell + bottom navigation

Standalone PWA використовує edge-to-edge content shell: основний scroll surface фізично доходить до верхнього і нижнього краю viewport.

На старті сторінки контент починається **нижче fixed Liquid Glass search** завдяки внутрішньому top padding. Під час скролу цей padding прокручується, тому контент проходить **під пошуком**, а сам пошук лишається fixed — як у нативному iOS 27 shell.

Bottom nav плаває **поверх** content surface. `.main` не може закінчуватися над navigation через `bottom: var(--mobile-nav-shell)` або подібний reserve. Замість цього достатній bottom padding гарантує, що останній робочий контент / footer / CTA можна повністю доскролити вище панелі, хоча фон і проміжний контент продовжуються під нею до фізичного низу екрана.

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

- 400–460 → helper/meta/описовий текст;
- 480–500 → field labels, status chips, secondary controls, table/service labels;
- 540–600 → робочі значення, суми, selected/primary state;
- 600–620 → назви секцій і карток;
- 650–680 → великі page/modal headings.
- у фінансових summary-рядках назви (`Передоплата`, `Залоговий платіж`, `Повернено клієнту`, `Доплату отримано`) залишаються 420–480; жирність належить сумі, а не всьому рядку.
- booking status (`Видана`, `Повернена`, `Підтверджена`), deposit chips та helper pills не повинні виглядати як headline; target = 500 або нижче.
- field labels (`Основний канал`, `Під’їзд / поверх / домофон / орієнтир`, `Телефон`, `Адреса доставки`) target = 500; значення поля не дублює їхню жирність.
- client loyalty/meta (`Regular · 3 завершених оренд · базова знижка −5%`) має окрему візуальну ієрархію: level та discount помітніші, completed count — medium, але це не суцільний bold-рядок.
- blanket rule `strong/b = 600+` для всієї адмінки заборонений; default strong/b = 560, вищі weight лише для семантично важливих значень/заголовків.
- 700+ допускається тільки для декоративного символу/іконки або свідомого одиничного бренд-акценту, але не для читабельного службового тексту.

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

## SEC-ADMIN-001 — фактичний admin auth

Admin/PWA входить через Supabase Auth. Кожен захищений Edge Function повторно перевіряє bearer token через `auth.getUser()` і наявність user ID в admin allowlist; browser role не має прямого доступу до критичних таблиць.

## SEC-ADMIN-002 — MFA не є чинним gate

MFA зараз не примусово вимагається. Міграція `20260813083000_vacleaner_admin_mfa_guard.sql` створила helper перевірки verified factor, але наступна міграція `20260813101500_vacleaner_remove_admin_mfa_guard.sql` його видаляє, а активні Edge Functions не перевіряють AAL2/MFA. Це фіксація фактичного стану схеми, а не припущення про причину rollback.

Повторне ввімкнення MFA є окремою security-зміною: потрібні погоджена політика, enrollment/recovery UX для обох admin-пристроїв, server-side AAL2 enforcement, аварійний recovery path і окремий regression/browser gate. Не повертати старий helper ізольовано від повного auth flow.

---

# 26. REGRESSION CONTRACT MAP

Цей розділ описує мінімальні тести, які повинні існувати після зміни відповідної логіки.

| Область | Контракти | Мінімальний regression gate |
|---|---|---|
| Booking core | BOOK / SLOT / ADDR | current `booking-return` + `address-resilience`, booking E2E, public booking |
| Client card | CLIENT / NAV | current `client-card` + `admin-navigation`, client-card mobile/visual, desktop-final |
| RETURN | RET | current `booking-return` + `stabilization`, client-promo-regression, persistence browser QA |
| Referral | REF | current `referral-core` + `referral-analytics` + `referral-contact`, referral browser QA |
| Delivery | DEL | delivery-settings, current `delivery-road-truth` + `address-resilience`, finance delivery visual |
| Finance | FIN / FINTRUTH | financial-control, current `finance-truth` + `finance-extra-breakdown`, stabilization acceptance |
| PWA | PWA | pwa-static, PWA visual/focus, glass 320/390/430 |
| Campaigns | CAMP | sms-campaigns, campaign-sms-ux, client-promo-regression |
| Calendar | CAL | calendar-live, calendar-focused |
| Search | SEARCH | current `admin-navigation` + route/browser search scenarios |
| UI | UI | current `admin-controls`, glass, density, desktop-final, keyboard-nav |
| Public IA/catalog | WEB / TECH / CROSS | E2E, current `public-architecture`, public visual contract |
| Smart Guide | QUIZ | smart-guide-logic, smart-guide-fit, booking preset continuity |
| Public booking | PUBBOOK / PUBADDR | public booking, booking CTA, E2E, current `address-resilience` |
| Public visual | PUBVIS | public visual contract/parity, home/equipment density, inner heroes, content/growth visual |
| Public SEO/content | SEO / TRUST / CONTENT | public SEO audit, current `public-seo`, static copy integrity, growth content |
| Public resilience | WEBRES / WEBANA | E2E, booking resilience, keyboard-nav, process metadata, attribution checks |

**Правило:** якщо додана нова бізнесова можливість, для неї створюється новий contract ID та мінімум один автоматичний regression test.

---

# 27. ОБОВ’ЯЗКОВИЙ CHANGE PROTOCOL

Перед реалізацією будь-якої функції:

1. знайти affected contract IDs у цьому файлі;
2. описати очікувану зміну;
3. визначити, які існуючі інваріанти не можна змінити;
4. перевірити source of truth;
5. додати/оновити regression test **до production commit**;
6. після кожного fix прогнати targeted QA, а перед commit — один повний regression/browser/PWA/responsive + visual screenshot audit;
7. перевірити changed-file scope і, якщо є backend mutation, фактичний persisted state;
8. оновити Change record нижче.

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

# 34. Change record — v4.2.26

### ADDED

- Окремий regression-контракт для desktop-grid кроку «Клієнт» у формі бронювання.

### CHANGED

- Паспортний блок і картка повторного клієнта завжди займають повну ширину двоколонкової форми.

### FIXED

- **UI-010** — прибрана «шахматна дошка», коли паспорт відображався праворуч, а картка повторного клієнта нижче ліворуч із великими порожніми зонами.

### PRESERVED

- На мобільному форма лишається одноколонковою; порядок полів і бізнес-логіка бронювання не змінені.

### TESTS

- `scripts/test-v4-2-26-booking-grid.mjs`;
- повний static/build regression перед передачею ZIP.

# 35. Change record — v4.2.27

### ADDED

- `vacleaner_customers.address_detail` — актуальний під’їзд / поверх / домофон / орієнтир клієнта.
- `vacleaner_bookings.fulfillment_address_detail` — snapshot уточнення адреси конкретного бронювання.
- Data migration для безпечного розділення старих склеєних адрес клієнтів і бронювань.

### CHANGED

- Canonical address storage більше не використовує composed string `адреса · під’їзд`; route address і courier detail мають окремі колонки та окремі API fields.

### FIXED

- **ADDR-010** — сайт, admin booking і картка клієнта більше не склеюють два поля перед збереженням.
- **ADDR-011** — під’їзд не копіюється в `customer_comment`; коментар клієнта зберігає тільки побажання клієнта.
- **ADDR-012** — повторний клієнт отримує два окремі редаговані значення з профілю або останньої доставки.
- **ADDR-013** — legacy-адреси на кшталт `Юрія Тимошенка 8, 7 під’їзд` і `18/12 під’їзд 3` розділяються без пошкодження номера будинку; історичний placeholder залишається без вигаданого маршруту.

### PRESERVED

- Google Maps, autocomplete і delivery quote отримують лише `fulfillment_address`.
- Крок «Видача та оплата» не дублює два input; він показує summary і route action.

### TESTS

- `scripts/test-v4-2-27-address-separation.mjs`;
- static/build regression та browser/PWA gates перед production merge.
# 36. Change record — v4.2.28

### ADDED

- **REF-009** — окремий contract для актуального CRM-каналу, видимого referral-тексту та геометрії referral modal.
- `scripts/test-v4-2-28-referral-modal.mjs` для захисту contact priority, primary CTA, always-visible message і dialog width.

### CHANGED

- Referral modal тепер бере Instagram / Telegram / preferred channel з актуального customer profile з безпечним fallback, не дозволяючи порожньому snapshot затерти непорожній контакт.
- Якщо основний канал клієнта — Instagram, Instagram стає першим primary CTA; Telegram лишається другим доступним каналом.
- Готовий текст повідомлення перенесений вище історії та завжди показується відкритим разом із кнопкою `Скопіювати текст`.
- Desktop dialog піджато до реальної ширини referral-контенту; порожня права зона прибрана.

### FIXED

- **REF-005/009** — клієнт із збереженим Instagram і preferred contact `instagram` більше не отримує Telegram як єдиний/основний CTA через порожнє поле в іншому snapshot.
- **REF-008/009** — текст повідомлення більше не виглядає як порожній або прихований нижній блок.
- **UI-004/006** — referral modal більше не має широкої мертвої колонки праворуч від фактичного контенту.
- **QA-004 / ADDR-011** — canonical PWA regression більше не очікує під’їзд у `customerComment`; create payload перевіряється по окремих `deliveryAddressDetail` / `customerAddressDetail`, а route address лишається чистою.

### PRESERVED

- Друг отримує −100 грн, власник коду −150 грн після завершення оренди друга, reward lifetime 150 днів.
- Telegram fallback за номером телефону, двоетапне `Так, надіслано` та referral analytics не змінені.
- Public booking, доставка, фінанси, RETURN, Supabase schema/functions і VA HOME objects не змінюються.

### TESTS

- `scripts/test-v4-2-28-referral-modal.mjs`;
- `scripts/referral_admin_mobile_qa.py`;
- `scripts/referral_modal_visual_qa.py`;
- `scripts/pwa_visual_qa.py` — create payload перевіряє ADDR-011: clean route address + separate address detail + untouched customer comment;
- повний static/build/browser/PWA/responsive QA перед production merge.



# 37. Change record — v4.2.29

### ADDED

- **NAV-004** — parent/child navigation contract для booking detail, client card, referral modal і new-booking modal.
- **ADDR-014** — production migration/backfill gate для фізичного розділення старих address/detail.
- Регресійний тест v4.2.29 на navigation context, legacy address parser, referral preferred Instagram та delivery sample denominators.

### CHANGED

- **DEL-005** — delivery profitability sample збільшено з 15 до 30 останніх фактичних завершених доставок; різні метрики мають окремі прозорі знаменники.
- **REF-009** — preferred Instagram не демотується до Telegram лише через відсутній username; Instagram primary CTA відкриває Direct/inbox.
- Referral modal використовує двоколонкову desktop-композицію: action/status + готовий текст одночасно в першому екрані, history нижче.
- Client card нормалізує legacy combined address при показі й передає окремий address detail у наступні flow.

### FIXED

- **UI-001/008** — фінансові рядки в booking detail більше не роблять назви типу `Повернено клієнту` жирними; label regular/medium, сума має окремий акцент.
- **UI-001** — проведений повний typography audit адмінки: bookings, calendar, upcoming, equipment, clients, campaigns, finances, analytics, chemistry, settings, client/referral/finance modals. Службовий текст понад 700 weight заборонений browser regression-ом.
- Старі формати адрес на кшталт `Полтава, Полтавська 3 · 3 підʼїзд`, `Полтавська 3 - 3 під'їзд`, `2п`, `подъезд 1`, `6й підʼїзд` розкладаються на route-safe address + detail. Додатковий pass 2 добирає випадки, де після під’їзду вже був окремий `кв/поверх` detail; production gate = 0 address-рядків із залишеним маркером під’їзду.
- Referral для клієнта з `preferred_contact = instagram` більше не показує Telegram як primary тільки тому, що Instagram username порожній.
- `Доставка по факту` більше не створює враження, що 9 доставок = весь sample: показує до 30 фактичних доставок і окремо coverage по ціні/маршруту.
- Користувацьке закриття дочірньої modal/card повертає в попередню картку/бронювання.
- **BOOK-005** — stale/double issue submit більше не показує `invalid_transition`: перед записом UI оновлює статус, а повторний `issued → issued` на backend є idempotent success.

### PRESERVED

- Невідомі historical delivery fee / route distance не вигадуються.
- Route calculation отримує тільки чисту адресу будинку; entrance/detail не входить у Maps route.
- Referral reward −100/−150, 150 днів, двоетапне підтвердження send та analytics не змінюються.
- VA HOME objects у спільному Supabase project не змінюються.

### TESTS

- `scripts/test-v4-2-29-admin-context-data.mjs`;
- `scripts/referral_modal_visual_qa.py`;
- `scripts/admin_typography_qa.py`;
- `scripts/admin_context_navigation_qa.py`;
- `scripts/pwa_visual_qa.py`;
- full static/build/browser/PWA/responsive QA перед production merge.


# 38. Change record — v4.2.30

### ADDED

- **FUN-001** — public та admin create мають opaque `clientRequestId`; retry/double tap не створює друге бронювання; DB unique index є фінальним guard.
- **FUN-002** — immediate public push і cron reminder ділять atomic `public:new:<bookingId>` dispatch key.
- **FUN-003** — peer admin push `new/issued/completed` має `peer:<event>:<bookingId>` dedupe key.
- **FUN-004** — reminder state містить лише активні бронювання й не росте безмежно.
- **FUN-005** — rental extension не імпортує pricing/config/settlement із pinned GitHub commit; stamp синхронізує локальні модулі з admin v4.
- **FUN-006** — referral send confirmation має short-window server idempotency для однакового phone/kind/channel/reward.
- **FUN-007** — active backend regression перевіряє `vacleaner-admin-bookings-v4`; v1/v2/v3 — тільки explicit legacy/rollback fixtures.

### CHANGED

- `vadym = Passat CC`, `anna = Fiesta`; labels нормалізуються за stable IDs.
- Canonical default бензину = 83 грн/л, LPG = 45 грн/л.

### FIXED

- Double create/retry, duplicate public push, concurrent reminder/peer push, unbounded reminder state, stale runtime GitHub imports, dead 15-delivery calculator, wrong v3 logger in active v4.

### PRESERVED

- Delivery tariffs, 4-leg fuel model, referral −100/−150, RETURN, settlement, address model та VA HOME objects.

### TESTS

- `scripts/test-v4-2-30-function-hardening.mjs`;
- `scripts/test-delivery-settings.mjs`;
- full static/build/browser/PWA regression.

# 39. Change record — v4.2.31

### ADDED

- **DELIVERY-ROAD-001** — `route_km` для собівартості означає дорожню відстань від бази до клієнта в один бік, а не пряму геодезичну відстань.
- **DELIVERY-ROAD-002** — картка бронювання показує `До клієнта X км`, повний пробіг `X × 4`, окрему оцінку Passat CC / Fiesta та середнє пальне.
- **DELIVERY-ROAD-003** — Finance показує середню відстань до клієнта як основну метрику; повний пробіг показується окремим поясненням `×4`.
- **DELIVERY-ROAD-004** — legacy `city/local/estimate/admin_backfill` не беруть участі у паливній собівартості, доки не перераховані по дорожньому маршруту. `manual_map` вважається валідною вручну перевіреною відстанню.
- **DELIVERY-ROAD-005** — у Finance Passat CC і Fiesta показуються окремими повноширинними рядками: назва/тип пального → `Пальне / доставка` → `Залишається після пального`; число та пояснення не злипаються, службові підписи regular/medium, суми мають стриманий акцент.
- **DELIVERY-ROAD-006** — технічні назви полів (`completed_at`, `route distance`) не показуються в інтерфейсі; користувацький текст пояснює `відстань до клієнта`, `повний пробіг ×4` і кількість маршрутів людською мовою.
- **QA-ROUTE-001** — new-booking request UUID має fallback для browser/CI context без `crypto.randomUUID()`, щоб modal не падав до рендеру.

### CHANGED

- `vacleaner-address-v1` використовує OSRM road route і всередині локальної зони Полтави; `road_city` відрізняється від старого `city`, який був прямою відстанню.
- Delivery vehicle cards у Finance на wide desktop йдуть окремими повноширинними рядками, без стиснення Passat CC / Fiesta в дві вузькі колонки.
- Технічні `completed_at` та `route distance` прибрані з користувацького тексту адмінки.
- Старі/відсутні маршрути можна перерахувати кнопкою; неоднозначні історичні адреси не підміняються вигаданими кілометрами.

### FIXED

- Занижена собівартість доставки через Haversine/straight-line `city` distance.
- `Пальне доставки: Не розраховано` для актуальної доставки з нормальною адресою: detail запускає автоматичне збереження дорожнього маршруту.
- Browser aggregate fail, де `#bookingForm` не відкривався через unavailable `crypto.randomUUID`.
- Navigation QA отримав deterministic wait на повернення parent detail після modal RAF.

### PRESERVED

- Формула поїздки = `відстань до клієнта × 4`: відвезти → назад → забрати → назад.
- Passat CC = А-95, 11 л/100 км місто; Fiesta = LPG, 10 л/100 км місто; траса = 7 л/100 км.
- Delivery fee, referral, settlement, promo/RETURN, address-detail separation та VA HOME objects не змінюються.

### TESTS

- `scripts/test-v4-2-31-delivery-road-truth.mjs`;
- `scripts/admin_context_navigation_qa.py`;
- `scripts/pwa_v424_focus_qa.py`;
- `scripts/glass_v4_qa.py`;
- `scripts/desktop_density_qa.py`;
- full static/build/browser/PWA regression + pre-commit visual screenshot/scenario audit before the single production commit.



# 40. Change record — v4.2.32

### ADDED

- **TYPO-010** — повний semantic typography contract для всієї адмінки: body/helper, labels/status, controls, values, section headings, page/modal headings мають окремі weight bands.
- **TYPO-011** — client loyalty header має окремі `level / completed rentals / discount` елементи замість одного суцільного meta-рядка.
- `scripts/test-v4-2-32-admin-typography.mjs` + розширений browser typography audit.

### CHANGED

- Загальний `strong/b` у admin shell знижено до 560; статуси, pills, field labels, secondary buttons і службові metadata — до 480–500.
- `Regular / VIP`, кількість завершених оренд та базова знижка в картці клієнта отримали окрему ієрархію, щоб важлива loyalty-інформація не губилась серед полів.
- `Основний канал` і `Під’їзд / поверх / домофон / орієнтир` в client card стали спокійнішими labels із чітким відривом від value/control.
- Booking settlement/deposit pills розділяють label і суму: текст regular/medium, сума semibold.

### FIXED

- `Видана`, `Попередньо повернути`, `Залоговий платіж … · отримано` та подібні operational labels більше не виглядають як однаково жирні CTA/headings.
- Прибрано blanket-bold ефект у bookings, calendar, upcoming, equipment, clients, campaigns, finances, analytics, chemistry, settings та client/referral/finance modals.

### PRESERVED

- Ключові суми, KPI, selected/primary actions і заголовки залишаються достатньо акцентними.
- Бізнес-логіка, delivery road-distance, referral, promo/RETURN, settlement formulas, Supabase schema/functions та VA HOME objects не змінюються.

### TESTS

- `scripts/test-v4-2-32-admin-typography.mjs`;
- `scripts/admin_typography_qa.py`;
- full static/build/browser/PWA regression + pre-commit visual screenshot/scenario audit before the single production commit.

# 41. Change record — v4.2.33

### ADDED

- **CLIENT-007** — desktop client card має окремий geometry contract: modal і внутрішній CRM-контент центровані, три wide-screen колонки незалежні по вертикалі.
- `scripts/test-v4-2-33-client-geometry.mjs`.
- Browser typography QA додатково перевіряє center offset client modal/grid на wide desktop.

### CHANGED

- На ≥1221 px секції client card згруповані у три незалежні вертикальні колонки: `Контакти + Приведи друга`, `Документ + Що робити далі`, `Історія + Бонуси + SMS`.
- Прихований scrollbar більше не резервує односторонній gutter у client editor.
- Mobile booking card ущільнена приблизно на 25–30 px за рахунок вертикальних paddings/flags/actions без зміни бізнес-логіки.

### FIXED

- Client card більше не виглядає зміщеною вліво на wide desktop, коли права history-колонка коротша за контакти/документ.
- GitHub `test:pwa` viewport-height regression для stacked booking card на 320/390 px.

### PRESERVED

- Typography hierarchy v4.2.32.
- Client data, referral, document privacy, history, promo/SMS logic.
- Delivery road-distance, settlement, promo/RETURN, Supabase functions/schema та VA HOME objects.

### TESTS

- `scripts/test-v4-2-33-client-geometry.mjs`;
- `scripts/admin_typography_qa.py`;
- `scripts/pwa_visual_qa.py`;
- full static/build/browser/PWA regression + pre-commit visual screenshot/scenario audit before the single production commit.



# 42. Change record — v4.2.34

### ADDED

- **PWA-007** — edge-to-edge standalone shell: контент проходить під fixed Liquid Glass search лише після скролу і продовжується під floating bottom navigation до фізичних країв viewport.
- `supabase/migrations/20260830164500_vacleaner_referral_phone_check_v4234.sql` — canonical phone validation для referral message journal без двозначного backslash escaping.
- `scripts/test-v4-2-34-pwa-referral-slots.mjs` — regression для PWA shell, settings time slots і referral confirmation.

### CHANGED

- **REL-001/002/003 + AI-RULE-004/007/012** — окрема QA-гілка більше не є обов’язковою. Робота й перевірки виконуються локально в release candidate; після кожного fix запускається targeted QA, а перед одним production commit — повний regression/browser/PWA/responsive gate, visual screenshot audit, user-flow/backend state і changed-file scope audit.
- Visual pre-commit audit тепер обов’язково генерує й **переглядає** контрольні скріншоти 320 / 390 / 430 / 768 / 1440; transient visual/test artifacts не входять у release ZIP.
- Standalone `.main` більше не резервує окремий чорний сектор над bottom navigation; safe-area доступність забезпечується scroll padding/content padding, а не обрізанням scroll surface.
- У referral flow після відкриття Instagram/Telegram confirmation control показує `□ Так, надіслано`; після успішного журналювання — `✓ Надіслано`.
- `referral_mark_sent` спочатку фіксує durable journal event, потім синхронізує customer/reward state; retry по вже існуючому event повторно доводить state без дубля журналу.
- Mobile settings time-slot editor використовує дві рівні колонки `З / До` замість пізнього чотириколонкового override, який стискав поле `З` до іконки.

### FIXED

- Чорний сектор під floating PWA navigation, внесений v4.2.22 правилом `pwa-standalone .main { bottom: calc(var(--mobile-nav-shell) + 8px) }`.
- Відсутність scroll-under-search ефекту у standalone PWA при fixed Liquid Glass top search.
- Валідні українські телефони `+380XXXXXXXXX` більше не відхиляються `vacleaner_referral_messages_phone_check`; помилка проявлялась як `Сервіс тимчасово недоступний` після `Так, надіслано`.
- Кривий mobile visual часових слотів у Settings, де перший time control міг схлопнутися до вузької іконки.

### PRESERVED

- Safe-area clearance для Dynamic Island / Home Indicator та keyboard-open behavior.
- PWA booking-card density v4.2.33 і 320/390/430 viewport contract.
- Referral reward: друг −100 грн на першу оренду, власник коду −150 грн після завершення; preferred channel та Instagram/Telegram routing.
- Referral send dedupe, booking idempotency, push dedupe, status flow, delivery/finance logic, VA HOME isolation.

### TESTS

- `scripts/test-v4-2-34-pwa-referral-slots.mjs`;
- `scripts/test-v4-2-22-admin-truth-ux.mjs` updated from obsolete reserve-above-nav assertion to edge-to-edge contract;
- referral UX + baseline compatibility regression;
- full static/build/browser/PWA regression + pre-commit visual screenshot/scenario audit before the single production commit.

# 43. Change record — v4.2.35

### ADDED

- `scripts/test-v4-2-35-finance-pwa.mjs` — static guard for desktop finance badge geometry and the direct PWA list/trailing-space QA contract.
- Wide-desktop browser assertions in `scripts/final_desktop_visual_qa.py` for compact deposit/margin information-block geometry.

### CHANGED

- Booking finance badges use one restrained rounded-rectangle language on desktop: settlement, deposit and preliminary margin are compact information blocks instead of oversized capsules.
- `test:pwa` no longer infers list density from the whole `.main.scrollHeight`; it validates the real `.booking-list` height from rendered cards + row gaps and separately verifies that the only trailing space is the intentional PWA safe-area padding.

### FIXED

- Desktop `Залоговий платіж` no longer renders as a large oval/capsule in the booking card. Amount is right-aligned, state remains secondary, and mobile geometry stays unchanged.
- GitHub Browser QA false-negative on `mobile-320: active booking list height follows the number of visible cards`, caused by font/layout metric drift of a few pixels around an indirect hard-coded whole-page threshold.

### PRESERVED

- v4.2.34 edge-to-edge PWA shell: initial content starts below search, scrolled content passes behind it, bottom content continues behind floating navigation.
- Referral confirmation/retry-safe journal, time-slot geometry, booking business logic, delivery/finance formulas, VA HOME isolation and all Supabase contracts.
- Pre-commit rule: targeted QA after each fix, then full static/build/browser/PWA/responsive regression plus reviewed visual screenshots and user-flow/backend checks before the single production commit.

### TESTS

- `scripts/test-v4-2-35-finance-pwa.mjs`;
- `scripts/pwa_visual_qa.py` direct list/trailing-space geometry;
- `scripts/final_desktop_visual_qa.py` finance badge geometry on wide desktop;
- full static/build/browser/PWA regression + reviewed screenshot audit before commit.



# 44. Change record — v4.2.36

### ADDED

- **ADDR-014** — legacy access-only comments such as `7 під’їзд` are treated as delivery access detail, never as a customer comment. Booking detail renders the access detail inside the delivery card under `Під’їзд / поверх / домофон / орієнтир`.
- `supabase/migrations/20260830154000_vacleaner_move_entrance_comment_v4236.sql` — conservative one-time backfill for delivery bookings where a pure entrance marker was stored in `customer_comment` and `fulfillment_address_detail` was empty.
- **REF-UI-006** — referral send state is visible next to the send controls: `○ Ще не надіслано` → `□ Підтвердіть відправку` → `✓ Надіслано · канал · час`.
- **REF-UI-007** — in installed iOS PWA, Instagram opens through the native `instagram://` app link without navigating VAcleaner into a blank browser sheet. The referral modal stays in the PWA and returns to the `□ Так, надіслано` confirmation state. Web/desktop keeps the regular Instagram URL.
- **SEARCH-UI-003** — global-search result rows are navigation lines, not glowing cards: desktop hover must not inherit the generic button halo, outline or horizontal movement; only a restrained surface tint is allowed.
- `scripts/test-v4-2-36-address-finance-referral.mjs`.

### CHANGED

- Mobile booking finance keeps settlement and deposit side by side when there is enough width, but deposit content is now an internal two-column information grid: label + nowrap amount, state on its own row. Words and `1 500 грн` may not split character-by-character.
- Referral status is duplicated at the action point so it remains visible even when the modal header is sticky and the scroll area is below the top summary.
- Booking edit/process payloads use the canonical access-detail fallback, preventing a legacy entrance-only comment from being saved back into `customerComment`.

### FIXED

- `7 під’їзд` no longer appears under `Коментар клієнта`; the affected production booking `VAC-260829-4489C` and matching customer profile were migrated to `fulfillment_address_detail` / `address_detail`.
- Mobile `Залоговий платіж` no longer breaks `Залоговий`, `1 500 грн` or the state into narrow character fragments.
- Referral modal no longer makes the manager hunt for the send checkmark after scrolling: confirmation/status is shown directly in the send block.
- Returning from Instagram no longer leaves an empty white browser sheet in front of the installed PWA; VAcleaner remains the preserved app surface.
- Global search no longer draws a bright rectangular halo/outline around result rows on pointer hover.

### PRESERVED

- Genuine customer comments remain untouched. The migration only moves a strict entrance-only value when booking detail is empty.
- Referral durable journal/dedupe and reward logic remain unchanged.
- v4.2.34 edge-to-edge PWA shell, v4.2.35 PWA list QA stability, delivery/finance formulas, status flow and VA HOME isolation remain unchanged.

### TESTS

- `scripts/test-v4-2-36-address-finance-referral.mjs`;
- full static/build/browser/PWA regression;
- reviewed 320/390/430 mobile screenshots for booking finance and referral action state;
- reviewed desktop global-search hover state and iOS standalone Instagram-launch contract;
- production DB verification for the migrated booking/customer.


# 45. Change record — v4.2.37

### ADDED

- **NAV-005 — exact return context.** Overlay routes preserve the full parent chain, not only the immediately visible entity. Canonical deep route: `Пошук → бронювання → клієнт → нова оренда/referral → назад → клієнт → бронювання → той самий пошук`.
- **SEARCH-004 — search snapshot.** Global search stores query, source view and `.main` scroll before opening booking/client/expense overlays. Closing the overlay restores the exact query and position instead of dropping the manager into `Бронювання`.
- Campaign search navigation gets an explicit `← До пошуку «…»` return control because campaign rows are full-page destinations rather than overlays.
- Mobile Settings tab rail exposes left/right overflow with a subtle fade cue and automatically reveals the active tab.
- `scripts/test-v4-2-37-admin-ux-polish.mjs` — static guard for deep navigation, search restore, calm hover and safe Instagram launch.

### CHANGED

- Client → booking routes now carry the original client options/parent context, so a booking opened from a client card can return to that card without losing the earlier booking/search parent.
- Saving a client card refreshes data without replacing the underlying route with a hard-coded Clients view; the same parent context remains available after save.
- Instagram contact actions in client card and booking processing use the same iOS standalone app-link launcher as referral, preventing VAcleaner from navigating into an empty browser sheet.
- Desktop hover language is intentionally calm: data rows/cards no longer move by `translateX/translateY`; secondary buttons use a restrained surface/border response; primary gold/green actions keep only a light depth cue.

### FIXED

- Global search `результат → detail → Назад` no longer clears the query or resets the manager to the default bookings list.
- Deep overlay routes no longer lose their grandparent context after `client → booking/new booking/referral → back`.
- Client-row chevrons and booking/upcoming cards no longer physically jump on pointer hover.
- Generic Glass button hover no longer adds a bright halo to every secondary control.
- Settings on 390px PWA no longer hides the existence of `Сповіщення / Система` with no visual affordance.

### UX CONTRACT

- `hover` may change surface/border/brightness, but must not reflow or translate information cards, list rows, search results or secondary controls.
- Every `×`, backdrop, `Escape` and explicit `← Назад` in a nested overlay moves back exactly one user-visible context unless a successful save/confirm action intentionally completes the flow.
- Global search is treated as a working context, not a temporary filter. Opening an overlay from search must be reversible without typing the query again.
- Installed iPhone PWA must keep VAcleaner as the preserved app surface when opening external Instagram actions.

### PRESERVED

- v4.2.36 address separation, referral sent-state and iOS Instagram referral launch remain intact.
- v4.2.35 finance badge geometry and direct PWA list-density contract remain intact.
- v4.2.34 edge-to-edge PWA shell, keyboard safe-area behavior, delivery/finance formulas, status flow, referral reward logic and VA HOME isolation remain unchanged.

### TESTS

- `scripts/test-v4-2-37-admin-ux-polish.mjs`;
- extended `scripts/admin_context_navigation_qa.py` with exact search restore and deep nested return route;
- `scripts/v4_2_37_route_smoke_qa.py` — fast real-browser breadcrumb smoke on 390px standalone PWA and 1440px desktop;
- full static/build/browser/PWA regression;
- reviewed interaction screenshots on desktop and 320/390/430 PWA before release ZIP.

## 45.6 PWA update prompt must never interrupt an operation

- Availability of a new service-worker build is secondary to the manager's current task.
- On mobile root views the update prompt sits **above** the floating navigation rather than on top of it.
- While any admin modal, booking detail layer, or software keyboard is active, the prompt is temporarily non-visible and non-interactive. It may reappear after the active task closes.
- An update prompt must never cover `Скасувати`, `Назад`, save/confirm actions, the iPhone Home Indicator clearance, or steal a tap from the current workflow.
- Regression coverage belongs to both the static v4.2.37 contract and real-browser route smoke.
- A nested client card uses an explicit `←` header control with the parent route in its accessible label. The unchanged mobile client card still does not waste height on a permanent footer.



# 46. Change record — v4.2.38

### ADDED
- Production history now has an auditable source-of-truth note for completed historical deliveries that used the confirmed 250 грн delivery tariff.

### CHANGED
- `scripts/admin_context_navigation_qa.py` no longer relies on a fixed 70 ms transition delay or positional `.chip:nth(...)` selection. It waits until the booking-detail shell is fully detached before interacting with the bookings list and targets the completed filter by `data-filter`.

### FIXED
- GitHub Browser QA flake where the hidden/closing `.detail-shell` could still intercept the click on the completed-bookings filter even though the navigation route itself was correct.
- Historical completed delivery records with missing `delivery_amount` were backfilled in production to the confirmed 250 грн tariff; the latest delivery profitability sample therefore uses 30/30 known prices and 29/30 matched price + road-route records.

### PRESERVED
- v4.2.37 deep route stack, exact global-search restoration, calm hover system, iOS Instagram return flow, PWA safe-area behavior and all booking/client/referral business rules remain unchanged.
- Current delivery tariff calculation for new bookings remains unchanged; this release does not replace or bypass the configured 250/350/manual tariff logic.

### TESTS
- `npm run test:admin-context-navigation` must pass with the detail shell fully detached before list interaction.
- `npm run test:v4.2.37-route-smoke` remains the canonical fast deep-route regression for PWA 390px and desktop 1440px.
- `npm run qa:static` and the canonical GitHub Browser QA aggregate remain release gates.


# 47. Change record — v4.2.39

### ADDED
- **UI-CONS-001 — shared admin period selector.** Analytics and Finance use one renderer for `7 днів / 30 днів / Місяць / Рік / Увесь час`, so identical controls cannot drift into different layouts.
- `scripts/admin_control_consistency_qa.py` compares the period controls across PWA and desktop viewports, including labels, height, radius and overflow.
- `scripts/test-v4-2-39-admin-control-consistency.mjs` guards the shared renderer and responsive geometry.

### CHANGED
- On PWA, the five period controls use one 3-column responsive grid in both Analytics and Finance; every visible period control keeps at least a 44 px touch target.
- On 1024–1320 px desktop, Analytics moves the shared period selector onto a full-width row before it can squeeze or overflow.

### FIXED
- Finance and Analytics no longer show visibly different `7 днів / 30 днів / ...` button geometry on iPhone.
- Analytics no longer creates horizontal overflow at 1024/1280 px when the title copy and five period buttons compete for the same toolbar row.

### PRESERVED
- v4.2.38 context-navigation stability and 250 грн historical-delivery backfill remain unchanged.
- v4.2.37 deep route restoration, calm hover, iOS Instagram return flow, PWA safe-area behavior and all booking/client/referral business rules remain unchanged.

### TESTS
- `npm run test:v4.2.39-admin-control-consistency`;
- `npm run test:admin-control-consistency` (94 geometry/style assertions across 390 / 430 / 1024 / 1280 / 1440);
- `npm run test:admin-control-consistency`;
- `npm run test:analytics-visual`;
- full static/build regression and canonical Browser QA remain release gates.

# 48. Change record — v4.2.40

### ADDED
- **PUBLIC-BOOK-UX-001 — progressive contact disclosure.** Public booking keeps only ПІБ + телефон on the default contact surface. Telegram / Instagram are hidden inside one optional `Зручніше в месенджері?` disclosure and appear only after a deliberate tap. Empty messenger input always falls back to phone; CRM fields remain supported in payloads.
- **RETURN-GIFT-001 — one Story reward policy in public booking and return flow.** At return, the manager can record the same reward promised on the website: Puzzi below 1 000 грн → 2 free Puzzi portions; Puzzi from 1 000 грн → choice of VA HOME 50 ml diffuser or 2 free Puzzi portions; non-Puzzi from 1 000 грн → VA HOME 50 ml diffuser; HOME RESET → 2 Puzzi portions because its diffuser is already included.
- **CLIENT-GEO-008 — mobile client card owns the full viewport.** On <=900 px no later tablet rule may reapply `calc(100vw - 28px)` to the client modal. Client content, quick actions, KPI and sections share one full-width content axis with symmetric safe-area padding.
- **BOOK-ACTIONS-008 — action rows consume their container.** Mobile booking-card action groups prioritize the current task: primary action spans full width; common secondary actions fill the next row; corrective/destructive actions are collapsed under `Ще`. Completed cards keep the two visible secondary actions 50/50 with no empty grid cell.
- **BOOK-FIN-009 — settlement stack.** Mobile completed-booking finance renders the deposit information block first and the refund/due block immediately underneath, both full width with the same geometry.
- `scripts/test-v4-2-40-booking-return-ux.mjs` protects the new UX/business contracts.
- **UI-CONS-002 — geometry-level consistency guard.** `scripts/admin_control_consistency_qa.py` now compares exact widths, relative x positions, parent fill, grid columns, gaps, radius, font size, border, background and active state across Finance and Analytics — not only labels/height/overflow.

### CHANGED
- Public local-address confirmation no longer exposes internal route distance from the VAcleaner base. For Полтава / Розсошенці / Щербані / Горбанівка the customer sees only successful address recognition, delivery-to-entrance context and the configured local tariff. Route km is still resolved and stored for internal logistics, fuel and margin analytics.
- Admin new/edit booking keeps Telegram, Instagram and preferred channel as CRM data, but moves them into `Додатковий канал зв’язку` progressive disclosure. The block automatically opens when an existing/repeat client actually has messenger data.
- Return finance now persists `extras.gifts.story` together with the finance calculation. A diffuser choice never reduces Puzzi chemistry; only `chemistry2` activates the two-free-portions calculation.
- Mobile finance status blocks use one full-width visual language instead of unrelated green/blue blocks of different widths.
- Finance period controls no longer inherit the old `justify-content: space-between` geometry. Up to 1320 px Finance and Analytics now resolve the same shared full-row grid; on phone both use the same 3-column wrap and on 901–1320 px the same 5-column row.

### FIXED
- Completed booking cards no longer leave a blank third action column beside `Приведи друга` and `Виправити статус`.
- The mobile client card no longer shifts left with a black gutter on the right due to the later <=1220 px modal-width rule overriding the full-screen phone contract.
- Client-facing address assistance no longer says `Локальний тариф; маршрут від бази 7,5 км`.
- Closing an eligible 1 000+ Puzzi rental no longer offers only the chemistry checkbox when the public booking promise is diffuser-or-chemistry choice.
- Finance no longer compresses the shared period selector to ~247 px while Analytics fills the row; the parent-context rule that caused that visual drift is neutralized.

### UX CONTRACT
- Public booking collects only data needed to complete the current task by default. Optional messenger channels are collapsed by default, not displayed as permanent fields or a permanent three-way selector.
- Internal operational data (route km, source diagnostics, margin inputs) must stay out of customer-facing copy unless the value changes the customer's decision or price.
- Repeated controls with the same role must share width, alignment, spacing, radius and responsive behavior; passing overflow tests is not sufficient when visual geometry is inconsistent.
- Mobile action groups may not leave accidental empty grid cells. Rare corrective/destructive actions must not compete visually with `Видати`, `Прийняти повернення`, `Розрахунок` or `Продовжити` and may live under one explicit `Ще` disclosure.

### PRESERVED
- Telegram and Instagram remain stored CRM attributes and remain editable in the full client card for referral/follow-up workflows.
- Delivery route km remains available to admin analytics; only its client-facing disclosure is removed for the fixed local tariff zone.
- Existing v4.2.39 shared Finance/Analytics period renderer, v4.2.37 navigation stack, referral journal, booking status flow, deposit formulas, delivery pricing and VA HOME isolation remain unchanged.


### CI HARDENING — wide desktop period controls
- On desktop widths >=1321 px Analytics and Finance must not rely on intrinsic text width for the shared period selector. The control rail is a deterministic 500 px, five-equal-column grid in both contexts, aligned to the right.
- This prevents browser/font-metric differences from changing the container width or relative button x-positions at 1440 px while preserving the full-row layouts on 901–1320 px and the 3-column PWA layout on <=900 px.
- `test:admin-control-consistency` remains a release-blocking browser gate; a 30/31 Browser QA result is **not** releasable even if static/build is green.

### TESTS
- `npm run test:v4.2.40-booking-return-ux`;
- `npm run test:booking-gifts`;
- `npm run test:v4.2.36-address-finance-referral`;
- `npm run test:v4.2.39-admin-control-consistency`;
- `npm run test:admin-control-consistency` (94 geometry/style assertions across 390 / 430 / 1024 / 1280 / 1440);
- full `npm run qa:static`, build and canonical Browser/PWA QA remain release gates.

# 49. Change record — v4.2.41

### ADDED
- **ADDR-RESILIENCE-001 — autocomplete assists, never blocks conversion.** A valid manual `street + house number` remains submit-able when OpenStreetMap/Photon misses the exact building or the provider is unavailable.
- **PROMO-UX-002 — visible optional promo entry.** Step 04 uses one full-width `Є промокод? / Додати` disclosure with a >=50 px target instead of a low-contrast text link.

- **BOOKING-UX-024 — financial summary alignment.** У desktop summary рядок `Доставка` є фінансовим рядком: назва завжди зліва, фактична сума/статус завжди справа на одній осі з орендою, передоплатою та залоговим платежем. Суму не можна склеювати з label зліва.
- **STORY-GIFT-STATE-001 — one selected reward, one source of truth.** For eligible Puzzi rentals from 1 000 грн, `diffuser50` and `chemistry2` are mutually exclusive states across UI, estimate, create payload, draft restore and return finance.
- `scripts/test-v4-2-41-address-resilience.mjs` protects address fallback, promo visibility and Story gift state.

### CHANGED
- `vacleaner-address-v1` no longer stops after Photon returns any unrelated numbered building. Suggestions are filtered/ranked against the typed street and search also tries canonical `вулиця ...` / `провулок ...` Poltava variants.
- If the typed Poltava street is relevant but the exact building is absent, autocomplete can offer the user-entered building as a manual candidate without coordinates. Manual/approximate candidates are never marked verified and never become route/fuel facts.
- Plain local addresses without an explicit settlement prefix (`Решетилівська 39а`, `Перспективний 10`) are treated as Poltava for the fixed local tariff. Explicit settlement prefixes still win.
- Availability requests now carry the active Story gift choice; the booking backend estimate echoes `storyGiftChoice` and `storyChemistryFreePortions` so async recalculation cannot drift from the selected reward.
- Draft restore replays only the checked radio option. An unchecked radio no longer dispatches React `change`, which previously could select the last gift option while restoring state.

### FIXED
- Selecting `Аромадифузор VA HOME · 50 мл` no longer shows `2 порції безкоштовно` in the Puzzi chemistry row and no longer falls back to chemistry after returning to the previous booking step / restoring the draft.
- Only `chemistry2` activates the free-chemistry copy and finance calculation. Diffuser selection remains a diffuser through availability refresh, booking creation and admin return flow.
- The Story summary has an explicit `Оберіть подарунок` state before a choice is made instead of visually pretending one reward was already selected.
- Searches such as `Решетилівська 39а` no longer tempt the customer with neighbouring house numbers, and unrelated results for inputs such as `Перспективний 10` are filtered out.
- Address-provider failure or no exact match no longer prevents booking: the customer can finish with a valid manual address and the manager verifies it before prepayment.

### PRESERVED
- Address source remains OpenStreetMap through Photon; OSRM remains the road-route provider. No proprietary address database is introduced.
- Poltava / Розсошенці / Щербані / Горбанівка remain the configured 250 грн local-delivery zone; explicit other settlements remain on route/agreement pricing.
- Manual address fallback never invents coordinates or route kilometres; internal delivery analytics still accept only verified route data as fact.
- v4.2.40 contact disclosure, return-gift policy, deposit/settlement logic, Finance/Analytics geometry, client-card geometry and referral logic remain unchanged.

### TESTS
- `npm run test:v4.2.41-address-resilience`;
- `npm run test:booking-gifts`;
- `npm run test:booking-cta`;
- `npm run test:v4.2.40-booking-return-ux`;
- `npm run test:v4.1.52-manual-address-fallback`;
- `npm run test:v4.1.53-address-provider-repair`;
- `npm run test:v4.1.54-local-zone-correction`;
- full `npm run qa:static`, build and canonical Browser/PWA QA remain release gates.

## v4.2.41 CI repair — canonical gate integrity

- `rishennia/textile/index.html` є обов’язковим public route artifact і не може бути порожнім або втрачатися під час release preparation.
- Manual-address fallback лишається non-blocking: валідна вулиця + номер будинку дозволяють завершити бронювання без вибору autocomplete; менеджер перевіряє адресу й підтверджує тариф до передоплати.
- Якщо Photon знає вулицю, але не точний будинок, manual suggestion може зберігати введений номер без вигаданих координат; `approximateCoordinates` не використовується як факт маршруту.
- Public booking CSS не додає новий `!important` debt; delivery summary geometry має працювати через нормальну specificity.
- Release не є готовим при будь-якому fail у `qa:static` або `qa:browser`; локальний focused PASS не замінює canonical aggregate gate.



# 50. Change record — v4.2.42

### ADDED

- `PUBLIC-BOOK-UX-003` — promo visibility contract for the Contacts step.
- `scripts/test-v4-2-42-promo-visibility.mjs` protects promo geometry, copy, open state and CSS ownership.

### CHANGED

- `Є промокод?` is now a full-width secondary action instead of a low-contrast text link.
- The collapsed control shows a clear title, short explanatory copy and explicit `Додати +` action.
- Promo geometry is owned by `assets/public-booking.css`; the legacy hardening stylesheet no longer owns a conflicting second design.
- Public asset build is `4242`, forcing cache-bust for returning browsers.

### FIXED

- Fixed the production case where promo behavior existed but its intended visual treatment was effectively invisible/low-contrast.
- Opening the control keeps the existing promo input, validation, loyalty comparison and auto-prefill behavior unchanged.

### PRESERVED

- Promo remains visually secondary to the primary booking CTA so users without a code are not pushed out of the funnel searching for discounts.
- Existing campaign/RETURN/referral promo validation and backend pricing are unchanged.
- Public contact progressive disclosure (phone first, optional messenger) is unchanged.

### TESTS

- `npm run test:v4.2.42-promo-visibility`.
- `npm run qa:static` must remain fully green before release.


## UI-DELIVERY-CARD-001 — booking card delivery axis

У картці бронювання блок `Видача` читається як фінансово-операційний рядок: `Доставка` / `Самовивіз` зліва, сума доставки справа на тій самій горизонтальній осі. Адреса/маршрут іде окремим рядком нижче. Не склеювати `250 грн · адреса` в один текстовий span. На mobile сума повинна бути візуально вирівняна по правому краю так само послідовно, як ключові суми у фінансовому блоці.


# 51. Change record — v4.2.43

### ADDED
- **CRIT-QA-001 — screenshot-targeted regression.** A screenshot-driven fix is only considered verified when QA checks the exact component and surface shown by the user, not a visually similar component elsewhere. This release explicitly guards `admin booking card → booking-delivery`, `return finance → story gift persistence`, and `public booking contact → promo toggle`.
- `scripts/test-v4-2-43-critical-booking-fixes.mjs` protects the three exact-surface fixes as one release gate.

### CHANGED
- **CRIT-BOOK-001 — admin delivery row geometry.** In the mobile booking card, `Доставка` / `Самовивіз` and its amount are separate siblings on one left/right axis; route-safe address is a separate row underneath. `250 грн · адреса` is no longer one text node.
- **CRIT-BOOK-003 — promo discoverability.** On public booking Contacts, promo entry remains a full-width secondary control with `Є промокод?`, helper copy and `Додати +`; it stays secondary to the booking CTA.
- Public/admin asset build is `4243`, forcing cache refresh for PWA and browser clients.

### FIXED
- **CRIT-BOOK-002 — story gift persistence end-to-end.** `storyMention` + `storyGiftChoice` is one contract between Return UI and `vacleaner-admin-bookings-v4`. For eligible Puzzi rentals from 1 000 грн, `diffuser50` persists to `extras.gifts.story.choice` and does not activate chemistry freebies; only `chemistry2` sets `extras.chemistry.story_mention`.
- Production `vacleaner-admin-bookings-v4` must run a source version that accepts `storyGiftChoice`, persists `extras.gifts.story`, and gives the free-two-portions calculation only to `chemistry2`.
- The exact admin booking-card delivery amount is right-aligned independently of the address, matching the financial reading axis.

### PRESERVED
- Delivery pricing, route distance, deposit rules, manual discounts, referral logic, promo validation and booking state transitions are unchanged.
- Existing completed bookings are not silently rewritten by the release. Historical financial corrections remain an explicit manager action.
- Address provider remains OpenStreetMap/Photon and route provider remains OSRM.

### TESTS
- `npm run test:v4.2.43-critical-booking-fixes`;
- `npm run test:v4.2.42-promo-visibility`;
- `npm run test:v4.2.40-booking-return-ux`;
- `npm run test:booking-gifts`;
- `npm run test:admin-return-gift-persistence`;
- `npm run qa:static`;
- canonical Browser/PWA QA remains a release-blocking gate.



# 52. Change record — v4.2.44 STABILIZATION / ACCEPTANCE

### ADDED

#### STAB-ACCEPT-001 — acceptance evidence outranks “code changed”

This release is a stabilization release with **no new business features**. The production v4.2.43 behavior is the baseline; only incomplete/incorrect recent UX implementation and its verification process are repaired.

A user-requested item can be marked `VERIFIED` only when the exact requested surface and state have been exercised. Static presence of a class, renderer or backend field is not enough.

For a screenshot-driven UI fix, QA must use the same component/surface and a representative viewport. For persistence behavior the required chain is:

`UI action → payload → backend → persisted state → reload → UI`.

If any link is not verified, the item is `CODE ONLY` or `NOT DONE`, never `VERIFIED`.

#### STAB-ACCEPT-002 — release acceptance scope

Before v4.2.44 can be handed off, acceptance covers the recent high-risk surfaces as one package:

- public booking 1→4, optional messenger disclosure and promo entry;
- address autocomplete + valid manual street/house fallback;
- Story reward policy and persistence;
- preliminary/final return settlement on PWA and desktop;
- admin booking delivery row and settlement blocks;
- client-card mobile geometry;
- booking-card action fill / overflow hierarchy;
- Finance / Analytics shared period controls;
- referral modal / client referral actions;
- production Edge Function parity for touched contracts.

The stabilization release must not change catalog prices, delivery tariffs, deposit rules, promo/RETURN/referral economics, availability capacity or VA HOME objects.

### CHANGED

#### STAB-UX-001 — desktop return-finance is a workspace, not a squeezed mobile grid

On desktop (`>=901px`) the preliminary/final settlement modal uses a purpose-built wide layout. The `Бонус за сторіс` block spans the full left data grid. Gift options are readable cards and may collapse responsively when there is insufficient width; labels must not be compressed into narrow columns or break into unreadable fragments.

The right `Підсумок` panel sizes to its content and may remain sticky while the central modal body scrolls. It must not be stretched to the full height only to create empty dead space. The footer actions remain visible inside the modal viewport.

The modal has one intentional central scroll area. No nested horizontal scroll, clipping or overlap is allowed at 1024 / 1280 / 1440 / 1648 desktop widths.

#### STAB-UX-002 — exact booking card delivery axis remains mandatory

In the admin booking card, `Доставка` / `Самовивіз` stays on the left and the monetary amount stays on the right on the same row. The route-safe address is a second row below. This is verified on the actual booking card, not the public booking summary.

### FIXED

#### STAB-DATA-001 — Story reward parity with production backend

For eligible Puzzi rental >= 1 000 грн:

- `diffuser50` and `chemistry2` are mutually exclusive;
- the selected choice is submitted as `storyGiftChoice`;
- production `vacleaner-admin-bookings-v4` persists it under `extras.gifts.story.choice`;
- only `chemistry2` may set `extras.chemistry.story_mention=true` and grant two free used portions;
- after save/reload/reopen the same selected reward is rendered.

Historical completed bookings are not silently rewritten; any historical correction remains an explicit manager action.

### PRESERVED

- Catalog prices, delivery tariffs, deposit rules, promo/RETURN/referral economics, inventory capacity, booking statuses and VA HOME objects are unchanged.
- Historical completed bookings are not silently rewritten.

### TESTS

#### STAB-QA-001 — v4.2.44 release gates

Mandatory targeted gates added by this release:

- `npm run test:v4.2.44-stabilization`;
- `npm run test:stabilization-acceptance-browser`;
- existing exact-surface v4.2.43 gift/delivery regression;
- client-card mobile browser QA;
- Finance/Analytics control-consistency browser QA;
- referral modal/browser QA;
- public booking resilience/browser QA;
- full canonical `qa:static` and `qa:browser` before production commit.

The final archive may be handed off only after the aggregate status is recorded with explicit PASS/FAIL counts and screenshot evidence from the stabilization acceptance suite.


# 53. Change record — v4.2.45 CLIENT CARD UX

### ADDED

- Read-first client card presentation: the default surface shows identity, loyalty, primary actions, KPI, contacts and recent rental history without presenting the profile as a large edit form.
- Progressive disclosure for `Бонуси й referral`, `Документ` and `SMS`; these secondary operational blocks are collapsed by default.
- Rental history shows the latest three records first with an explicit `Показати всі` action for older records.
- Settlement summary now explains `Отримано разом` as the sum of prepayment plus the factual deposit.

### CHANGED

- Desktop client card core layout is two columns: `Контакти` and `Історія оренд`. Secondary sections span the workspace below. Numeric section labels are removed from the card.
- Top actions are limited to operationally frequent actions: new rental, active/last rental, the preferred messenger when available, and phone call. Referral is no longer duplicated in the top action row.
- Contact data is read-only by default; `Редагувати` explicitly reveals the editable fields.
- Client benefits and referral data are presented as one secondary disclosure surface instead of competing cards; `Переглянути програму` keeps the full referral workspace reachable without duplicating it in the primary action row.

### FIXED

- Removed the information-density problem where contacts, document, referral, next-action, bonuses, SMS and rental history all competed simultaneously in the first viewport.
- Removed duplicated referral entry points from the client-card primary action layer.
- Preliminary/final settlement now states the actual received deposit again in the lower confirmation hint: `Отримано … · з них залоговий платіж … · витрати …`.

### PRESERVED

- Client data model, loyalty thresholds, referral economics, promo/RETURN rules, rental history, document storage, SMS consent/history and backend contracts are unchanged.
- Booking, pricing, delivery, deposit rules, availability capacity and VA HOME data remain unchanged.

### TESTS

- `npm run test:v4.2.45-client-card-ux` verifies the client-card hierarchy, progressive disclosure, history limit, referral de-duplication and settlement deposit explanation.
- Existing static regression suite remains release-blocking.
- Client-card desktop/mobile visual QA and the return-finance scenario remain mandatory acceptance surfaces for this release.


# 54. Change record — v4.2.46 FINANCE EXTRA BREAKDOWN

### ADDED

- A shared `extrasBreakdownText()` formatter for human-readable additional-item composition in settlement summaries.
- Targeted static and browser acceptance coverage for a 450 грн mixed-extra case.

### CHANGED

- In preliminary/final settlement, `Додатково` always explains the non-zero total on a second muted line, using operational categories instead of an unexplained amount.
- Premium SC 2 nozzles are grouped as `Насадки`; all other sellable extra products are grouped as `Засоби`. Example: `Насадки 200 грн + Засоби 250 грн`.
- If only one category exists, only that category is shown. If extra total is zero, no explanatory line is rendered.
- Desktop and PWA use the same `extrasBreakdownText()` source of truth.

### FIXED

- `Додатково` no longer shows an unexplained amount when paid extras exist.
- Desktop and mobile preliminary/final settlement now expose the same human-readable breakdown.

### UX / ACCEPTANCE

- The breakdown is visually subordinate to the `Додатково` label and amount, matching the hierarchy already used under `Отримано разом`.
- On 320 / 390 / 430 px the explanation may wrap but must not overlap the amount or create horizontal scrolling.
- Acceptance fixture covers `Насадки 200 грн + Засоби 250 грн = 450 грн`.

### PRESERVED

- Extras prices, selected-item storage, rental totals, discounts, deposit logic, chemistry logic and backend contracts are unchanged.


### TESTS

- `npm run test:v4.2.46-finance-extra-breakdown` verifies formatter/category/spec contracts.
- `npm run test:stabilization-acceptance-browser` verifies the exact desktop and mobile settlement UI with a 450 грн mixed-extra fixture.
- Full canonical `qa:static` and `qa:browser` remain release-blocking.


# 55. Change record — v4.2.47 CI PIPELINE HARDENING

### ADDED

- One data-driven suite registry: `config/qa-suites.json` owns canonical static/browser suites and the curated current-state contract map.
- `verify:artifact` validates the extracted Pages payload, source/artifact release coherence, deploy-only file boundary, local references and a deterministic SHA-256 digest before Browser QA starts.
- `.gitignore` for build, dependency, Playwright, screenshot, Python cache and generated QA summary artifacts.
- Versioned `.githooks/pre-push` plus `npm run hooks:install`; pre-push runs the canonical `npm run qa:static` gate locally.
- `config/qa-build-contracts.json` stores high-churn exact copy/structure contracts separately from checker code.
- Explicit security record of the current admin MFA state under `SEC-ADMIN-001/002`.

### CHANGED

- GitHub Browser QA downloads and extracts the exact `github-pages` artifact produced by `validate`. It no longer runs `stamp` or `build`; deploy consumes the same single uploaded artifact after Browser QA passes.
- `qa-full.mjs` reads suite composition from data, builds only in `static/full`, and always verifies `dist` before Browser suites.
- Historical `test-v*.mjs` files remain available as audit evidence through `npm run qa:legacy`, but canonical static QA runs a curated current-domain set through `test:current-contracts` instead of permanently appending every release test.
- Asset cache busting now covers every local `/assets/*.js|css` reference generically. Puzzi title/prices and chemistry labels are resolved from `seo-map.json` / `vacleaner.json`, not repeated as inline checker constants.
- Hidden nested test execution was removed from `check-build.mjs`; each current test is now visible in the suite registry and QA summary.

### FIXED

- Mobile booking E2E clicks the visible add-on label semantically with `extra_card.click()` and no fixed pixel coordinate.
- Removed the second unverified Browser-job build, eliminating the possibility that Browser QA and deploy use different `dist` trees.
- Removed Python setup from the static-only `validate` job.
- Generated `qa-release-summary.json`, `dist`, test results and caches no longer belong in release source/history.

### PRESERVED

- Public UI, admin/PWA UI, prices, catalog, delivery tariffs, deposit rules, availability, finance formulas, RETURN/referral economics, Supabase schema and VA HOME data are unchanged.
- Existing historical regression scripts remain runnable on demand; only canonical suite selection and execution architecture changed.
- Current MFA behavior is documented but not changed. MFA is not silently enabled or disabled by this release.

### TESTS

- `npm run test:ci-pipeline` verifies the one-artifact workflow, no browser rebuild, semantic E2E click, generated-artifact ignores, suite registry, pre-push hook and documented MFA state.
- `npm run test:current-contracts` runs 20 curated current-domain static contracts.
- `npm run qa:static` must build one verified Pages artifact; `npm run qa:browser` must consume a prebuilt verified artifact.
- `npm run qa:legacy` remains available for explicit historical audit and is not a release-blocking default gate.
- Full canonical `npm run qa:full` remains release-blocking before handoff.


### EXPERIMENTAL NATIVE UI TEST — паралельний FULL PWA-візуал

- Production-маршрут `/admin/bronuvannia/` залишається канонічним і не змінює свій UI/поведінку в межах цього тесту.
- Окремий тестовий маршрут `/admin/bronuvannia-native-test/` використовує `assets/admin-native-test.css` та `assets/admin-native-match.js` і має окремий manifest.
- Native test — це **повний мобільний UI-шар PWA**, а не демо кількох екранів. Одна візуальна система застосовується до `Найближчі`, `Бронювання`, `Календар`, `Техніка`, `Клієнти`, `Кампанії`, `Фінанси`, `Аналітика`, `Хімія`, `Налаштування`, глобального пошуку та `Ще`.
- Та сама система поширюється на робочі сценарії: створення/редагування бронювання, detail бронювання, картку клієнта, опрацювання заявки, видачу, попередній/фінальний розрахунок, продовження оренди, витрати, кампанії, SMS та інші modal flows.
- Візуальна мова: темний graphite shell, SF/Apple-like scale, пласкі surfaces без зайвого glass, gold тільки як primary/action accent, 44+ px touch targets, однакові radius/spacing/typography.
- У `Найближчі`, картках `Бронювання` та detail бронювання зберігається ліва статусна смуга; її колір відповідає стану, але не змінює бізнес-статус.
- Бізнес-логіка, booking actions, статуси, Supabase, доставка, залог, фінанси, RETURN/referral, availability, SMS contracts та дані клієнтів залишаються спільними з production. Test-layer не має власної альтернативної бізнес-логіки.
- На mobile filters/period controls можуть горизонтально прокручуватися, але контент PWA не має створювати horizontal page overflow.
- Перед перенесенням native UI у production обов’язкові screenshot/scenario QA на 320 / 390 / 430 px для всіх основних views і критичних modal flows, а також повний canonical QA.

### EXPERIMENTAL NATIVE UI · DEEP VISUAL QA v3.2

- Повний native test перевіряється не лише по primary views, а й по вкладених робочих маршрутах та modal flows.
- `Видача` і `Попередній/фінальний розрахунок` повинні зберігати читабельний booking context (техніка + клієнт) на mobile; context header не може стискатися до декоративної смуги.
- Calendar у native test показує одну читабельну дату; технічний ISO-дубль `YYYY-MM-DD` не дублюється поруч.
- SMS primary/step/history/bulk controls та Analytics segmented controls у native test мають мінімальний touch target 44 px.
- Видимий допоміжний текст на критичних native mobile surfaces не повинен ставати micro-copy менше 10 px.
- Ці правила є presentation-only: production route, бізнес-логіка, статуси, суми, тарифи, Supabase та workflow actions не змінюються.


### EXPERIMENTAL NATIVE UI V2 — cleanup pass

- `/admin/bronuvannia-native-v2/` is a second parallel test route; production `/admin/bronuvannia/` and Native V1 `/admin/bronuvannia-native-test/` remain available and unchanged.
- V2 fixes hybrid/double control shells in Settings, compacts slot/deposit editors, and preserves one-border-per-control geometry.
- Booking card action hierarchy is deterministic: one primary action, visible secondary actions, and corrective/destructive actions under a working `Ще` action sheet.
- Booking cards keep the left status rail and are vertically tightened without changing booking data or state logic.
- Selected filter state uses a quiet gold selection treatment instead of competing with the primary booking CTA.
- Client-card display normalizes all-caps names only in presentation; stored customer data is not rewritten.
- Booking detail removes duplicate date/time presentation and replaces temporary text glyphs with a consistent inline SVG icon set.
- Calendar summary is compacted; the technical ISO date remains hidden on mobile.
- V2 uses the same production business logic, Supabase actions, finance/delivery/deposit/referral contracts and booking state transitions.


### EXPERIMENTAL NATIVE UI V2.1 — component cleanup

- `/admin/bronuvannia-native-v21/` is a parallel test-only route layered on top of Native V2.
- V2.1 enforces the visual contract **one interactive component = one visible shell**. Search, composite money/packet controls, settings fields, checkbox/radio controls and modal action surfaces must not render a second nested border/background.
- Checkbox/radio inputs are exempt from the generic text-input card geometry and remain compact touch-state controls inside their parent choice/switch cards.
- Booking `Ще` remains a root-level action sheet with real actions; it must never expand into an empty/stretched card region.
- Settings save actions must be scrollable fully above the bottom navigation and safe area.
- Preliminary/final settlement keeps the same finance/story business logic but flattens presentation so outer decorative wrappers do not duplicate the borders of inner choices.
- Targeted V2.1 browser QA covers 320/390/430 px, all primary views, all Settings tabs and critical process/issue/finance/complete/extend/client/SMS flows.
- Production `/admin/bronuvannia/`, business logic, Supabase contracts, pricing, deposit rules, availability and referral/RETURN economics remain unchanged.


## Experimental Native UI V2.2 stabilization

- Parallel route: `/admin/bronuvannia-native-v22/`; production `/admin/bronuvannia/` remains canonical and unchanged.
- V2.2 is presentation-only stabilization over Native V2.1: flatter Settings, compact completed booking cards, deduplicated detail date/time, flatter process/issue/finance sections, safer bottom actions.
- Business logic, Supabase contracts, pricing, deposit policy, delivery economics, availability, RETURN/referral and VA HOME data are preserved.
- V2.2 may move DOM nodes only inside the test route for presentation; original event handlers and source values stay owned by `admin-v250.js`.
- Acceptance requires targeted 320/390/430 mobile browser QA, no horizontal overflow, 44px+ primary touch targets, no nested control shells, and unchanged production hashes before handoff.

### NATIVE-V23-PARITY-001 — Native V2.3 functional parity test

- `/admin/bronuvannia-native-v23/` is a parallel test route and does not replace `/admin/bronuvannia/`.
- V2.3 preserves all production booking status transitions and action handlers; visual proxies may change presentation but must invoke the canonical production controls.
- Booking Detail must expose booking audit history and the status/cancel `Ще` actions when those actions exist in production.
- Finance must expose expense category filtering.
- Compact completed/cancelled booking cards may reduce density but must retain deposit state and an explicit comment-presence cue when applicable.
- Native V2.3 uses a route-specific manifest and route-scoped service worker fallback/deep-link target so test PWA navigation does not intentionally downgrade to the production visual route.
- Production JS/CSS/SW/manifest, Supabase contracts, pricing, deposits, delivery, availability, SMS, RETURN/referral and finance formulas remain unchanged.

## NATIVE-V24 — Visual Polish RC (test-only route)

- Route: `/admin/bronuvannia-native-v24/`; production `/admin/bronuvannia/` remains canonical and unchanged.
- V2.4 inherits V2.3 functional parity and changes presentation only.
- Booking status filters scroll with the page on mobile; they must never float over or hide booking-card headers.
- Completed/cancelled cards keep deposit truth and comment presence but remove a redundant zero final-balance row and use historical-density spacing.
- Audit history remains available in booking Detail as a disclosure; expanded events use flat timeline rows and the reload control remains a 44px+ target.
- Booking `Ще` uses one action-sheet list with equal-height rows; danger actions remain visually distinct without nested button shells.
- Online/offline state is shown inside profile metadata on `Ще`, not as a detached floating row.
- Issue/finance booking context uses one thin shell with an internal divider; no framed-frame visual.
- Campaign, Analytics, Calendar, Settings and SMS microcopy receives a minimum readability polish without changing content or logic.
- Mobile PWA update notice is a compact system toast above bottom navigation and must not become a second full bottom panel.
- V2.4 has its own manifest/service-worker scope; offline fallback and push/deep links remain inside the V2.4 route.
- Pricing, delivery, deposits, availability, booking transitions, finance calculations, campaigns, referral, Supabase and production PWA files remain unchanged.


## NATIVE-V25 — Final Polish RC (test-only route)

- Route: `/admin/bronuvannia-native-v25/`; production `/admin/bronuvannia/` remains canonical and unchanged.
- V2.5 inherits V2.4 visual polish and V2.3 functional parity; it changes only the parallel Native presentation layer.
- `Найближчі` restores the proven operational rail: direction arrow, large time, `ВИДАЧА / ПОВЕРНЕННЯ`, and relative badge (`Сьогодні / Завтра / Прострочено`) remain visible at a glance.
- Process booking exposes private document-photo add/replace and view controls using the existing production `documentRequest()` document service; no document business/storage contract is forked.
- The profile card on `Ще` is informational only and must not duplicate the separate `Налаштування` navigation item.
- SMS RETURN header/body, recipient controls and fixed footer must remain non-overlapping and horizontally contained at 320 / 390 / 430 px.
- Analytics/Finance period controls and Clients segment/sort controls must fit fully inside the viewport instead of ending in a clipped horizontal rail.
- Settings fuel controls use exactly one visible shell per numeric field; nested framed-input presentation is prohibited.
- All five Settings tabs must remain fully reachable/visible on target mobile widths.
- Booking Detail keeps compact `Оновити`, visible `Ще`, audit history and canonical status actions.
- V2.5 has its own manifest/service-worker scope; offline fallback, local notifications and rewritten production deep links stay inside the V2.5 route.
- Production CSS/JS/SW/manifest, Supabase contracts, pricing, deposits, delivery, availability, finance formulas, SMS economics, RETURN/referral and document privacy rules remain unchanged.
- Acceptance requires primary/deep browser QA at 320 / 390 / 430 px, no horizontal overflow, no nested interactive shells, canonical static/build GREEN, artifact verification PASS and unchanged production hashes.

### Native V2.6 real-iPhone visual contract
- Parallel route `/admin/bronuvannia-native-v26/` inherits V2.5 functional parity.
- Detail `Оновити` and `Ще` must remain fully visible with 44px+ mobile targets at 320/390/430 px.
- RETURN SMS campaign title, `Журнал`, close action, sender metadata and footer must not overlap or clip; `Журнал` has a dedicated header row on mobile.
- V2.6 changes presentation only; production route and business logic remain unchanged.


### Native V2.7 Full Re-audit RC — visual safety contract

- Parallel test route: `/admin/bronuvannia-native-v27/`; production `/admin/bronuvannia/` remains unchanged.
- V2.7 is a visual/geometry hardening pass over V2.6. It does not fork booking, status, pricing, delivery, finance, SMS, referral, document-storage or Supabase business logic.
- Booking status filters on mobile must not render a half-cut control at the right edge; all statuses stay reachable and readable at 320 / 390 / 430 px.
- `Найближчі` keeps the left operational rail (direction arrow, time, issue/return, relative day); its action labels must not clip at supported mobile widths.
- Modal footers may not inherit desktop fixed minimum widths; every footer action must stay inside the viewport at 320 / 390 / 430 px.
- The PWA update prompt is deferred/hidden while a detail screen, modal workflow, or mobile keyboard is active so it cannot cover operational controls.
- Analytics/Finance five-period selectors use a balanced 3 + 2 mobile grid and never require horizontal scrolling.
- Delivery fuel analytics is visually flat: no redundant shell around the per-vehicle rows.
- V2.7 scoped service worker precaches every CSS layer used by the V2.7 route, including Native V2.5 compatibility CSS, and keeps notification/deep-link fallback inside the V2.7 scope.
