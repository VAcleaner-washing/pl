# VAcleaner v3.0.35 — CAMPAIGNS + PWA STABILITY

Release date: 2026-08-07  
Build: 3035

## Scope

This release continues directly from v3.0.34 work and does not rebuild the project.

### Campaigns
- Campaign management is now a dedicated `Кампанії` admin view instead of living inside `Клієнти`.
- Desktop: dedicated sidebar item.
- PWA/mobile: dedicated item inside `Ще`.
- Client view now contains only customer registry/segments.
- Campaign lifecycle: Active / Paused / Archived.
- Unused campaigns can be deleted after confirmation.
- Campaigns with redemption history cannot be deleted and must be archived.
- Archive keeps campaign/redemption analytics but disables campaign promo codes.
- New production lifecycle endpoint: `vacleaner-campaigns-v1` v1, ACTIVE, JWT required.

### PWA stability
- Mobile app chrome is anchored to the layout viewport (`position:absolute` inside the locked app shell), not transient iOS visualViewport changes.
- Keyboard mode now requires an actually focused editable control before the shell may enter `keyboard-open` mode.
- This prevents the bottom navigation from lifting during data refresh/re-render when no keyboard is open.
- PWA regression QA now checks the bottom navigation remains at the physical bottom after resize/refresh events.

### Booking date picker
- Unified one-layer date control on desktop and PWA.
- The native date input is the only click/tap target and occupies the full visual field.
- The visible date/icon layer is noninteractive, preventing duplicate/overlapping browser date text.
- Desktop final QA directly checks the native date geometry at 1440/1280/1024.

### CI / public booking resilience
- Updated stale PWA visual QA to the v3.0.33 React-safe nearest-availability sibling (`.vx-nearest-availability-panel`).
- Public booking 409/unavailable behavior remains React-safe and stays on-page.

## Production backend
- `vacleaner-booking-v5` v7 ACTIVE, JWT=false (unchanged public endpoint posture).
- `vacleaner-admin-bookings-v3` v13 ACTIVE, JWT=true (unchanged).
- `vacleaner-admin-data-v1` v4 ACTIVE, JWT=true (unchanged).
- `vacleaner-campaigns-v1` v1 ACTIVE, JWT=true (new; archive/delete lifecycle only).
- No VA HOME schema, tables, functions or policies were changed.

## Verification
- Static/backend release gate: 423 checks PASS.
- Rental/deposit/slot policy: 46 PASS.
- Stabilization architecture: 117 PASS.
- Finance: 19 PASS.
- Session: 4 PASS.
- UX: 17 PASS.
- PWA static: 50 PASS.
- Retention/campaign rules: 15 PASS.
- CSS architecture: PASS, admin CSS has 1 `!important` declaration.
- Public booking resilience: PASS (mutation plateau 19→19; React-owned availability card untouched; unavailable 409 stays on page).
- Installed PWA/browser visual QA: 451 PASS / 0 FAIL.
- Desktop density QA: 60 PASS / 0 FAIL.
- Final desktop visual audit: 223 PASS / 0 FAIL.
- Pages build: 193 files / 4966 KiB.

## Local E2E limitation
`npm run test:e2e` cannot start product scenarios in this environment because Chromium navigation to `http://127.0.0.1:4173/bronuvannia/` is blocked by the environment with `ERR_BLOCKED_BY_ADMINISTRATOR`. This is not counted as PASS. GitHub Actions remains the authoritative HTTP/E2E gate after upload.

## Telegram delivery
Automatic RETURN Telegram delivery is intentionally not enabled in this release. Reliable proactive Telegram delivery requires a VAcleaner bot, a stored Telegram `chat_id` linked to the customer, and explicit opt-in/marketing-consent state. The dedicated campaign service introduced here is the intended boundary for that future delivery layer.
