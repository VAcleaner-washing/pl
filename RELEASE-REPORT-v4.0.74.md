# VAcleaner v4.0.74 — SMS AUDIENCE RENTAL SORTING

## Changed
- SMS recipient rows now show each customer's completed rental count with Ukrainian pluralization: `1 оренда`, `2 оренди`, `5 оренд`.
- Added recipient sorting inside the SMS audience: `Найдавніша оренда`, `Найбільше оренд`, `Найменше оренд`.
- Sorting is local in the admin UI and uses the existing `completedOrders` field already returned by `vacleaner-campaigns-v1`; no Supabase/backend changes are required.
- Current checkbox selections are preserved when the recipient list is re-sorted.
- Added responsive layout for the sorting control on desktop and narrow PWA widths.

## Backend
- No database migration.
- No Edge Function deploy.
- No SMS sent during QA.

## QA
- check: 333/333 PASS
- SMS regression: 45/45 PASS
- PWA static: 82/82 PASS
- public booking resilience: PASS
- PWA visual: 699/699 PASS, including desktop and 320/390/430 px rental-count sorting checks
- build: PASS
