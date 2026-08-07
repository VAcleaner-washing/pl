# VAcleaner v3.0.26 — PWA VIEWPORT + TELEGRAM + RETURNED SORT REPAIR

Release date: 2026-08-07  
Build: 3026  
Base: VAcleaner v3.0.25 — CLIENTS + HISTORY + 320PX ANALYTICS

## Scope

This release is a focused admin/PWA regression repair based on production screenshots. It does not change rental pricing, deposit policy, settlement math, production schema, inventory capacity, authentication rules, or VA HOME.

## Fixed

### 1. Admin scroll starts at the correct top
- Browser scroll restoration is disabled for the admin shell.
- View changes reset the sole `.main` scroll owner synchronously and across animation frames.
- Booking-filter changes and contextual search resets return the list to the top.
- New/edit/process/issue/complete/finance/client modals explicitly reset their internal scroll owners before focus is applied.
- Mobile booking step changes reset their own form scroller and never inherit the previous step position.
- Closing a layer restores focus with `preventScroll` so the browser cannot move the underlying page.

### 2. Returned bookings are ordered by date
- The `completed` filter has its own explicit sort.
- Returned bookings are ordered by `end_at` / return date descending: newest return first.
- Historical returned records participate in the same sort.

### 3. Telegram 400 Bad Request repaired
- Removed the invalid fallback `https://t.me/share/url?url=&text=...`.
- When a customer has no Telegram username but has a valid Ukrainian phone, the action uses `https://t.me/+380...?text=...` and opens the customer chat with the prepared draft.
- Generic share fallback now always supplies a non-empty URL.

### 4. Deposit / due controls on mobile booking cards
- Mobile finance summary uses a stable two-column grid instead of free-flowing pills.
- Due/refund and deposit state are rectangular controls with consistent minimum height and bounded width.
- On very narrow screens (<=360px) the two controls stack cleanly.
- Controls cannot overlap or escape the finance card.

### 5. Process modal spacing
- The prepayment block and “Умови клієнту надіслано” block now keep an explicit vertical gap.
- Process sections use a consistent mobile gap and action height.
- The process modal always opens at its own top.

### 6. iPhone/PWA physical viewport bottom
- Removed the conflicting `position:fixed; inset:0` + `height:100dvh` constraint from the mobile app shell.
- Shell, fullscreen modals, detail and auth layers now fill the containing physical viewport through insets.
- `visualViewport` sizing remains active only while the software keyboard is open.
- Bottom navigation remains pinned to the physical viewport bottom and respects the Home Indicator safe area.

## Regression coverage added

PWA browser QA now explicitly checks on 320px, 390px and 430px:
- app shell reaches the physical viewport bottom;
- every admin view opens at scrollTop 0;
- returned filter resets scrollTop;
- returned bookings are newest-first by return/end date;
- due/deposit controls stay contained and never overlap;
- new-booking modal opens at its own top;
- process modal opens at its own top;
- Telegram fallback is a phone deep-link with draft and never the broken empty share URL;
- prepayment and confirmation switches retain a visible gap.

Static gates were also updated so a future `100dvh` app-shell regression or broken Telegram fallback fails CI.

## Verification

Passed locally:
- build/static: 252 file checks
- rental/deposit/slot policy: 46/46
- finance: 19/19
- stabilization: 82/82
- session: 4/4
- UX: 17/17
- PWA static: 43/43
- installed-PWA/browser visual QA: 353/353
- desktop density QA: 60/60
- final desktop visual QA: 205/205
- production backend inventory: PASS
- Pages artifact: 191 files / 4923 KiB

Local `npm run test:e2e` is not counted as a product failure because this execution environment blocks navigation to `http://127.0.0.1:4173` with `ERR_BLOCKED_BY_ADMINISTRATOR`. GitHub Actions remains the authoritative HTTP E2E gate for the release.

## Backend / data

No new production data migration is required by v3.0.26. The production customer/history repair and `vacleaner-booking-v5` v6 introduced with the preceding v3.0.25 work remain unchanged.
