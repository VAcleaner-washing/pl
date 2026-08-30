# VAcleaner v4.2.32 — RELEASE REPORT

## ЗРОБЛЕНО

1. **Повний аудит шрифтів адмінки.** Перевірені всі 10 основних розділів: бронювання, календар, найближчі, техніка, клієнти, кампанії, фінанси, аналітика, хімія та налаштування; окремо — картка клієнта, картка бронювання, фінальні розрахунки та glass/PWA-шар.
2. **Прибрано blanket-bold.** Службовий текст, labels, statuses, badges і secondary actions більше не конкурують із сумами та заголовками. Канон: helper/meta 400–460, label/status 480–500, controls 500–560, values 550–600, section headings ~600, top headings 650–670.
3. **`Видана` та інші статуси** знижені до `font-weight:500`; статус більше не виглядає як головний заголовок картки.
4. **Фінансові pills розділені семантично.** `Попередньо повернути` / `До сплати` — спокійний label; сума — окремий сильніший value. `Залоговий платіж` / стан — спокійні; `1 500 грн` — окремий акцент.
5. **Картка клієнта — labels відділені від values.** `Основний канал`, `Адреса доставки`, `Під’їзд / поверх / домофон / орієнтир` мають `500`; введені значення — легші, щоб форма не зливалася в одну жирну масу.
6. **Loyalty meta зроблена читабельною.** Замість одного рядка `Regular · 3 завершених оренд · базова знижка −5%`: `Regular` — окремий badge, кількість оренд — medium, `−5% базова знижка` — окремий акцент.
7. **Client actions та referral controls** вирівняні по вазі; post-canonical `admin-glass-test.css` більше не повертає старі `700–750` на кнопки/дії.
8. **Finance vehicle cards** теж приведені до тієї ж ієрархії: назва авто 580, ключова сума 600, пояснення 430–470.
9. **Glass CSS freeze baseline навмисно оновлено** під новий typography contract, щоб старий freeze-test не змушував повертати жирні стилі.
10. **SYSTEM SPEC оновлений.** Typography hierarchy та заборона blanket `strong/b = 600+` зафіксовані як regression contract.

## ПЕРЕВІРЕНО

- SYSTEM SPEC CONTRACT — PASS · v4.2.32 build 4232.
- Static QA — **90/90 PASS · FULL QA GREEN**.
- `test:v4.2.32-admin-typography` — **33/33 PASS**.
- Admin typography browser audit — **184/184 PASS** на 390×844, 768×1024, 1024×768, 1440×900.
- Mobile client card — **3/3 PASS**.
- Admin context navigation — **11/11 PASS**.
- PWA v4.24 focus — **8/8 PASS**.
- Glass primary — **FULL GREEN**.
- Desktop density — **63/63 PASS**.

## НЕ ЗМІНЕНО

- Booking/settlement/deposit business logic.
- Delivery pricing / route calculations.
- Referral reward logic.
- Supabase schema/data and Edge Functions.
- VA HOME.

## ВІДОМИЙ НЕЗАКРИТИЙ GATE

Повний PWA aggregate цього RC **не позначається GREEN**: попередній повний v4.2.32 PWA прогін мав окремий mobile card-height guard на 320/430 px. Typography/browser suites вище зелені, але merge у `main` — тільки після штатного GitHub `Browser QA aggregate gate` без FAIL.

## DEPLOY STATUS

**QA-RC.** Не merge у `main` до повного GitHub Browser QA GREEN.
