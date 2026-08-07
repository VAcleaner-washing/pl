# VAcleaner production inventory

This folder records the production dependencies verified for the current VAcleaner release line.

## Runtime graph

- Public site calls `vacleaner-booking-v5`.
- `vacleaner-booking-v5` delegates legacy creation/availability work to `vacleaner-booking-v4`.
- Admin PWA calls `vacleaner-admin-bookings-v3`.
- `vacleaner-admin-bookings-v3` delegates legacy actions to `vacleaner-admin-bookings-v2`.
- `vacleaner-admin-bookings-v2` delegates base actions to `vacleaner-admin-bookings`.
- Notifications use `vacleaner-push`.
- Public/admin shared configuration uses `vacleaner-settings`.
- Non-financial client/profile and operational-health reads use `vacleaner-admin-data-v1`.

The manifest stores the exact active production versions and deployment hashes. Release 3.0.29 verifies `vacleaner-booking-v5` v6 and `vacleaner-admin-data-v1` v3. The latter exposes authenticated runtime health for Web Push and the authoritative slot-reservation hard-block. Release 3.0.11 deployed `vacleaner-booking-v5` version 4 and `vacleaner-admin-bookings-v3` version 11. Both entrypoints now normalize selected extras from the current shared catalog, so new catalog items are not silently discarded by legacy dependencies. A release must not delete or rename a dependency until its caller is changed and tested.

## Database access model

All nine `vacleaner_*` tables have RLS enabled. `anon` and `authenticated` have no direct table grants. Edge Functions validate the request and use `service_role` for database access.

Migration `20260806193000_vacleaner_explicit_client_deny_policies.sql` added nine restrictive deny policies as defense in depth. It does not change service-role access. Migration `20260806194500_vacleaner_carp_deta_catalog.sql` synchronized Carp-Deta into the production catalog.

## Admin allowlist

The active Edge Functions read `public.admin_users`. `public.vacleaner_admin_users` contains the same current user but is treated as a legacy mirror. It is intentionally not dropped in this release because the Supabase project is shared with VA HOME.
