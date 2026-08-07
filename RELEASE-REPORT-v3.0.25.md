# VAcleaner v3.0.25 — Clients Registry + Historical Extras + 320px Analytics Repair

Дата: 07.08.2026  
Build: 3025

Цей реліз зроблений **поверх v3.0.24**. Бізнес-ядро оренди, weekend tariff/deposit, half-open inventory, manual 10% discount, settlement та nearest compatible availability не переписувались.

## 1. GitHub CI regression: Analytics на 320 px

GitHub Actions run `31173098126` для v3.0.24 підтвердив реальний runtime regression:

`mobile-320: analytics view stays inside viewport`

Причина була не в toolbar і не в period controls. На 320 px двоколонковий `status-dashboard` залишав статусним карткам занадто мало ширини, а довгі назви статусів залежали від метрик шрифту runner-а.

У v3.0.25:

- статусні елементи мають явний shrink contract (`min-width:0`);
- текст статусу може безпечно переноситися;
- на `<=360px` status dashboard переходить в одну колонку;
- немає `overflow:hidden` як маскування дефекту;
- QA перевіряє сам dashboard і bounding geometry кожної status card.

Локальний installed-PWA visual QA після зміни: **323 / 323 PASS**.

## 2. Повна повторна звірка історичного джерела

Повторно перевірений актуальний файл історичних бронювань:

- 362 непорожні реальні записи;
- записи звірені з production `vacleaner_bookings` за нормалізованим телефоном + датою, а для історичних записів без телефона — додатково за іменем/контекстом;
- приклади, які здавались відсутніми у вкладці «Клієнти», насправді були в production bookings/customers; v3.0.24 просто не дійшов до Pages через CI failure;
- один live-запис мав фактичну production start_date на один день пізніше за старий текстовий запис; він не дублювався;
- нормалізовані імена не дублювались лише через відмінність службового тексту старого джерела.

Приватний вихідний файл, телефони та імпортні payload-и **не входять у release archive**.

## 3. Реальний розрив між bookings і customer profiles

Аудит production знайшов 6 актуальних клієнтів, у яких бронювання вже існували, але профілі не були створені в `vacleaner_customers`.

Production repair виконаний:

- 6 профілів backfilled без зміни бронювань/фінансів;
- після repair: **283 customer profiles**;
- валідних booking phone без customer profile: **0**.

## 4. Причина майбутніх пропусків клієнтів закрита

Public `vacleaner-booking-v5` раніше створював booking/resources, але не гарантував створення customer profile.

У v3.0.25 public booking після успішного створення бронювання:

- створює profile для нового клієнта;
- для існуючого клієнта оновлює лише безпечні contact fields;
- не перетирає документні поля;
- не стирає збережену адресу `null`-значенням;
- при помилці profile write бронювання відкочується.

Production Edge:

- `vacleaner-booking-v5` — **v6 ACTIVE**;
- `verify_jwt: false` — збережено, бо це public booking endpoint;
- SHA-256: `d0dd336f449db672bb07e7a332244859720aac8b7ed4dcbcb5989b90236631ee`.

Інші production Edge не змінювались:

- `vacleaner-admin-bookings-v3` — v13 ACTIVE, verify_jwt=true;
- `vacleaner-admin-data-v1` — v1 ACTIVE, verify_jwt=true;
- `vacleaner-settings` — v5 ACTIVE.

## 5. «Засіб від запахів» → Neutralix

Для історії встановлена семантика:

`засіб від запахів / засіб від запаху / запах` → **Neutralix · концентрат**.

У production промарковано **7 HIST-бронювань**. Актуальні live booking, де Neutralix уже був записаний як selected item, не переписувались.

Історичний total_amount не змінюється: поточна ціна Neutralix не підставляється заднім числом.

## 6. «Пароочисник преміум» → SC 2 + Premium nozzles

Для історичних тарифів із premium-виконанням SC 2 встановлена семантика:

**пароочисник / комплект зі SC 2 + Насадки «Преміум» до SC 2**.

У production промарковано **31 HIST-бронювання** через selected item `premium_nozzles`.

Це охоплює історичні `пароочисник преміум`, а також premium-варіанти комплектів, де SC 2 був частиною набору.

Старі фінансові суми не перераховуються.

## 7. Як це показується у «Повернених»

Для completed/HIST booking:

- extra видно прямо в картці у фільтрі **«Повернені»**;
- extra видно в detail booking у секції **«Додатково»**;
- історичному extra не показується вигадана `0 грн` або сучасна ціна;
- detail показує: **«у складі історичної суми»**.

Це має окремий runtime regression test на 320 / 390 / 430 px.

## 8. Production historical data repair

В production вже виконано:

- backfill 6 missing customer profiles;
- 7 historical Neutralix mappings;
- 31 historical Premium-nozzles mappings.

Додана idempotent migration:

`20260807143000_vacleaner_v3025_client_history_repair.sql`

Вона не містить телефонів/ПІБ і не змінює старі total_amount.

## 9. QA

Після фінального stamp v3.0.25:

- Static/build contract: PASS
- Rental / deposit / slot policy: **46 assertions — PASS**
- Finance: **19 scenarios — PASS**
- Stabilization architecture: **79 assertions — PASS**
- Session: **4 scenarios — PASS**
- UX: **17 scenarios — PASS**
- PWA static: **42 assertions — PASS**
- Installed PWA / mobile visual QA: **323 / 323 — PASS**
- Desktop density visual QA: **60 / 60 — PASS**
- Final desktop visual audit: **205 / 205 — PASS**
- Production backend inventory: **PASS**
- Pages build: **191 files / 4921 KiB — PASS**

### Local E2E limitation

`npm run test:e2e` у цьому контейнері не може відкрити `http://127.0.0.1:4173` через системну Chromium policy:

`ERR_BLOCKED_BY_ADMINISTRATOR`

Це **не позначено як PASS**. GitHub Actions залишається авторитетним runtime gate для нового commit v3.0.25.

## 10. Що ще не можна назвати перевіреним

- GitHub Actions для **v3.0.25** ще не запускався з нового commit;
- GitHub Pages production ще не містить v3.0.25, доки новий CI не стане green;
- production Edge v6 підтверджений як ACTIVE через Supabase inventory; прямий HTTP smoke із цього контейнера недоступний через DNS policy середовища.
