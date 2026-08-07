# VAcleaner v3.0.15 — DESKTOP DENSITY PASS

Release date: 2026-08-07
Build: 3015
Base: v3.0.14 PWA VISUAL QA + UPDATE + PUSH DEEP-LINK

## Мета

Зробити desktop-адмінку щільнішою й професійнішою без перетворення її на дрібний інтерфейс і без змін mobile/PWA.

## Що змінено — desktop >= 901 px

- Sidebar: 248 → 236 px.
- Topbar: 88 → 80 px.
- Навігація: 50 → 46 px.
- Пошук: 46 → 42 px.
- Заголовок сторінки: 34 → 32 px.
- Operations cards: 104 → 94 px мінімальної висоти.
- KPI та клієнтські картки ущільнено по padding/gap.
- Модальні заголовки: приблизно 31 → 28 px.
- Поля та premium controls: цільова висота 46–48 px.
- Generic modal: до 830 px замість 880 px.
- Issue modal: до 680 px.
- Finance modal: до 700 px.
- Каталог: менші padding/gap та 44 px price controls.
- Settings cards та notification cards ущільнено.
- Основні кнопки залишені не нижче 44 px.

## Що НЕ змінено

- Mobile/PWA <= 900 px.
- Фінансова логіка.
- Supabase schema / RLS / Edge Functions.
- Каталог і тарифи.
- Push, Service Worker, PWA update flow, deep-links.

## QA

### Static / business
- `npm run check` — PASS, 232 file checks.
- `npm run build` — PASS, 191 files / ~4910 KiB.
- JS/Python syntax — PASS.
- Desktop density static guard — PASS.

### Installed PWA visual QA
- 156 / 156 — PASS.
- 320 / 390 / 430 mobile, tablet, landscape, auth keyboard, desktop.
- Mobile/PWA regression after desktop changes: none detected.

### Desktop density Chromium QA
- 54 / 54 — PASS.
- 1440×1000, 1280×900, 1024×768.
- Checked: shell overflow, topbar/sidebar density, type readability, operations, new booking modal, issue modal, finance modal, footer visibility, 44 px actions.

### Browser E2E
- Test source compiles and GitHub Actions still runs it on the hosted Chromium runner.
- Local system Chromium blocks virtual-domain navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; this result is not counted as a passed local E2E run.

## CI

Added `Run desktop density visual QA` to GitHub Pages build. Deployment is blocked if this QA fails. Failure artifacts now include `density-test-results`.

## Verdict

Desktop is intentionally ~5–9% denser, while body text remains readable and primary actions remain >=44 px. Mobile/PWA behavior from v3.0.14 is preserved.
