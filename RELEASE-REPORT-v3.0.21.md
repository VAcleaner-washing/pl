# VAcleaner v3.0.21 — iPhone Viewport + Login Zoom + Mobile Bookings Visual Pass

## Причина релізу
Реальні iPhone-скріншоти показали дві окремі проблеми:
1. login-екран міг рухатися/підстрибувати при відкритій клавіатурі;
2. iOS Safari міг автоматично збільшувати сторінку після фокусу в полі логіну/пароля, через що після входу адмінка виглядала неприродно великою.

## Виправлено
- Mobile login inputs тепер мають мінімум 16px — Safari більше не повинен запускати input auto-zoom.
- При успішному вході активне поле blur-иться до перемикання на shell; viewport синхронізується і scroll position скидається.
- `visualViewport.scroll` більше не перебудовує висоту всього застосунку.
- Viewport синхронізується по resize/orientation/visualViewport resize.
- Доданий контроль `keyboard-open` через фактичну висоту Visual Viewport.
- Auth shell зафіксований у visual viewport і більше не є зовнішнім scroll-container.
- Якщо клавіатура не залишає місця, скролиться лише `.auth-card`, без rubber-band руху всього екрана.
- Focus handling використовує `nearest/auto` замість smooth center-scroll.

## Mobile bookings visual pass
Точково ущільнено тільки mobile:
- hierarchy заголовка сторінки;
- operation/KPI cards;
- filter chips;
- booking card spacing/type scale.
Tap-targets залишені 44px+.

## Regression protection
PWA visual QA тепер окремо перевіряє:
- auth inputs >=16px;
- locked outer auth viewport;
- card inside simulated keyboard viewport;
- keyboard focus does not pan body/html/auth shell;
- login action remains reachable;
- no horizontal overflow.

`test-density.mjs` також виправлений: він перевіряє лише власний v3.0.15 desktop-density block, а не помилково забороняє законні mobile changes у наступних релізах.

## QA
- `npm run check`: PASS — 238 file checks
- `npm run build`: PASS — 191 files
- PWA visual QA: 160/160
- Desktop density/no-scroll QA: 60/60
- Final desktop visual QA: 202/202
- Deposit policy: 24 assertions
- Finance: 15 scenarios
- Session: 4 scenarios
- UX: 17 scenarios
- Local generic E2E remains unavailable in this environment because navigation to `https://vacleaner.test` is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; GitHub hosted Chromium remains the deployment runtime gate.

## Backend
No new business/backend logic in v3.0.21. Production Edge Functions deployed with the v3.0.20 paid-day/weekend policy remain unchanged:
- `vacleaner-booking-v5` v5 ACTIVE
- `vacleaner-admin-bookings-v3` v12 ACTIVE
