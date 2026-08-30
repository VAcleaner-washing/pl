# VAcleaner v4.2.30 — FUNCTION HARDENING + VEHICLE PROFILES

## ЗРОБЛЕНО
- `vadym` → **Passat CC**; `anna` → **Fiesta**. Stable IDs збережені.
- Passat CC: petrol, 11 л/100 км; Fiesta: LPG, 10 л/100 км.
- Public + admin create мають `client_request_id` та DB unique guard проти подвійних бронювань.
- Idempotent retry public create перевіряється до rate-limit, тому повтор мережевого запиту не витрачає create quota.
- Immediate new-booking push і cron new-booking reminder мають спільний atomic dispatch key.
- Issue/return reminders і peer admin push мають durable dedupe claims.
- Reminder state очищається від неактивних бронювань.
- Rental extension використовує локальні shared pricing/config/settlement без pinned GitHub runtime import.
- Referral mark-sent повтор у короткому вікні не дублює analytics message.
- Dead 15-delivery calculator видалено; активна вибірка = до 30 доставок.
- Active admin v4 logger виправлено.
- SYSTEM SPEC оновлено під v4.2.30 / build 4230.

## PRODUCTION DB
- `client_request_id` + unique partial index — застосовано.
- `vacleaner_notification_dispatch_claims` + claim/finish RPC — застосовано.
- `delivery_fee.fuel.cityCars` — Passat CC / Fiesta — застосовано.
- Atomic dispatch self-test: first claim=true, duplicate claim=false; тестовий запис очищено.

## PRODUCTION EDGE FUNCTIONS
- `vacleaner-settings` → v21 ACTIVE
- `vacleaner-booking-v5` → v27 ACTIVE
- `vacleaner-admin-bookings-v4` → v7 ACTIVE
- `vacleaner-reminders-v1` → v9 ACTIVE
- `vacleaner-push` → v9 ACTIVE
- `vacleaner-extend-rental-v1` → v6 ACTIVE

## QA
- Static aggregate: **88/88 PASS** (`qa-release-summary.json`).
- SYSTEM SPEC CONTRACT: PASS · v4.2.30 build 4230.
- Build: 492 file checks PASS · shared config `81f96f3fed7fdf9b`.
- v4.2.30 function hardening: **24/24 PASS**.
- Delivery settings: **13/13 PASS**.

## НЕ ПІДТВЕРДЖЕНО ЯК GREEN
- Повний Browser QA aggregate у локальному середовищі не є production proof через блокування локального Chromium/127.0.0.1. Перед merge у main потрібен штатний GitHub Browser QA gate.
