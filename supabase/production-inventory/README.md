# VAcleaner production inventory

This folder records the production dependencies verified for the current VAcleaner release line.

## Runtime graph

- Public booking calls `vacleaner-booking-v5` directly.
- Admin PWA calls `vacleaner-admin-bookings-v4` directly. v4 contains the booking/finance implementation itself; it does **not** proxy `vacleaner-admin-bookings-v3`.
- `vacleaner-admin-data-v1` handles non-financial client data, analytics, referral summary data and retention support.
- `vacleaner-campaigns-v1` may call `vacleaner-sms-v2` only for actual SMS delivery. This is an intentional service boundary, not an admin compatibility proxy.
- Notifications use `vacleaner-push`; admin create/issue/return actions notify only the other identified manager device.
- Public/admin shared configuration uses `vacleaner-settings`.
- Legacy booking/admin Edge Functions remain deployed only as rollback assets. Active frontend code must not reference them.

## Authentication resilience

Active manager-facing VAcleaner functions use custom authentication inside the function: bearer token -> `auth.getUser(token)` -> admin allowlist (`admin_users` or the retained `vacleaner_admin_users` mirror). Supabase gateway JWT verification is disabled for these active manager functions to avoid false 401 responses during gateway/JWT refresh incidents. This does **not** make the admin API public: missing/invalid tokens still return 401 and non-admin users return 403.

## Database access model

All VAcleaner tables use RLS. Browser access is denied by default except the deliberately public address-cache surface recorded in `database-security.json`. Edge Functions validate their own request contracts and use `service_role` for database work only after the relevant authentication checks.

## Legacy policy

`vacleaner-admin-bookings`, `-v2` and `-v3` plus old public booking versions are rollback-only. They are tracked in the inventory but excluded from `frontendEntrypoints` and the active dependency graph. A release test fails if an active frontend route points back to a legacy admin function or if an active admin function proxies another admin function.
