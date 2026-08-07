# VAcleaner v3.0.38 — PROCESSING WORKFLOW

Release date: 2026-08-07  
Build: 3038

## Scope

This release changes only the manager workflow for processing a new request. The goal is to separate client contact / sent terms from receipt of the 200 UAH prepayment and from final booking confirmation.

No VA HOME resources were changed. No Supabase schema or Edge Function deployment is required for this release; the workflow uses the existing authoritative admin API and persists processing state in the server-side booking note.

## New request workflow

The `Опрацювати заявку` modal now has two distinct actions:

- `Зберегти зміни`
- `Підтвердити бронювання`

Operational sequence:

1. Manager contacts the client.
2. Manager sends the rental terms and marks `З клієнтом зв’язались` and `Умови клієнту надіслано`.
3. `Зберегти зміни` persists the client/document data and processing state. A `pending` request moves to `waiting_payment` / `Очікує оплату` while remaining unpaid.
4. When 200 UAH arrives, manager reopens `Опрацювати заявку`.
5. Previously saved contact/terms checkboxes are restored from the booking record.
6. Manager marks `Передплата 200 грн отримана`.
7. Only then is `Підтвердити бронювання` enabled and the booking can move to `confirmed`.

`Підтвердити бронювання` is intentionally a separate explicit transition and cannot be used before the three operational conditions are satisfied.

## Persistence

The two processing checkpoints are stored in the existing server-side `admin_note` through the normal admin edit API. This avoids adding another database schema surface for two operational booleans while still surviving PWA close/reload/reopen.

Existing document/profile data and prepayment state continue to use the existing backend fields and customer profile logic.

## Mobile modal geometry

The process modal footer now supports three actions safely on PWA:

- Close without changes
- Save changes
- Confirm booking

On mobile, confirmation occupies its own full-width row so the buttons do not compress or overflow.

## QA — final stamped build

- Static/backend file checks: 270 PASS
- Rental/deposit/slot policy: 46 PASS
- Finance: 19 PASS
- Stabilization contract: 127 PASS
- Session: 4 PASS
- UX: 17 PASS
- Retention/campaign rules: 15 PASS
- CSS architecture: PASS, admin CSS remains at 1 `!important`
- Operational health contract: PASS
- Installed PWA/browser visual QA: 466/466 PASS
- Desktop density visual QA: 60/60 PASS
- Final desktop visual audit: 223/223 PASS
- Public booking resilience: PASS (`19 → 19` mutation plateau; unavailable 409 stays in-page)
- Pages build: 193 files / 4969 KiB

New PWA regression coverage explicitly verifies:

- separate `Зберегти зміни` and `Підтвердити бронювання` actions;
- confirmation is disabled before the 200 UAH checkbox;
- conditions/prepayment blocks keep valid spacing;
- the three-button footer clears the iPhone Home Indicator and has no horizontal overflow.

Full localhost HTTP E2E is not counted as green in this environment because Chromium policy blocks `127.0.0.1` before product scenarios. GitHub Actions remains the authoritative HTTP/E2E/deploy gate after upload.

## Backend

Production admin backend remains unchanged by v3.0.38. The release continues to use the existing `vacleaner-admin-bookings-v3` API and reservation authority.
