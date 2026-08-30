# Deploy — VAcleaner v4.2.34

## Scope

PWA edge-to-edge shell, mobile settings time-slot geometry, referral confirmation/journal repair.

## Preconditions

1. Work only from `qa/v4.2.34-pwa-edge-to-edge-shell` (or equivalent QA branch). Do not test on `main`.
2. `package.json`, `release.json` and `docs/VAcleaner-SYSTEM-SPEC.md` must all be v4.2.34 / build 4234.
3. Canonical static + browser + PWA + responsive + visual + regression gates must be GREEN.

## Supabase

Migration: `20260830164500_vacleaner_referral_phone_check_v4234.sql`.

Production project `yweluzclearwrazdkahu` already received this idempotent repair during root-cause diagnosis on 2026-08-30. Before deploy, verify the constraint definition is:

`CHECK (customer_phone ~ '^[+]380[0-9]{9}$')`

If `vacleaner-admin-bookings-v4/index.ts` changed retry ordering, deploy the reviewed v4 function source only after QA GREEN. Keep the function's existing auth/deployment contract; do not change unrelated functions.

## GitHub / Pages

1. Squash QA work to one release commit.
2. Merge only when GitHub Actions is fully GREEN.
3. Pages deploy remains `main`-only.
4. After deploy, smoke-test installed PWA on iPhone at 430/390/320-equivalent widths:
   - initial content starts below search;
   - scrolled content is visible behind Liquid Glass search;
   - content/background continues behind floating bottom nav;
   - last CTA remains fully reachable above nav;
   - Settings `З / До` controls are equal width;
   - referral confirm ends in `✓ Надіслано` without service error.
