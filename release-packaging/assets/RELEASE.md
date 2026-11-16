# VAcleaner 4.3.62 / build 4362 — production

**Опубліковано та перевірено на живому сайті.** Власник окремо дозволив публікацію повідомленням «Публікуй» після завершення перевірки кандидата.

- [PR71](https://github.com/VAcleaner-washing/pl/pull/71), reviewed head `1cd9ff828714b844d5d809d31e7f0d9ed96e5ec2`.
- Production main `c180af6e4043386960f6f57cccceee1170ceab9f`; Git tree ідентичний reviewed head: `db527cbb770b1f52ab3149912d6380266d8a51c5`.
- [Production run43874287227](https://github.com/VAcleaner-washing/pl/actions/runs/43874287227), фінальна спроба2. Усі8 ефективних job успішні, включно з **фактичним Pages deploy**, завершеним2026-11-16 о13:37:31UTC.
- Exact production-pages artifact14228544078: **273 файли**, treeSHA256 `24aabedb22bb71199e3409becf2f85d0e116d93c4221cc7958886a62d87afea1`.
- Production ZIP SHA256 `73430f9009c66528bcce3d6dacfb8c58526c718f7174c7b0193c433909d47852`.

## Що змінилося

Виправлено синю смугу всередині19 складених полів налаштувань, декоративні лінії кроків1–4, нескінченне очікування оновлення маршрутів, актуалізацію read-only картки бронювання та стан запізніло створеної нижньої кнопки. Узгоджено календарний годинник Києва, адаптивні картки, статуси, копіювання, життєвий цикл меню та доступні назви полів/вкладок.

Канонічні фінансові формули, знижки, застави, передоплати й статусні правила збережено. Збільшення двома пальцями лишається заблокованим за вимогою власника. Оригінальний Supabase та backend19 не перевидавалися; клієнти, бронювання, фінанси, SQL-схема та повідомлення провайдерів не змінювалися в процесі релізу.

## Перевірки фактичного publishing commit

- Static66/66, candidate boundary19/19, promotion guard7/7.
- Canonical Chromium/PWA49/49; canonical WebKit — усі9 suites.
- Усі4 exact normal-artifact operations успішні; mobile detail12, Settings2, route5, calendar3, forms431, hydration62, startup30 у кожному мобільному браузері.
- Actual worker offline/update/rollback46→62→46 — **40/40 у Chromium і40/40 у WebKit**. Сесія, локальний стан і dirty draft перевірялися на справжньому worker з локальними API fixtures; production writes0.

Перший main-прогін WebKit440 завершився32PASS/1FAIL: фінальний незмінений worker4346 лишався `activating` протягом жорсткого30s ліміту, хоча кеш і всі35 активів були повні, а сторінка продовжувала працювати. Код кандидата, тести, ліміт і перевірки не змінювалися. Один контрольований повтор лише невдалого job на тих самих commit/artifact пройшов40/40; після нього виконався deploy. Успішні job з першої спроби збережено; нові ID у GitHub attempt2 не означають їх повторного виконання. Початковий збій, snapshot і часовий ряд включено до main-pipeline-verification.json. Його причину не оголошено доведеною.

## Живий сайт

Plain release.json підтвердив4.3.62/build4362. Перевірено всі273 URL артефакту: **268 точних відповідей за початковим шляхом**, чотири наявні301-переадресації на канонічні сторінки з точними тілами артефакту та robots.txt з Cloudflare-managed prefix і точним вихідним suffix. Непояснених відмінностей0. Це не273 побайтові збіги за початковими URL; повний доказ збережено у frontend-after.json і live-host-routing-verification.json.

Plain worker URL та старі URL `?v=4346`, `?v=4361`, `?v=4362` віддають точний новий worker. Manifest і normal admin entrypoint збігаються; підтверджено original production Supabase та відсутність тестового banner/transport. Доказ у live-worker-manifest-verification.json. До application API чи реальних бізнес-даних live-перевірка не зверталася.

## Відновлення та межі підтвердження

Додано перевірені архіви попередньої4.3.61/4361 та stable4.3.46/4346. Stable46 має270 файлів, що відповідають immutable manifest; ручний rollback workflow з exact main/manual/ROLLBACK-4346 guards збережено. Жодного фактичного production rollback не виконували. Backend18 code backup залишається у попередньому релізі61; новий backend deploy не є частиною62.

Linux Chromium/WebKit та ін'єкція safe-area не сертифікують фізичний iPhone, нативну клавіатуру, VoiceOver чи OS suspension. Невизначений результат route-запису захищено в поточному runtime; reload або інша вкладка не успадковують цей захист. Серверна ідемпотентність не додавалася.

Дата2026-11-15 у release.json позначає підготовку build; фактична публікація —2026-11-16. GitHub archive publisher лише додає перевірені архіви/квитанції й tag на точний main; повторного Pages deploy не робить.
