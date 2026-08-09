# VAcleaner v3.0.80 — PUSH DEVICE CONTROL + FAVICON

Released: 2026-08-09
Build: 3079

## Changes
- Liquid Glass remains the primary admin UI at `/admin/bronuvannia/`; Classic remains reserve at `/admin/bronuvannia-classic/`.
- Push subscriptions now have a stable per-install `device_id` and the backend enforces a maximum of two active manager phones.
- Production duplicate push subscriptions were cleaned from 9 active rows to 2 newest iPhone registrations.
- `vacleaner-push` deployed to production as authenticated v2.
- Settings → Notifications now shows connected phones, current-device marker, last successful delivery, local phone name and a per-device test action.
- Current installed PWA automatically re-syncs its push subscription after login/load when notifications are enabled.
- Pickup reminder remains exactly 1 hour before pickup; return reminder remains on the return day; no 10-minute backup reminder was added.
- Browser favicon replaced with a 16px-first emerald `V` + gold spark icon. PWA/Apple home-screen app icon is intentionally unchanged.

## Production backend
- Supabase project: `yweluzclearwrazdkahu`.
- `vacleaner_push_subscriptions.device_id` added with active `(user_id, device_id)` uniqueness.
- Maximum two active subscriptions is enforced by `vacleaner-push` v2.
- Existing active subscriptions reduced to the two newest iPhone registrations; each phone will acquire a stable device id after opening v3.0.80.
- VA HOME tables/functions were not modified.

## QA
- `npm run check`: PASS — 287 file checks.
- `npm run check:backend`: PASS.
- Rental/deposit/slot policy: PASS — 46 assertions.
- Stabilization: PASS — 159 assertions.
- Retention/campaign rules: PASS — 18 checks.
- Glass V4 QA: PASS at 320/390/430.
- PWA visual QA: PASS — 551/551.
- Desktop density: PASS — 60/60 at 1024/1280/1440.
- Final desktop audit: PASS — 232/232 at 1024/1280/1440.
- `test:e2e` could not start in this execution environment because localhost navigation was blocked by the administrator (`ERR_BLOCKED_BY_ADMINISTRATOR`); this is an environment restriction, not an application assertion failure.

## After deployment
1. Open/update the installed VAcleaner PWA on both iPhones.
2. On each phone go to Settings → Notifications.
3. Name the phones (for example `Вадим` and `Анна`) and press Save.
4. Press `Надіслати тест` once on each phone; both should then be listed as active devices.


## Favicon update
- Replaced VAcleaner favicon with black/gold version optimized for browser tabs.
