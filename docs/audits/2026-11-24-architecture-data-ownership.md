# Architecture & Data Ownership Inventory

Baseline і межі: [audit](2026-11-24-engineering-product-audit.md). Це карта власності реалізації, а не другий System Spec. Нормативні формули й правила залишаються в [System Spec](../VAcleaner-SYSTEM-SPEC.md).

## Execution і build boundary

Public: committed HTML/RSC/`_next` chunks + enhancement assets; репозиторій є static export, `npm run build` копіює/stamp-ить committed inputs, а не відтворює невідомий Next source pipeline. Відсутність вихідного Next app у цьому build не доводить його відсутності в інших репозиторіях. Потрібен ownership original export при майбутній зміні основної верстки.

Admin: `assets/admin-v250.js` (1489 рядків, багато довгих render functions), versioned enhancement/CSS layers; нормальний production UI формується також із `sandbox/ui.*`, `sandbox/forms.*`, `staging/ui/mobile.css`. Назва sandbox не означає, що файл не впливає на production. `build-admin-release-candidate.mjs` додає три operations assets і змінює shell/worker. Canonical dist 270 файлів, deployed normal candidate 273. Тестування лише raw dist недостатньо для promoted UI.

Backend: Edge Functions з Supabase client; shared Postgres public schema, RLS, transactional RPC, migrations, object storage для документів, push/SMS/external route integrations. Deployed metadata підтверджує original project `yweluzclearwrazdkahu`; окремий staging `jdthhqxzfpvosfdxwfem` існує, але його fixtures/credentials цим аудитом не використовувалися.

## Ownership map

«Власник» нижче — код/система, а не вигадане персональне призначення. Accountable business/security/release owners мають бути визначені власником продукту.

| Дані / рішення | Авторитет і write boundary | Readers / fallback | Verification |
| --- | --- | --- | --- |
| Catalog/default tariff/resources/deposit/slots | `config/vacleaner.json` → stamp-generated core/server config; global overrides через `vacleaner-settings` | public catalog, admin, booking/extend; stamped config offline fallback | TECH-001, config/core checks; HTML не authority |
| Booking | `vacleaner_bookings`, `vacleaner_booking_resources`, immutable/persisted extras snapshot | public create `vacleaner-booking-v5`, manager `vacleaner-admin-bookings-v4` | DATA-001, status, idempotency, availability suites |
| Capacity/serviceability | `vacleaner_inventory`, `vacleaner_equipment_units`, unit events; service RPC under reservation mutex | fleet API, booking availability, calendar | fleet migration and tests; do not infer zero from failed read |
| Customer current contacts/documents | `vacleaner_customers`, protected document storage/API | CRM and referral modal; booking retains historical snapshot | DATA-002; no PII exported in audit |
| Pricing/discount previews | generated core + server `pricing.mjs`; server validates persisted write | public/admin previews; `calc()` projects snapshot | finance/deposit/discount fixtures; mirrored formulas need equivalence proof |
| Settlement/payments | persisted booking amounts/state; `settlement.mjs` and manager mutation guards | `calc()` service/received/refund/due presentation | `test:finance`, financial-control, settlement tests; received ≠ profit |
| Global delivery/purchase investment | `vacleaner_settings` via settings API | acknowledged local cache; booking route snapshot preserved | rejected save/retry/reload fixtures; cache not independent authority |
| Promo/referral | campaigns/promo redemptions; referral codes/uses/rewards/messages; atomic RPC where specified | CRM, booking, retention analytics | REF-010/011; source attribution distinct from reward ownership |
| Notifications | dispatch claims, SMS dispatch/recipient audit, push subscription/config | reminders/SMS/push functions | dedupe fixtures; no real send during audit |
| Expenses/business metrics | `vacleaner_expenses` + booking/status/refund data | finance/analytics decision views | metric semantics require reconciliation; no invented ledger |
| Session/auth | Supabase Auth token validation + admin allowlist in Edge | browser remembered session/singleflight refresh | auth fixtures; shared allowlist boundary review outstanding |
| Release | package/release build + production receipt tree pin + exact Actions artifact | Pages deploy, SW/cache, live readback | local tree/Actions ZIP/live must be recorded separately |

## Shared infrastructure and live metadata

Live metadata reads 2026-11-24: 23 `vacleaner_*` tables, all with RLS. 19 direct-deny policies; address cache, fleet units/events and notification claims have no policies, consistent with default deny for browser roles. All enumerated VAcleaner SECURITY DEFINER RPCs deny EXECUTE to `anon` and `authenticated`; `vacleaner_slot_index` permits both but is invoker. This inventory does not validate every function body, schema or storage policy.

Deployed `vacleaner-admin-bookings-v4` v12 (`verify_jwt=false`, internal auth) and fleet v1 (`verify_jwt=true`) both call `auth.getUser` then query **`admin_users`**. Existing production-inventory README explicitly allows this shared table or retained mirror. It conflicts with an assumption of product-specific authorization, not necessarily with current documented behavior. No customer/admin identifiers were read. Separate negative role tests are required before any claim of isolation; see G01.

Database advisor: no missing-RLS warning returned; WARN for public `pg_net`, authenticated SECURITY DEFINER `is_admin` and `claim_customer_orders`, and disabled leaked-password protection; INFO no-policy includes intentional internal tables. These shared findings require joint ownership; changing VA HOME objects is outside scope. Shared service credentials can bypass RLS, so prefixes and browser-deny policies do not bound compromised Edge service access.

Migration source/history names differ: local fleet `20261117090000_vacleaner_equipment_units_v4366.sql`, live history `20261118090156_vacleaner_equipment_units_v4366`. This proves identity mapping is needed, not a missing migration or unequal SQL. Snapshot `production-inventory/edge-functions.json` dates 2026-10-20 and DB inventory omits new fleet tables; static consistency is not live drift verification.

## Duplication leads, not removal instructions

Generated catalog copies are deliberate outputs. Browser and server rental/deposit/delivery calculations are trust-boundary mirrors; canonical generation and cross-runtime fixtures should be checked before extraction. `site-attribution.js` and `booking-funnel-analytics.js` independently capture attribution with similar keys/TTL/referrer logic: candidate shared contract, not proven double events. Session recovery appears standalone and in the browser registry, but setup/assertion equivalence is unproven. No code or test was removed.
