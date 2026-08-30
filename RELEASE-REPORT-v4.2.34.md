# VAcleaner v4.2.34 — PWA EDGE-TO-EDGE + REFERRAL CONFIRMATION + SLOT GEOMETRY

## Root causes

1. **PWA bottom:** v4.2.22 added a standalone override that deliberately changed `.main` from `bottom:0` to `bottom:calc(var(--mobile-nav-shell) + 8px)`. That cut the content surface off above the floating nav and exposed the dark root background below it.
2. **PWA top:** the mobile scroll owner began below the fixed topbar. v4.2.34 keeps the initial visual spacing via scrollable top padding while moving the scroll surface to `top:0`, so content passes behind the fixed search only after scrolling.
3. **Settings time slots:** a late `@media(max-width:520px)` four-column override beat the canonical two-column mobile rule. With the slot icon already hidden, the first `З` control could collapse to a narrow column.
4. **Referral confirm:** `vacleaner_referral_messages_phone_check` was created with a double-escaped regex in a standard PostgreSQL string. Valid `+380XXXXXXXXX` values were rejected. PostgreSQL logs confirmed the exact constraint failure at the time of the user's tap.

## Fixes

- Restored true edge-to-edge standalone `.main` behind floating top/bottom chrome while preserving safe-area and reachable CTA spacing.
- Repaired mobile Settings `З / До` grid to two equal columns.
- Applied production Supabase constraint repair using `^[+]380[0-9]{9}$`.
- Referral two-step confirmation now has explicit `□` pending-confirmation and `✓` confirmed states.
- Referral backend order is retry-safe: durable journal first; profile/reward state second; an existing recent journal record repairs state without creating a duplicate.

## Preserved

Booking statuses, pricing, delivery/fuel logic, PWA booking-card density, duplicate-booking protections, push dedupe, referral reward rules, promo/RETURN logic and VA HOME objects are outside the change scope.

## Production data repair

- Supabase production constraint `vacleaner_referral_messages_phone_check` was repaired to `^[+]380[0-9]{9}$`.
- The failed confirmation observed during diagnosis had already updated the customer-level sent state but had no durable journal row. Because the message was confirmed as actually sent, exactly one missing `program_invite` journal event was backfilled at its original timestamp/channel. No referral reward was created by this repair.
- Supabase advisors were re-run after the DDL change. They reported existing project-level security/performance notices, but no new referral-constraint issue caused by this migration.

## QA status

- Static aggregate: **92/92 PASS**.
- SYSTEM SPEC contract: **PASS** for v4.2.34 / build 4234.
- Build: **PASS**.
- Referral mobile QA: **5/5 PASS**.
- Referral modal visual QA: **7/7 PASS**.
- PWA canonical browser suite: **PASS** inside the browser aggregate.
- Dedicated PWA 320/390/430 run: **762/762 PASS**. This includes edge-to-edge shell, initial-below-search geometry, scroll-under-search, floating bottom navigation, reachable final content and equal Settings `З / До` controls.
- Canonical local Browser aggregate: **25/28 product suites PASS; 3 suites did not start** (`test:e2e`, `test:home-mobile-density`, `test:equipment-mobile-density`) because this container lacks Playwright-managed Chromium. A system Chromium fallback was tested without changing assertions, but the environment blocks `127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR`. These are environment launch failures, not product assertions.
- `qa-release-summary.json` intentionally records this local Browser aggregate as **NOT GREEN**. It must not be rewritten to a false success.

This remains a release candidate. Production frontend/Edge Function merge is allowed only after the canonical GitHub Actions run is fully GREEN. The GitHub integration available in this session returns HTTP 403 when creating the required QA branch, so no GitHub branch, merge or frontend deploy was performed.
