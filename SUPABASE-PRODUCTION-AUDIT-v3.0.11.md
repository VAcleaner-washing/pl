# Supabase production audit — VAcleaner v3.0.11

Captured: 2026-08-06 19:41 UTC  
Project: `yweluzclearwrazdkahu`

## Scope

The audit covered the VAcleaner Edge Function dependency graph, all `vacleaner_*` tables, direct grants, RLS policies, constraints, indexes, triggers, settings catalog and Supabase security/performance advisors.

## Production data-access result

Nine VAcleaner tables have RLS enabled. Browser roles `anon` and `authenticated` have no direct table grants. Normal data access goes through Edge Functions using `service_role` after the endpoint-specific validation.

Migration `20260806193000_vacleaner_explicit_client_deny_policies.sql` was applied. Each VAcleaner table now has the restrictive policy `VAcleaner deny direct client access` for `anon` and `authenticated`, with `USING (false)` and `WITH CHECK (false)`.

After the migration, Supabase Security Advisor no longer reports `rls_enabled_no_policy` for VAcleaner tables.

## Active entrypoints deployed

- `vacleaner-booking-v5` version 4, ACTIVE, JWT verification disabled because it is the public booking endpoint. Deployment SHA: `088faadd6e76a7125f42864168ea733c04e0eb9ebf913ed579b153953faae20a`.
- `vacleaner-admin-bookings-v3` version 11, ACTIVE, JWT verification enabled. Deployment SHA: `6b6fb3321f060933144a287fa15dcda304a1d780292c244161fba144817fefb3`.

Both current entrypoints now normalize selected extras against the current shared catalog. This prevents a new item such as Carp-Deta from being silently discarded by the legacy `booking-v4` or `admin-v2` dependency.

## Catalog result

Migration `20260806194500_vacleaner_carp_deta_catalog.sql` was applied. Production `vacleaner_settings.catalog` contains:

- label: `Плямовивідник Carp-Deta 30 мл`
- price: `100`

## Dependency graph

The current runtime still contains a controlled legacy chain:

- `vacleaner-booking-v5` → `vacleaner-booking-v4`
- `vacleaner-admin-bookings-v3` → `vacleaner-admin-bookings-v2` → `vacleaner-admin-bookings`

Versions and deployment hashes are recorded in `supabase/production-inventory/edge-functions.json`. No dependency was deleted or renamed in this release.

## Admin allowlist

Active VAcleaner Edge Functions validate against `public.admin_users`. `public.vacleaner_admin_users` currently contains the same single user ID and is retained as a legacy mirror. It was not dropped because the Supabase project is shared with VA HOME.

## Performance result

Supabase Performance Advisor did not report VAcleaner warnings. It reported two informational unused indexes:

- `vacleaner_push_subscriptions_user_idx`
- `vacleaner_customers_updated_idx`

They were retained because the project is new/small and the indexes support expected user-subscription and recent-customer queries. Removing an index solely because it has not yet accumulated usage would be premature.

## Shared-project findings not changed

The following warnings belong to the wider shared Supabase project and were deliberately not modified in this VAcleaner release:

- `pg_net` is installed in the `public` schema.
- `public.is_admin()` is a SECURITY DEFINER function executable by `authenticated`.
- `public.claim_customer_orders()` is a SECURITY DEFINER function executable by `authenticated`.
- leaked-password protection is disabled in Supabase Auth.
- performance findings on VA HOME/order/promo/wishlist tables.

Changing those objects without a separate VA HOME regression plan could affect the other production site.

## Production mutation boundaries

This release changed only:

1. explicit restrictive RLS policies for the nine VAcleaner tables;
2. Carp-Deta in the shared VAcleaner catalog setting;
3. new versions of the two current VAcleaner entrypoint Edge Functions.

No booking, customer, document, deposit, payment or inventory row was created, edited or deleted during the audit.
