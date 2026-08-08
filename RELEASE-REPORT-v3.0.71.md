# VAcleaner v3.0.71 — CLIENT DOCUMENTS & MODAL VIEWPORT FIX

Released: 2026-08-08
Build: 3071
Base: VAcleaner v3.0.70 — BOOKING GTM BOOTSTRAP FIX

## Зміни

### 1. iPhone / PWA modal viewport fix
- Знайдена реальна причина випадкового стану «модалка на пів екрана» після native calendar / numeric keyboard.
- Прибрано правило, яке змінювало геометрію `.modal-card` через `visualViewport` / `--keyboard-viewport-height`.
- `focusout` тепер гарантовано очищає stale `keyboard-open` state і keyboard viewport variables.
- Fixed mobile bottom nav залишається `position: fixed; bottom: 0` і не прив'язаний до `visualViewport`.
- Не додавались нові `!important` або viewport CSS-костилі.

### 2. Фото документа у новому бронюванні
- У кроці клієнта додано приватне фото документа.
- Підтримка: JPG / PNG / WEBP / HEIC / HEIF, до 8 МБ.
- Фото завантажується тільки після успішного збереження бронювання, щоб не створювати orphan files.
- Якщо фото не завантажилось, саме бронювання не дублюється при повторній спробі.
- Для повторного клієнта UI визначає, чи фото вже є в картці, не перезаписуючи локально вибраний файл.

### 3. Картка клієнта
- У вкладці «Клієнти» рядки стали клікабельними.
- Картка клієнта містить:
  - ПІБ, телефон, Telegram, адресу;
  - тип/номер документа та статус перевірки;
  - приватний preview фото документа;
  - можливість додати/замінити фото;
  - кількість оренд, витрачену суму, останню оренду;
  - повну історію оренд зі статусами та сумами.
- Історичні записи без реального телефону відкриваються read-only.

### 4. UI / scroll / surfaces
- Картка клієнта стилізована в поточній темній premium admin UI.
- Немає білої browser surface для нового UI.
- Прибраний native scrollbar chrome у внутрішньому client card scroll owner.
- Немає горизонтального overflow у client card на 320 / 390 / 430 / 768 / 1024 / 1280 / 1440.

## Supabase

Зміни ізольовані до VAcleaner. VA HOME таблиці, Auth/RLS/functions/orders/payments не змінювалися.

### Production applied
- Migration `vacleaner_customer_document_photos` — SUCCESS.
- `public.vacleaner_customers`:
  - `document_photo_path`
  - `document_photo_name`
  - `document_photo_mime`
  - `document_photo_uploaded_at`
- Private Storage bucket `vacleaner-client-documents`:
  - `public = false`
  - max file size: 8 MiB
  - allowed MIME: JPEG / PNG / WEBP / HEIC / HEIF
- Edge Function `vacleaner-customer-documents-v1` — ACTIVE, `verify_jwt=true`.
- `vacleaner-admin-data-v1` — production version 5, `verify_jwt=true`, client list includes document metadata.

### Security model
- Client document photos never receive permanent public URLs.
- View uses a short-lived signed URL (120 seconds).
- Every document request requires a valid Supabase user JWT and an `admin_users` membership check.
- Service role is used only server-side inside Edge Function and is not exposed in frontend/GitHub.
- Actual document photos are not included in this release ZIP.

## QA — final local build

PASS:
- static build check: 333 file checks
- rental/deposit/slot policy: 46 assertions
- stabilization: 159 assertions
- finance: 23 scenarios
- session: 4 scenarios
- UX: 18 scenarios
- retention/campaign: 18 checks
- operational health contract
- CSS architecture
- desktop density guard
- desktop visual density: 60 checks (1024 / 1280 / 1440)
- final desktop visual QA: 232 checks (1024 / 1280 / 1440)
- public booking resilience
- keyboard/nav regression: 320 / 390 / 430
- full PWA visual QA: 512 checks, 0 failures (320 / 390 / 430 / Safari tab / 768 tablet / landscape / auth / public / desktop)
- Pages build artifact generated successfully before cleanup

The generic localhost network E2E smoke could not navigate to `http://127.0.0.1:4173/bronuvannia/` in this execution environment because Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` before page load. This is environment-level and is not counted as a product PASS. Direct Playwright PWA/UI suites completed successfully.

## Production / iPhone status

- Supabase document backend: applied to production and verified through Supabase project state.
- GitHub Pages frontend: NOT deployed by this release packaging step. Do not treat `vacleaner.pp.ua` as v3.0.71 until its production `release.json` returns `3.0.71`.
- Real physical iPhone/PWA: not physically tested in this session. The iPhone/PWA behavior is covered by Playwright regression suites; a real-device screenshot remains the final authority if it differs.
