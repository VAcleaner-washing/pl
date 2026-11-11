# Дві версії VAcleaner та поетапний перехід

## Зафіксована стабільна версія

- Робоча адмінка: https://vacleaner.pp.ua/admin/bronuvannia/
- Версія: **4.3.46 / 4346**.
- Commit: `15bf61dc4da4cf63405a25887353e6ec7178dce8`.
- Окрема гілка з цим commit: `stable/v4.3.46-4346`. Не переміщувати її на нові зміни.
- Pages archive: `VAcleaner-v4.3.46-build4346-pages.zip`, 270 файлів.
- SHA-256: `1d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e`.
- Пофайлові контрольні суми: `docs/stable-4346-manifest.json`.

Під час цього етапу main, робочий сайт і production Supabase не змінюються.
Посилання «Робоча 46» в LAB відкриває наявну адмінку. Це перемикання між
окремими середовищами: встановлені PWA мають різні origins, назви, іконки та сховища.

## Поточний LAB candidate: 4.3.52 / 4352

Адреса: https://vacleaner-admin-lab.mrcrazy6336.chatgpt.site/admin/bronuvannia/

Публікація приватна, лише для власника Site. Потрібна авторизація власника ChatGPT.
Доступ у standalone iOS PWA потрібно перевірити на реальному пристрої; приватна
авторизація хостингу може вимагати повторного входу в Safari.

LAB містить R1 (достовірні стани й метрики), R2 (компактні оренди) та R3 (безпечні форми). Експериментальний компактний список,
видиму головну дію в деталі й розкриття фінансових рядків. Повний вигляд списку
доступний перемикачем. Усі бізнес-дії делегуються наявним обробникам інтерфейсу.

Дані синтетичні, зберігаються лише в цьому браузері. «Керування» дозволяє
експортувати/скинути їх, увімкнути затримку, помилки читання або збереження.
На іншому пристрої буде окрема пісочниця. Очищення браузера видалить тестові зміни.
Не вводити реальні телефони, ПІБ, документи та фінансові записи.

Це перевірка UX, а не повна копія backend. Розрахункові pure functions pricing/settlement
беруться з канонічних модулів без змін. Наявність техніки й доставка демонстраційні.
Referral RPC, статусні виправлення, документи, SMS/push, реальні контакти та інтеграції
не виконуються й не повертають фіктивний успіх. Порожні referral/campaign віджети
відображають справді порожній набір синтетичних записів.

Повний початковий backlog з 22 задачами, статусом кожної та додатковим підтвердженим desktop finding VA-AUD-23:
`docs/ADMIN-IMPROVEMENTS-BACKLOG.csv`. Статус candidate/LAB не означає production release.

## Порядок робіт до переходу

| Етап | Обсяг | Критерій готовності | Вплив / складність / ризик |
|---|---|---|---|
| R1 — готовий candidate | Стани збереження, partial settlement, settings draft, referral/financial labels, async lookup, помилки модулів | 92/92 canonical QA, WebKit, GitHub CI у PR #58 | Високий / M / середній |
| R2 — збережена попередня LAB | Ізоляція, stable backup, компактний список, нижня головна дія, фінансовий disclosure, test controls | Ізоляційні тести, canonical QA, Chromium/WebKit, приймання на iPhone | Високий / M / низький для production, середній для LAB UI |
| R3 — поточний candidate | Одна система кнопок/полів/статусів, 44px targets, модальні шаблони, keyboard/safe-area, dirty-close захист для решти форм | Перевірка всіх modal/tab/form станів, VoiceOver, фізична iOS PWA | Високий / M–L / середній |
| R4 — P1 | Окремий staging backend із синтетичною базою та живими auth/RLS/RPC; idempotency й невідомий результат transport error | Persisted read-back, timeout після commit, duplicate/partial retry, status correction, referral атомарність | Високий / L / високий; окреме рішення щодо інфраструктури |
| R5 — P2 | Пагінація/агрегати повної історії, вимірювання довгої сесії; період і повнота фінансового обліку | 400+ оренд / 300+ клієнтів, memory/idle/API бюджети; незалежні actual/cohort метрики | Середній–високий / L / високий для метрик |
| R6 — P2/P3 | Консолідація CSS компонентами, скорочення overlays і точкові візуальні правки інших розділів | Screenshot comparison + повний regression gate після кожного компонента | Середній / L / середній |
| Перехід | Перевірений UI з production API після staging й окремого рішення | Усі gates нижче; один release commit / build / artifact | Високий / M / високий |
| Завершення | Прибрати старий served UI після приймання та узгодженого періоду стабільності | Перевірений rollback залишається доступний в архіві | Низький / S / середній |

P0: негайно зупиняти просування candidate, якщо з'являються неправильні фінансові
суми, розходження UI/бази, дублікати записів або витік доступу між середовищами.
Нову технологічну платформу чи зміну бізнес-правил цей план не вимагає.

Під час майбутнього переходу перенести прийнятий presentation layer у канонічні assets;
**не копіювати LAB artifact у production**. Production build повинен не містити
синтетичного adapter/fixtures/controls і працювати з перевіреним серверним API.

## Перед кожним наступним релізом

1. Від актуального успішного production commit створити candidate; перевірити System Spec,
   release.json, build, workflow та фактичний deploy. Не вважати merge деплоєм.
2. `npm run qa:full`, окремий `npm run test:webkit`, візуальний перегляд контрольних
   екранів на 320/390/430/768/1440 і responsive checks до 1648px.
3. Нова заявка → передоплата → підтвердження → видача → продовження → повернення →
   доплата/повернення залишку → завершення. Перевірити повторне відкриття, reload,
   server rejection, committed write/failed read, late lookup, double click й retry.
4. На фізичному iPhone 17 Pro Max: установка обох PWA, клавіатура, safe areas,
   VoiceOver, one-hand navigation, back/focus/scroll, background/resume, втрата зв'язку,
   worker update з незбереженою формою. Емуляція не заміняє цей gate.
5. Для інтегрованого staging: незалежний read-back фактичного persisted state,
   auth/RLS, availability, referral actual/cohort cross-period, фінансові інваріанти,
   документи та неможливість реальної відправки повідомлень із staging.
6. Changed-file audit; незмінність фінансових модулів поза погодженим scope;
   remote tree = перевірений local tree; green GitHub CI; точний архів і rollback drill.

## Повернення frontend на 46

Поки production залишається на 46, достатньо відкрити робочу адресу. LAB можна
скинути або припинити використовувати без впливу на роботу.

Для майбутнього повернення **після** погодженого переходу спочатку перевірити архів:

```bash
python scripts/verify-stable-archive.py /path/VAcleaner-v4.3.46-build4346-pages.zip --extract /workspace/restore-4346
```

Скрипт перевіряє SHA архіву, кожен файл, перелік і безпечність шляхів та release.json.
Він лише готує новий staging-каталог, нічого не деплоїть. Потім перевірити сумісність
46 з актуальним backend, виконати smoke у staging і лише за рішенням власника
розгорнути точний Pages artifact. Не робити force-push/reset main.

Важливо: service worker новішої версії повинен дати HTML перейти на 46 через
network-first навігацію. Перевірити release.json із cache-bust, loaded asset build,
новий активний worker/cache та встановлену PWA після повторного відкриття. Якщо
майбутній worker порушить цю сумісність, rollback блокується до її відновлення.

**Не відновлювати стару бізнес-базу для повернення UI.** Реальні нові оренди та
платежі залишаються. Якщо майбутні backend зміни порушать зворотну сумісність,
виконувати окремий узгоджений backend plan; цей архів не є database backup.
Після видалення старого served UI зберегти commit, manifest й перевірений архів.

## R3: спільний захист форм

- Закриття зміненої форми, Escape, backdrop і перехід до іншого розділу запитують явне рішення. «Продовжити редагування» залишає ту саму форму та вибраний файл. Неперезаписаний автоматичний prefill не вважається зміною користувача.
- Під час збереження вихід блокується. Поля тимчасово `inert`, зберігаючи участь у FormData; їх не вимикають через disabled і не приховують помилки сервера.
- Налаштування стають чистими лише після події успішного server acknowledgement. Відмова сервера не скидає чернетку. Пізній refresh витрати не перемальовує інший відкритий розділ.
- Для помилок, увімкнених у LAB, у модалі є «Вимкнути тестові помилки»: це дозволяє повторити збереження без втрати чернетки й не виконує запис автоматично.
- Мобільні поля мають 16px, кнопки — щонайменше 44px, user zoom дозволено. Native summaries включені до циклу клавіатурного фокуса; тло модалі ізольовано. Висота модалі використовує наявні visualViewport/keyboard variables; pinch zoom не вважається клавіатурою.
- Native beforeunload warning — лише best effort. OS-level закриття iOS, фактична клавіатура, safe areas та VoiceOver лишаються перевірками на пристрої. Система не обіцяє автоматичного збереження/відновлення незбережених чернеток.

Попередня LAB R2 збережена як приватна Sites version 1:
`appgprj_6af32ab3d58081919c58e78ea50a8602~appgver_97bcec576458819186151b8881d05361`.
Її runtime source commit: `143f8624d8fa052994c14ac06b923dba9d576817`.
Rollback цієї тестової публікації не змінює production 46 і не відкочує бізнес-дані.


### LAB 4.3.53 / 4353 — bottom navigation candidate

- Production remains stable 4.3.46. Private Site currently serves 4.3.51; 4.3.52 was packaged but not published after WebKit CI failed a desktop Details click at 1024px (run 42977326337, job 130379526965). Chromium/static passed. No retry or weakened assertion converts this to acceptance.
- The 4.3.53 candidate fixes the independently measured LAB navigation shell: height is 82px plus its safe inset. Injected 0px/34px geometry checks are distinct from physical iPhone acceptance. It also saves evidence if the unresolved Details gate fails again.
- The supplied screenshot shows an iOS host sheet with Close/Share controls; outer host chrome can remain black independently of website CSS. Do not promise to remove it or remove home-indicator protection without device evidence.
- R4 is a backend-integration stage name, not an application version. Its hosted project is not created; LAB still stores only browser-local synthetic records. The local Docker disk shortage was in the disposable 8 GiB executor, not the phone or production Supabase.


### LAB 4.3.54 / 4354 — card and time-picker candidate

- Baseline private LAB 4.3.53 was published as Site version 5 after CI 42989682200 passed all gates. Production remains 4.3.46.
- User feedback identifies cramped card More, clipped status and an inconvenient/clipped time list. This candidate changes only LAB presentation/interaction, retaining the canonical 29 time buttons and their original handlers.
- Morning/Day/Evening navigation filters existing choices without writing the form. Current off-grid values remain; selecting a time uses the existing input/change path. Time save/reload is verified against extras, not invented top-level fields.
- Keyboard ownership, simulated safe insets and short-height scrolling are required checks. Physical iPhone acceptance and the earlier intermittent desktop Details timeout remain separate concerns; a successful later run is not a proven diagnosis.
- All original business actions remain available. Main, production Supabase and real dispatch are out of scope. Hosted R4 still awaits explicit organization selection.
