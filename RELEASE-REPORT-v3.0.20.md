# VAcleaner v3.0.20 — Weekend Deposit + CI Stability + No-Scroll

## Що виправлено

### 1. Залоговий платіж — єдине правило всюди
Єдина функція `rentalDays + isWeekendDeposit` використовується у публічній формі, адмінці та активних Supabase Edge Functions.

Контрольні сценарії:
- субота ранок → неділя ранок = 1 оплачувана доба → звичайний залоговий платіж;
- субота вечір → неділя вечір = 1 оплачувана доба → звичайний залоговий платіж;
- п’ятниця вечір → неділя ранок = 2 оплачувані доби → вікенд;
- п’ятниця вечір → неділя вечір = 2 оплачувані доби → вікенд;
- субота ранок → понеділок ранок = 2 оплачувані доби → вікенд.

Правила сум:
- 1 одиниця: 1000 / вікенд 2000 грн;
- 2 одиниці: 1500 / вікенд 3000 грн;
- Генеральне: 2000 / вікенд 3000 грн;
- HOME RESET: 3000 / вікенд 4000 грн.

До вибору дат форма не повинна підставляти прихований період: сума залогового платежу показується як `—` до фактичного вибору дат.

### 2. Копірайт
Публічну назву уніфіковано як **«Залоговий платіж»**. Старий напис «Поворотний залог» заборонений build-check.
У таблиці умов замість нечіткого «повний вікенд» використовується «2+ доби у вікенд».

### 3. GitHub E2E
Прибрано застарілу перевірку, яка вимагала 2000 грн для субота ранок → неділя ранок.
Browser E2E тепер містить усі 5 контрольних сценаріїв вище. GitHub workflow також має окремий блокуючий крок `Verify rental day and deposit policy`, тому бізнес-правило перевіряється до Playwright.
Збережені попередні CI hardening fixes: конкретний close selector, Unicode-space normalization, адаптивний hero threshold, dark-select contract.
`check-build.mjs` блокує повернення старого Saturday→Sunday = 2000 правила.

### 4. Видача техніки без desktop-скролу
Збережено no-scroll pass із v3.0.19. Додано реальну QA-перевірку `scrollHeight <= clientHeight` для модалки «Видача техніки» на 1440/1280/1024.
Кнопки footer повернуті до мінімум 44 px.

## Перевірки
- Deposit policy: 24 assertions — PASS
- Finance: 15 scenarios — PASS
- Session: 4 scenarios — PASS
- UX: 17 scenarios — PASS
- Desktop density + explicit no-scroll: 60/60 — PASS
- Final desktop visual audit: 202/202 — PASS
- PWA visual QA: 156/156 — PASS
- npm run check: PASS
- npm run build: 191 files — PASS
- Python E2E source compilation: PASS

Локальний `test:e2e` не може пройти навігацію через політику середовища (`ERR_BLOCKED_BY_ADMINISTRATOR` / DNS); тому hosted Chromium у наступному GitHub Actions run залишається авторитетним runtime-gate. Це не позначається як локальний E2E PASS.

## Production Supabase
Оновлено та перевірено ACTIVE:
- `vacleaner-booking-v5` — version 5, verify_jwt=false, SHA `21778c8564037fb1ca0cb5af8a921a568977d825a3da27f07599f87b3323b41a`;
- `vacleaner-admin-bookings-v3` — version 12, verify_jwt=true, SHA `e152baf0372b0f78e7c4414f97afb85bc5802a07399996fc034900fd85adb7c5`.

Production runtime HTTP estimate не був додатково викликаний з локального контейнера через недоступний DNS, але обидві розгорнуті функції повторно прочитані з Supabase і мають ACTIVE статус та нову спільну логіку.
