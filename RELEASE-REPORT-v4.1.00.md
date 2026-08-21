# VAcleaner Release Report — v4.1.00 / build 4100

## Scope
SMS funnel reliability, phone-linked promo recovery and Journal UX.

## Changes
- Personal SMS promo can be discovered by customer phone after the phone is entered in booking, even when the customer opened the site manually rather than following the SMS link.
- SMS-link promo remains supported; a manually entered or link-supplied promo is never overwritten by phone discovery.
- Added public `vacleaner-phone-promo-v1`: rate-limited lookup, restricted to actually submitted/sent/delivered SMS recipients, active campaign/code and unused code.
- SMS Journal header control rebuilt: count badge is inside `Журнал`; Journal and close share one compact geometry.
- Mobile SMS header metadata consolidated into one compact row.
- Journal mobile rows use a cleaner hierarchy; visible drill-down action is `Кому`.
- Each dispatch can open its recipients: client name, phone, delivery status, promo code and promo link.
- Added authenticated `vacleaner-sms-audit-v1` for recipient audit only; send transport is unchanged.
- RETURN cooldown and direct `vacleaner-sms-v2` transport remain unchanged.

## Production backend
- `vacleaner-phone-promo-v1` — ACTIVE.
- `vacleaner-sms-audit-v1` — ACTIVE.
- No VA HOME table/function/policy/storage/auth changes.

## Final QA after build 4100 stamp
- `npm run check` — PASS, 330 file checks.
- `node scripts/test-retention.mjs` — PASS, 25 checks.
- `node scripts/test-sms-campaigns.mjs` — PASS, 82 assertions.
- `node scripts/test-pwa.mjs` — PASS, 82 assertions.
- `node scripts/test-final-desktop.mjs` — PASS.
- Campaigns/SMS browser QA: 320/390/430/768 — 165/165 PASS.
- Campaigns/SMS browser QA: 1024/1280 — 82/82 PASS.
- Campaigns/SMS browser QA: 1650×760/1920 — 84/84 PASS.

## Release hygiene
- Static frontend package only; no test screenshots/results, dist, __pycache__ or pyc files are included.
- One current release report.
