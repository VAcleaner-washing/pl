# VAcleaner v4.2.28 — referral modal UX + contact channel

Це точковий frontend/QA release поверх v4.2.27. Він не додає нових Supabase migrations, Edge Functions або змін VA HOME.

## 1. QA branch

Працювати через окрему гілку `qa/v4.2.28-referral-modal`. `main` не використовувати як тестову гілку.

Перед merge перевірити актуальний production commit і дочекатися зелених required jobs GitHub Actions. Якщо CI знаходить проблему — виправити в QA branch і повторити повний QA. Не merge-ити реліз лише на підставі локального static PASS.

## 2. Що змінено

- referral modal бере Instagram / Telegram / preferred contact з актуальної картки клієнта, а порожній або старий snapshot бронювання більше не перекриває поточний профіль;
- якщо основний канал клієнта — Instagram, кнопка Instagram показується першою та як primary action;
- Telegram не ховається, якщо він доступний як додатковий канал; fallback за номером телефону збережено;
- готовий текст повідомлення видно одразу, без прихованого accordion/details;
- кнопка `Скопіювати текст` знаходиться безпосередньо біля повідомлення;
- desktop dialog звужений до реальної ширини контенту, без порожньої правої колонки;
- двокрокова фіксація `відкрити канал → Так, надіслано` та referral analytics не змінені.

## 3. System Spec contracts

Release відповідає DATA-002, REF-005, REF-006, REF-007, REF-008, новому REF-009, UI-004 та UI-006.

Локально перевірено:

- `SYSTEM SPEC CONTRACT: PASS · v4.2.28 build 4228`;
- static release gate: `86/86 PASS`;
- referral admin responsive QA: `5/5 PASS`;
- targeted referral modal visual QA: `7/7 PASS`;
- growth visual QA: `135 PASS`;
- content visual regression: `174 PASS`.

Повний browser e2e у цьому робочому середовищі не був позначений GREEN: Playwright-managed Chromium тут відсутній, системний Chromium блокує local-loopback тестовий URL (`ERR_BLOCKED_BY_ADMINISTRATOR`), а завантаження browser binary недоступне через мережеве/DNS обмеження. Це environment blocker, тому перед production merge потрібен штатний GitHub Browser QA aggregate gate.

## 4. Backend

v4.2.28 не вводить backend-змін. Якщо backend частина v4.2.27 ще не була застосована, виконати її за deployment plan v4.2.27 до production merge. Якщо v4.2.27 вже в production — додатково Supabase для v4.2.28 не чіпати.

## 5. Post-deploy smoke

1. Відкрити картку клієнта, де `Основний канал = Instagram`, і запустити `Приведи друга`.
2. Переконатися, що Instagram — основна кнопка, Telegram лишається додатковою, якщо доступний.
3. Переконатися, що весь текст повідомлення видно одразу і він копіюється кнопкою `Скопіювати текст`.
4. На desktop перевірити, що dialog не має порожньої правої колонки.
5. Відкрити Instagram/Telegram: до натискання `Так, надіслано` статус у referral analytics не повинен фіксувати відправлення.
