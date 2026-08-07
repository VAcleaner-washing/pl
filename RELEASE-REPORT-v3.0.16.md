# VAcleaner v3.0.16 — FINAL DESKTOP VISUAL AUDIT

Release date: 2026-08-07  
Build: 3016

## Мета релізу

Фінальний desktop-прохід поверх v3.0.15 без нового глобального зменшення інтерфейсу. Масштаб 1440/1280 залишено без змін; виправлялись лише локальні візуальні та responsive-проблеми, знайдені реальним Chromium-рендером.

## Що виправлено

### 1. Налаштування на 1024 px
- Усунуто обрізання правої частини блоку залогів і суфіксів `грн`.
- `settings-grid` та його дочірні блоки отримали `min-width: 0`.
- Для 901–1100 px налаштування переходять у безпечну одноколонкову структуру: залоги → часові слоти → сповіщення → фінансова логіка.
- Самі 4 правила залогу на 1024 px лишаються компактною сіткою 2×2.

### 2. Часові вікна
- Приховані radio-input у виборі часових вікон більше не займають візуальну геометрію.
- Збережено keyboard focus через `focus-visible` на видимому контролі.
- Прибрано ризик мікрозсувів рядків через нативний розмір radio-input.

### 3. Аналітика
- Прибрано дублювання заголовка «Аналітика» всередині вже відкритої сторінки «Аналітика».
- Внутрішній блок тепер має заголовок «Показники» і коротший опис.
- Ієрархія стала компактнішою без зменшення основного шрифту.

### 4. Стрес-тест реальними довгими даними
Фінальний QA окремо перевіряє:
- довге ПІБ;
- довгу адресу доставки;
- довгий коментар;
- картку бронювання;
- нижню частину detail-view;
- empty search state.

Тексти переносяться всередині своїх колонок і не розсовують layout.

## Що НЕ змінювалось

- Глобальний desktop scale v3.0.15.
- Mobile/PWA layout.
- Supabase.
- Edge Functions.
- Фінансова формула.
- Каталог і тарифи.
- Логіка бронювань.

## Візуальні перевірки

### Final desktop visual audit
202 / 202 PASS

Розміри:
- 1440×1000
- 1280×900
- 1024×768

На кожному розмірі перевірено:
- усі 8 розділів адмінки;
- горизонтальний overflow сторінки та окремих елементів;
- topbar / page heading clearance;
- клієнтську таблицю;
- settings grid;
- empty search state;
- stressed booking detail;
- New Booking;
- Process;
- Issue;
- Complete;
- Finance;
- Catalog modal.

### PWA visual QA
156 / 156 PASS

Підтверджено, що desktop-правки не дали регресій на:
- 320 px
- 390 px
- 430 px
- tablet
- landscape
- iPhone safe-area
- keyboard viewport
- offline
- push deep-link
- controlled PWA update

### Desktop density QA
54 / 54 PASS

Підтверджено:
- topbar 80 px;
- sidebar 236 px;
- readable body type;
- 44 px+ primary actions;
- compact new-booking / issue / finance modals;
- відсутність horizontal overflow на 1024/1280/1440.

## Build

- `npm run stamp` — PASS
- `npm run check` — PASS, 232 file checks
- `npm run build` — PASS
- Pages artifact — 191 files, 4911 KiB
- Service Worker cache — `vacleaner-manager-3016`

## CI

GitHub Actions тепер має окремі блокуючі browser-перевірки:
- Desktop/mobile E2E
- Installed-PWA visual QA
- Desktop density visual QA
- Final desktop visual audit

Deployment не стартує, якщо будь-який із цих етапів падає.

## Висновок

Desktop після v3.0.16 не потребує подальшого глобального зменшення. Наступні візуальні зміни варто робити лише під конкретний знайдений сценарій або після фактичного production feedback.
