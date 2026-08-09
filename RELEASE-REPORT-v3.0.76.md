# VAcleaner v3.0.76 — UPCOMING CLIENT UX

## Base
- Source base: VAcleaner v3.0.75 with the isolated Liquid Glass V4 test overlay.
- Stable admin and Glass test share the same booking runtime.

## Changed
- `Найближчі`: customer name is informational only; it no longer opens the CRM client card.
- The whole upcoming card is no longer a hidden navigation target.
- Customer phone remains a direct `tel:` action.
- `Відкрити` is now the explicit path to booking details.
- Client-card navigation remains available from `Бронювання`, booking detail, and `Клієнти`.
- The same interaction model is applied to both `/admin/bronuvannia/` and `/admin/bronuvannia-glass/`.
- Liquid Glass V4 visual/status system is preserved.

## Why
`Найближчі` is an operational screen: time → equipment → customer → issue/return. Removing the extra CRM navigation target reduces accidental taps and makes the primary actions unambiguous.

## Version / cache
- Version: 3.0.76
- Build: 3076
- PWA cache: `vacleaner-manager-3076`.
- Shared admin CSS/JS and service-worker URLs are stamped to build 3076.

## QA
- PWA static contract: PASS — 71 assertions.
- PWA visual QA: PASS — 551 checks, including 320 / 390 / 430, Mobile Safari tab, tablet, landscape, auth, public booking and desktop.
- Liquid Glass V4 targeted QA: PASS on 320 / 390 / 430.
- Pages artifact build: PASS — 225 files / 8660 KiB.
- Verified: upcoming customer name does not navigate; phone remains callable; explicit `Відкрити` opens booking detail.
- Rental/deposit/slot policy: PASS — 46 assertions.
- Stabilization contract: PASS — 159 assertions.
- Retention/campaign rules: PASS — 18 checks.

## Production / Supabase
- Supabase was not changed.
- VA HOME was not touched.
- Production is not considered updated until `https://vacleaner.pp.ua/release.json` reports `3.0.76`.
- Real iPhone/PWA behavior should still be confirmed after deployment.
