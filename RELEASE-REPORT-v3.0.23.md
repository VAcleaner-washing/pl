# VAcleaner v3.0.23 — Full Stabilization & Regression Repair

Дата: 07.08.2026  
Build: 3023

Цей реліз — не точковий hotfix. Це stabilization/refactor pass поверх v3.0.21 із прибиранням конфліктних mobile/PWA override-ів та уніфікацією бізнес-логіки сайту, адмінки й backend.

## 1. Єдине бізнес-ядро

- Тариф, кількість оплачуваних діб, weekend classification, залоговий платіж та slot overlap зведені в shared core.
- Public booking, admin UI та активні Edge-функції використовують однакові правила.
- Старі ланцюги делегування `booking-v5 → booking-v4` та `admin-v3 → v2 → legacy` прибрані з нового коду v3.0.23.
- Доданий окремий SQL authority для атомарного резервування інвентарю.

## 2. Тариф оренди: правильна межа вихідного

- П’ятниця ранок — будній тариф.
- П’ятниця вечір — тариф вихідного дня.
- Субота — вихідний тариф.
- Неділя ранок — вихідний тариф.
- Неділя вечір — будній тариф.
- Подобова оренда рахується за оплачуваними добами/вікнами, а не просто календарними датами.

## 3. Залоговий платіж

Назва у UI: **«Залоговий платіж»**.

Контрольні правила для 1 одиниці:
- субота ранок → неділя ранок = 1 доба → 1000 грн;
- субота вечір → неділя вечір = 1 доба → 1000 грн;
- п’ятниця вечір → неділя ранок = 2 доби / weekend → 2000 грн;
- п’ятниця вечір → неділя вечір = weekend → 2000 грн;
- субота ранок → понеділок ранок = weekend → 2000 грн.

Групи:
- 1 одиниця: 1000 / weekend 2000;
- 2 одиниці: 1500 / weekend 3000;
- Генеральне: 2000 / weekend 3000;
- HOME RESET: 3000 / weekend 4000.

## 4. Availability / інвентар / ранкове повернення

- Використовується half-open slot модель `[start, end)`.
- **Повернення вранці звільняє техніку для нової видачі вранці цього ж дня.**
- Availability перевіряється по кожному півдобовому слоту окремо, а не сумою по всьому періоду.
- Для комплектів перевіряється доступність усіх потрібних ресурсів.
- SQL authority використовує transaction advisory lock, тому дві одночасні підтверджені броні не можуть перевищити capacity.
- `pending` не резервує техніку.
- `waiting_payment` резервує тільки з дійсним `hold_expires_at`.
- `confirmed` та `issued` резервують інвентар.
- Підтвердження повторно проходить через той самий reservation authority.

## 5. Найближче вільне вікно на сайті

Якщо обраний період недоступний:
- сайт більше не показує лише тупе «немає техніки»;
- показує **найближчий сумісний старт**;
- шукається вікно, де **весь обраний комплект** вільний на **ту саму тривалість**;
- є явна кнопка «Обрати …»;
- застосовується весь період: дата/слот отримання + дата/слот повернення;
- клієнт може замість цього вибрати іншу дату вручну.

## 6. Manual 10% discount / loyalty

- Виправлено regression `600 → 540 → 600`.
- Manual 10% більше не може бути затерта наступним серверним перерахунком.
- Manual-знижка зберігається при unrelated edit.
- Змінити/зняти manual 10% можна лише явною дією менеджера.
- Loyalty не перезаписує manual-знижку.
- Pricing винесено в окремий тестований модуль.

## 7. Статуси

- Заборонено нелогічний downgrade `confirmed → waiting_payment`.
- Редагування дозволене тільки для pre-issue станів.
- Pending-заявки не блокують інвентар.
- Confirmation/issue працюють через єдину reservation model.

## 8. Mobile / PWA shell — повний refactor

Прибрано нашарування суперечливих mobile CSS override-ів.

- Один primary layout contract для `<=900px`.
- App shell стабільний на `100dvh`.
- `.main` — єдина основна scroll-area.
- Bottom navigation фізично pinned до нижнього viewport.
- Меню не «ходить» вгору/вниз при scroll.
- `visualViewport` більше не змінює висоту всього app shell.
- Keyboard-state обробляється окремо.
- Bottom-nav ховається при клавіатурі замість стрибка вгору.
- Після закриття клавіатури menu повертається точно до нижнього краю.
- Safe-area для iPhone/Home Indicator врахована.
- Landscape iPhone окремо протестований.
- Tablet окремо протестований.

## 9. Login на iPhone

- Inputs мають мінімум 16px — Safari більше не повинен auto-zoom при фокусі.
- Прибрано примусове `scrollIntoView(... center/smooth)`.
- Login viewport не rubber-band scrollиться сам по собі.
- При клавіатурі рухається внутрішня auth-card лише коли потрібно.
- Кнопка входу лишається доступною над клавіатурою.
- Після логіну viewport не повинен лишатися у випадковому zoom-state.

## 10. Mobile «Бронювання»

- KPI-картки більше не приховуються в горизонтальній каруселі.
- Фільтри wrap-ляться, а не обрізаються справа.
- Контент не дрейфує горизонтально.
- Всі вкладки відкриваються зверху.
- Композиція ущільнена без зменшення tap targets нижче 44px.

## 11. «Нове бронювання» — mobile rebuild

- На телефоні працює як справжній stepper: один активний крок.
- Header / progress / scroll-content / footer мають окремі стабільні рядки.
- Footer pinned та не перекриває Home Indicator.
- Дати більше не підставляються приховано автоматично.
- Return date може слідувати за start date лише поки менеджер сам її не змінив.
- Клавіатура не ламає footer.
- Дата/час не залежать від сусідніх секцій.
- Всі контролі мають стабільну геометрію.

## 12. «Редагувати бронювання»

- Виправлено баг, коли форма не скролилась.
- Тепер є реальна внутрішня vertical scroll-region.
- Контент реально прокручується.
- Footer лишається pinned під час scroll.
- Використовується той самий стабільний booking editor, а не окремий legacy layout.

## 13. «Гуляюча» дата

- Admin date controls переведені на фіксовану геометрію.
- Y-position / height не змінюються після вибору дати.
- Геометрія відновлюється після переходу між кроками.
- Public custom date controls також перевіряються на invariance.
- Відкриття/закриття календаря не повинно зрушувати поле.

## 14. Налаштування mobile/PWA

- Картки налаштувань використовують всю ширину мобільної колонки.
- Time-slot controls не виходять за межі карток.
- Прибрано вузьку «desktop-колонку» на половину екрана.
- Нижнє меню лишається pinned при довгих налаштуваннях.

## 15. «Видача техніки» desktop

- Модалка ущільнена без дрібного тексту.
- На 1440 / 1280 / 1024 перевіряється відсутність internal vertical scroll.
- Footer не обрізається.
- Мінімальні кнопки лишаються 44px+.

## 16. Desktop regression

- Усі 8 вкладок перевіряються на runtime JS errors.
- Немає horizontal overflow на 1440 / 1280 / 1024.
- Немає видимих елементів за межами viewport.
- Long customer names / addresses wrap-ляться.
- Усі основні модалки перевіряються на margins, footer clipping, overflow.
- Settings grid / deposit card не виходять за main-column.

## 17. Carp-Deta в «Хімії»

- `Плямовивідник Carp-Deta 30 мл — 100 грн` входить у shared catalog.
- Відображається в «Хімії» та редакторі цін.
- Виправлено migration bug: старий localStorage/Supabase catalog більше не може вирізати нові default-позиції.
- Settings Edge нормалізує дані проти актуального каталогу.

## 18. Telegram 400 Bad Request

- Заборонено старе формування `t.me/+номер?text=...`, яке могло давати nginx 400.
- Якщо є коректний Telegram username — формується username-link.
- Якщо username немає — використовується підтримуваний Telegram share URL.
- Окремий regression gate забороняє повернення прямого `t.me/+` URL.

## 19. PWA update / deep-link / offline

- Controlled update prompt з явною дією оновлення.
- Update можна відкласти без примусового reload.
- Push deep-link відкриває конкретне бронювання.
- Offline transition не стирає збережену auth-session.
- Shell не робить offline financial mutations.

## 20. Клієнти / історичні оренди

Імпортовано історію з файлу «Бронювання»:
- **356 виконаних історичних оренд**;
- **309 090 грн** виручки за полем «Ціна»;
- `HIST-*`: chemistry = 0 за умовою імпорту;
- **348** історичних рядків мають реальний телефон;
- **275** унікальних реальних телефонів;
- усі 275 історичних клієнтів з реальним телефоном є в `vacleaner_customers`;
- номер не вигадується, якщо в джерелі його немає.

Важливо:
- існуючі реальні `VAC-*` бронювання **не обнулялись по хімії/extras**;
- фактична хімія та додаткові позиції у вже існуючих орендах збережені як були в БД/audit.

## 21. Privacy / build hygiene

- Приватний файл історичного імпорту не входить у GitHub release archive.
- Build-check забороняє випадкове включення приватних import-файлів.
- Python `__pycache__` та локальні QA artifacts не пакуються.

## 22. CI / regression gates

GitHub Actions перед deploy запускає:
1. stamp version;
2. static/backend check;
3. rental/deposit/slot policy;
4. stabilization architecture;
5. clean build;
6. E2E source validation;
7. Playwright desktop/mobile E2E;
8. installed-PWA visual QA;
9. desktop density visual QA;
10. final desktop visual audit.

При failure browser evidence завантажується як artifact.

## Фінальні локальні результати v3.0.23

- Static build gate: **246 checks — PASS**
- Rental / deposit / slot policy: **46 assertions — PASS**
- Stabilization architecture: **57 assertions — PASS**
- Finance: **19 scenarios — PASS**
- Backend inventory: **PASS**
- PWA/mobile visual QA: **274 / 274 — PASS**
- Desktop density QA: **60 / 60 — PASS**
- Final desktop visual audit: **205 / 205 — PASS**
- Pages artifact: **191 files — PASS**

### Єдине локальне обмеження

`test:e2e` у поточному контейнері не може відкрити `https://vacleaner.test/...` через системну політику Chromium: `ERR_BLOCKED_BY_ADMINISTRATOR`. Це не позначається як PASS. Тому реальний `test:e2e` лишається blocking gate у GitHub Actions на чистому GitHub runner.

