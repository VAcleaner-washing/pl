# R4: ізольований hosted backend — перевірка 2026-11-11

R4 тепер має реальну окрему базу. Це етап інтеграційної перевірки, а не
нова production-версія чи завершене приймання всього застосунку.

| Середовище | Фактичний стан |
|---|---|
| Робоча система | 4.3.46 / 4346, main `15bf61dc4da4cf63405a25887353e6ec7178dce8` |
| Приватний LAB | 4.3.54 / 4354, Site version 6, локальні демодані браузера |
| R4 Supabase | `vacleaner-admin-staging-r4`, ref `jdthhqxzfpvosfdxwfem`, eu-west-1, PostgreSQL 17.11 |
| Організація | VA Home; користувач погодив її після перевірки організації робочої 46 |
| Тестовий інтерфейс із серверним збереженням | Ще не відкритий; LAB не перемкнуто |

## Межі та ізоляція

Створено рівно один новий Free-проєкт за перевіреною перед створенням ціною
$0/місяць. Production `yweluzclearwrazdkahu` не змінювався. Schema metadata
та незмінені canonical handlers використані без копіювання рядків клієнтів,
бронювань, фінансів, Auth, документів, allowlist, підписок, provider secrets чи
розкладів. Stable 46 archive з попереднього етапу збережений.

Міграція `20261111121941_vacleaner_r4_isolated_schema` створила 22 таблиці,
15 SQL-функцій, constraints/indexes/triggers/grants/policies. Read-back підтвердив
RLS на всіх 22 таблицях. Bootstrap SQL SHA-256:
`fcd631a5046d83f9cd311c9f0707eadd8e87cab3b8124cd434d555557554eb2b`.
Первинний native confirmation завершився без застосування; перевірено порожню
схему. Повторне native confirmation успішне. Міграцію після успіху не повторювали.

Усі шість canonical Edge Functions активні, version 1. Їхній production режим
gateway `verify_jwt=false` збережено: handlers самі перевіряють bearer через
`auth.getUser` і серверну таблицю `admin_users`. Публічний GET каталогу
навмисно доступний. POST-зміни захищені. Фінансові модулі та handlers скопійовані
байт у байт; додано лише import транспортної ізоляції. Вона перевіряє exact
staging origin, відмовляє production ref і блокує зовнішні fetch та
SMS/push/reminders/campaign dispatch/address endpoints із 503, delivered:false.

Створено тільки три підтверджені `.invalid` Auth-акаунти: два тестові менеджери
в обох канонічних allowlist і один звичайний користувач. У звичайного користувача
навмисно user_metadata.role=admin/is_admin=true для перевірки заборони. Admin
createUser викликано з email_confirm:true; signup/invite/recovery/mail API не
викликали. Credentials зберігаються mode 0600 поза репозиторієм і артефактами;
service-role key залишається тільки у серверному середовищі Supabase.

Тимчасовий provisioner мав nonce SHA-256, строк дії й точний список трьох
акаунтів. Після одноразового успіху його замінено version 2, яка завжди повертає
410 `bootstrap_permanently_disabled`; це перевірено HTTP-запитом. Вона більше
не містить операцій створення користувачів або читання service-role key.

## Реально виконані серверні перевірки

`scripts/admin_staging_live_qa.py` — явний opt-in, не частина автоматичного
production CI. Потрібні exact project ref, окремий credentials file, згенерований
manifest і для бізнес-записів `--allow-synthetic-writes`. Production ref відхиляється.
Звіти містять статуси й synthetic IDs, без паролів, bearer JWT або signed URL.

| Сценарій | Результат і межі доказу |
|---|---|
| Auth/authorization | 51 assertion: missing/invalid token → 401, outsider → 403 для всіх шести POST handlers; обидва менеджери проходять авторизацію; metadata spoof не надає прав |
| Data API / RPC | Anon, outsider і менеджер не читають напряму business tables; privileged reservation RPC заборонений через direct API; allowlist SELECT показує менеджеру тільки себе, outsider — [] |
| Життєвий цикл | Створення waiting_payment → редагування → передоплата/confirmed → застава → issued → продовження → обов'язкове підтвердження доплати → completed → correction/issued → повторний розрахунок. Незалежний manager B читає persisted state |
| Точний час | Після edit pickup 08:30 збігається в extras.pickup_time, start_at і наступному серверному list іншого акаунта |
| Фінансовий oracle | Синтетичний Puzzi: база 700, застава 1000, передоплата 200, хімія 100, доплата за послугу 50 → витрати 850, повернення 350; після продовження база 1400/витрати 1550/доплата 350. Застава залишається 1000 |
| Відмова розрахунку | Без duePaid сервер повертає due_not_confirmed/409; issued, total_amount=1550 і deposit_returned=false збережені; явний наступний commit завершує оренду |
| Журнал | Окреме читання entries підтвердило booking_id та actor_id; 33 audit rows у фінальному SQL read-back |
| Одночасні запити | Два менеджери з одним client_request_id отримали один ID і обидві відповіді з кінцевим waiting_payment. Три одночасні оренди за capacity=2 → 201,201,409; два резервування збережені. Це один реальний розклад конкурентності, не доказ усіх можливих interleavings |
| Втрата відповіді | Локальний proxy переслав справжній create і відкинув downstream відповідь після upstream commit. Клієнт отримав RemoteDisconnected, інший менеджер прочитав рядок, явний повтор із тим самим request_id повернув його без дубля |
| Налаштування | delivery.local 250→251 бачить інший менеджер; -1 → 400 і збережене 251 не змінюється; початкове 250 відновлено через canonical API |
| Клієнт / витрата | Дані synthetic customer бачить інший менеджер; витрата 123→124 збережена, після archive не повертається у list |
| Документи | Синтетичний PNG 1×1 завантажений у private bucket; signed URL повернув точний SHA; outsider не отримує URL чи direct storage access; public URL відхилено; після delete документ null і storage.objects=0. Signed URL не записували у звіт |
| Приведи друга | Реальний synthetic code дає знижку 100; completed активує один бонус 150; використання claim; cancellation повертає бонус; correction completed→issued відкликає невикористаний бонус; resettle відновлює той самий reward без дубля |
| Атрибуція / кампанія | Окрема оренда source=instagram не з'являється в referral uses. Personal campaign без активації та dispatch має conversion=null, recipients=0, used=0, revenue=0. Кампанію поставлено на паузу. Доставлення/кліки реальної розсилки не тестували |

Підсумковий SQL read-back на 12:56:32 UTC: 8 synthetic bookings, 8 synthetic
customers, 33 audit entries, 1 referral use, 1 reward; client_request_id унікальні.
SMS dispatch/recipients, push config/subscriptions і notification claims — 0;
cron schema відсутня. Bucket private, документ після тесту видалений; synthetic
expense 124 заархівована. Тестові бронювання залишені для подальшого UI-приймання.

### Збережені початкові невдачі тестового harness

Перший lifecycle-run виконав 43 успішні assertion, але завершився червоним на
назві поля журналу: тест шукав audit/events, canonical API повертає entries.
Виправлено контракт тесту, додано booking_id/actor_id, виконано окремий read-only
audit run (8 assertion). Початковий червоний результат не переписаний; lifecycle
після цього не проганяли повторно, бізнес-дані заради green не змінювали.

Перший persistence-run виконав 10 assertion й отримав коректний 400
invalid_customer_data: тест пропустив обов'язковий originalPhone. Запит
виправлено відповідно до canonical handler; початковий звіт збережено, новий
persistence-run пройшов 17 assertion. Серверні перевірки не послаблювали.

Інші завершені окремі runs: concurrency 17, lost response 11, documents 13,
referrals 34. Ці числа включають повторні логіни й read-back, їх не слід подавати
як кількість незалежних продуктних сценаріїв або як FULL QA GREEN.

Після оформлення checkpoint `npm run qa:static` пройшов усі 47 static/build
етапів; окремий staging preflight пройшов 17 перевірок. Стандартний footer
static runner містить FULL QA GREEN, але scope цього запуску — тільки static;
новий connected-browser/PWA/physical-device release gate цим не закривається.

## Advisors і відкриті питання

- Security INFO: address cache, notification claims та private identity мають
  RLS без policies — deny-by-default. Дозвільні policies для приховування lint не додавали.
- Performance INFO: два FK без індексу (promo_codes.activation_dispatch_id,
  promo_redemptions.promo_code_id), unused indexes очікувані на новій малій базі.
  Канонічні індекси не видаляли.
- Каталог містить успадковані широкі grants на address cache; тест доступу до
  бізнес-таблиць не є повним security audit усіх службових privileges. Окремо
  перевірити TRUNCATE/default grants до розширення доступу чи копіювання реальних даних.
- Foreign-project **user** JWT, реальні provider deliveries, повний promo
  activation/redemption RPC, campaign click attribution, throttled/expired sessions,
  усі partial-write server failures та велика історія не сертифіковані цим прогоном.
- Серверні два акаунти не дорівнюють двом фізичним пристроям. Connected browser,
  iOS keyboard, standalone safe areas, offline/update/resume ще не прийняті.
- Для UI54 є зелений push CI 42998324410 і червоний PR CI 42998333500 з WebKit
  TargetClosed під час equipment navigation. Червоний gate залишається відкритим;
  нові серверні результати не замінюють його.

## Перед відкриттям підключеного STAGING UI

Останній `/auth/v1/settings` досі показує disable_signup=false. Користувачу
передано точний Dashboard шлях до **нового R4**, щоб вимкнути Allow new users
to sign up. Доступний Supabase connector не має Auth config update, а керування
авторизованим Dashboard браузером у сесії недоступне. Чатове «Ок» не змінює
цей параметр. Потрібен read-back disable_signup=true.

Email provider потрібен для password login і не означає, що пошта відправлялась.
Глобальне вимкнення Auth mail delivery інструментами цієї сесії не підтверджене;
тільки `.invalid` користувачі, відсутність invite/recovery/signup викликів і
непідключений UI обмежують поточне тестування. До UI-доступу визначити й
перевірити безпечний mail policy; не додавати реальні адреси або reset/invite flow.

Далі підготувати окремий явно позначений STAGING entrypoint з exact origin,
окремими Auth storage/manifest/SW/cache та забороною provider actions. Не
замінювати browser-local LAB мовчки. Пройти реальні UI save/reload/error/retry,
два пристрої й фізичний iPhone; закрити WebKit gate. Main/production і видалення
46 залишаються окремим рішенням після приймання.

## Відкат і повторення

- Production нічого відкочувати: main та HTTP release.json повторно підтвердили
  4.3.46/4346. Стара робоча система і її база збережені.
- Для припинення R4 тестів не використовувати stage entrypoint; production не
  перемикати. Не робити restore/rollback production database.
- LAB Site version 5 з 4.3.53 і version 6 з 4.3.54 збережені окремо; цей етап не
  публікував нову Site version.
- Bootstrap повторно на існуючій схемі не виконувати. Не створювати ще один
  проєкт через втрату локального стану; actual ref записаний у receipt.
- Перед новим live run переглянути `*-state.json`, вибрати новий artifacts path
  і нові вільні synthetic phones/dates. Це одноразова acceptance-матриця на
  відомому seed; механічний повний rerun може конфліктувати з залишеними даними.
- Generated SQL/functions та credentials не входять у Pages або репозиторій.
  Докази поточної сесії лежать у `/workspace/va-r4-hosted-evidence/`; non-secret
  target/hash/read-back зафіксовано у checked-in receipt. Повні session reports
  не видавати за постійний GitHub artifact, доки їх окремо не опубліковано.
