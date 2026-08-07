# VAcleaner production inventory

This folder records the production dependencies verified for the current VAcleaner release line.

## Runtime graph

- Public site calls `vacleaner-booking-v5`.
- `vacleaner-booking-v5` is the active direct public availability/create entrypoint. It applies current catalog, slots, deposit, loyalty and promo rules and persists booking resources itself.
- Admin PWA calls `vacleaner-admin-bookings-v3` for authoritative booking/finance actions.
- `vacleaner-admin-data-v1` handles non-financial client data, production health and retention-campaign management.
- Notifications use `vacleaner-push`; public booking also sends new-booking Web Push after a successful create.
- Public/admin shared configuration uses `vacleaner-settings`.
- Legacy VAcleaner Edge Functions remain deployed until production-usage evidence proves they are safe to remove.

The manifest stores the exact active production versions and deployment hashes. Release 3.0.30 verifies `vacleaner-booking-v5` v7 and `vacleaner-admin-data-v1` v4. `vacleaner-admin-bookings-v3` remains v13 because the retention edit rule is enforced centrally by the database trigger rather than by replacing the financial booking Edge Function.

## Database access model

All twelve `vacleaner_*` tables have RLS enabled. `anon` and `authenticated` have no direct table grants. Every VAcleaner table has an explicit client-deny policy; Edge Functions validate their own request contract and use `service_role` for database work.

Release 3.0.30 adds isolated VAcleaner retention tables: `vacleaner_campaigns`, `vacleaner_promo_codes`, and `vacleaner_promo_redemptions`. Promo redemption is serialized by `vacleaner_redeem_promo`; ordinary booking edits are protected by `vacleaner_preserve_best_promo_discount_trg` so a better already-applied promo cannot disappear silently. Explicit manual manager discount remains an intentional override.

## Admin allowlist

The active Edge Functions read `public.admin_users`. `public.vacleaner_admin_users` is retained as a legacy mirror. It is intentionally not dropped because this Supabase project is shared; VA HOME objects are outside this VAcleaner release and are not modified.
