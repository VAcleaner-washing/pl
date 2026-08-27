# VAcleaner v4.1.49.3 — CI MOBILE HERO QA HOTFIX

## Why this hotfix exists

GitHub Actions run `33003049047` proved that v4.1.49.2 fixed the promo-disclosure regression: the E2E suite now passes the Smart Entry, delivery, Stories, extras, contacts and promo flow. The only remaining browser failure was `Mobile home hero copy is compact`.

That assertion still used the pre-v4.1.47 `700px / 85vh` height budget even though v4.1.47 intentionally added the visible Local SEO intent line above the existing creative kicker. The GitHub evidence screenshot shows the home hero itself is healthy; all other public mobile, growth and overflow checks pass.

## Changed

- Updated the mobile home E2E compactness budget to `min(760px, 90vh)` so it accounts for the intentional Local SEO line without allowing the hero to grow unchecked.
- Added a conversion-critical guard that the primary home CTA must still end inside the first mobile viewport.
- Extended the v4.1.49 performance/CI regression test so the old `700px / 85vh` assertion cannot silently return.
- Bumped release metadata to `4.1.49.3 / 41493`.

## Not changed

No public-site runtime layout, booking logic, pricing, delivery rules, Supabase functions, RETURN promo, Campaigns/SMS, admin workflows, PWA runtime, analytics instrumentation or SEO content was changed. This release only aligns the browser QA contract with the already-approved Local SEO hero structure while keeping a hard compactness and first-screen CTA guard.
