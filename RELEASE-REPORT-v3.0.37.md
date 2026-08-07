# VAcleaner v3.0.37 — ADMIN ALIAS + TELEGRAM + PWA NAV + PUSH

Release date: 2026-08-07  
Build: 3037

## Scope

This release focuses on four operational fixes requested after v3.0.36:

1. A second manager login alias `annanevidoma` using the same existing VAcleaner password.
2. Telegram contact flow no longer puts the full rental message into the deep-link URL.
3. iPhone/PWA bottom navigation stability and a revised five-item mobile navigation layout.
4. Human-readable manager push notifications plus server-side pickup/return reminders.

No VA HOME tables, policies, functions or frontend files were changed by this release.

## Admin login

- `vacleaner` and `annanevidoma` both authenticate through the same existing Supabase Auth credential, so the requested password stays identical without copying or exposing it.
- The PWA remembers which alias was used and shows `Vadim` or `Anna` in the administrator profile accordingly.
- Because both aliases intentionally share one underlying Auth user, backend audit `actor_id` is the same. A separately attributable audit identity would require a separate Supabase Auth user/password flow later.

## Telegram

Previous flow encoded the entire confirmation message into a Telegram URL. Long URLs could fail before Telegram opened.

New flow:

- `Скопіювати текст` copies the complete rental message.
- `Написати в Telegram` opens only the client's Telegram chat by username or international phone-number deep link.
- No `t.me/share/url` fallback.
- No `?text=<large message>` parameter.
- Opening/copying does not falsely mark `Умови клієнту надіслано`; the manager confirms that state only after the message is actually sent.

## Mobile / PWA navigation

Primary five actions are now:

- Бронювання
- Календар
- Найближчі
- Аналітика
- Ще

`Техніка` moved into `Ще` together with Clients, Campaigns, Chemistry and Settings.

The mobile shell now uses one fixed physical-viewport `.app`; topbar, main content and bottom navigation are absolute children of that shell. `visualViewport` remains keyboard-scoped only. This avoids the bottom bar being independently re-positioned by transient iOS viewport changes during refresh/re-render.

## Push notifications

The old technical public-booking notification (`Нове бронювання VAcleaner · YYYY-MM-DD`) is suppressed by the new PWA service worker.

A production server runner `vacleaner-reminders-v1` provides human-readable notifications:

- `Нова заявка · <техніка>` — client, DD.MM time → DD.MM time, amount, confirmation required.
- `Видача через 1 год · <техніка>` — client, time, pickup/delivery and finance reminder.
- `Повернення сьогодні · <техніка>` — client, return time and final-settlement reminder.

All notifications deep-link to the exact booking.

Production reminder state is persisted server-side to prevent duplicate reminder delivery. The scheduled runner is active independently of whether the PWA is open.

## Production backend state changed during this release

- `vacleaner-reminders-v1`: v3 ACTIVE, custom cron authentication, `verify_jwt=false` by design.
- `vacleaner-booking-v5`: v9 ACTIVE, public endpoint, `verify_jwt=false`; restored safely and live availability verified with HTTP 200 after the deployment operation.
- Existing authoritative admin functions remain unchanged.
- Existing campaign lifecycle function remains unchanged.

## QA — final stamped build

- Static/backend file checks: 284 PASS
- Rental/deposit/slot policy: 46 PASS
- Finance: 19 PASS
- Stabilization contract: 122 PASS
- Session: 4 PASS
- UX: 17 PASS
- CSS architecture: PASS, admin CSS remains at 1 `!important`
- Operational health: PASS
- Retention/campaign rules: 15 PASS
- Production backend inventory: PASS
- Installed PWA/browser visual QA: 460/460 PASS
- Desktop density visual QA: 60/60 PASS
- Final desktop visual audit: 223/223 PASS
- Public booking resilience: PASS (`19 → 19` mutation plateau, unavailable 409 stays in-page)
- Pages build: 193 files / 4967 KiB

Full localhost E2E is **not** counted as green in this environment. Chromium is blocked before the first product scenario by:

`ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:4173/bronuvannia/`

GitHub Actions remains the authoritative HTTP/E2E/deploy gate after the ZIP is pushed.

## Security / privacy

- No customer import payloads or historical booking text are included.
- No Supabase service-role key, JWT, VAPID private key, Telegram bot token, cron secret or password is included.
- The second login alias does not duplicate or expose the existing password.
