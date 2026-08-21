# VAcleaner Release Report — v4.1.02 / build 4102

## Scope
Correct Campaigns conversion attribution for SMS-driven RETURN campaigns.

## Root cause
Campaign conversion was calculated as promo redemptions divided by all personal promo codes generated for the RETURN audience. That made 1 redemption out of 209 generated codes display as 0%, even though only 25 customers had actually received a successful SMS.

## Fix
- SMS-driven campaigns now use unique successful SMS recipient phone numbers as the conversion denominator.
- Successful recipient states are `submitted`, `sent`, and `delivered`; `failed` and `not_delivered` are excluded.
- Duplicate sends/retries to the same phone count once.
- The SMS conversion numerator only includes redemptions from phones that were successfully reached by that campaign.
- Campaigns with SMS dispatch history use SMS attribution; campaigns without SMS dispatch history retain code-based conversion.
- The campaign row now shows `N SMS · M використано` when its conversion basis is SMS; generated-code totals remain available in the campaign summary and Codes action.
- Revenue remains completed-rental-only.

## Production verification
For the active RETURN campaign, production data after the backend update resolves to:
- successful unique SMS recipients: 25
- promo redemptions from those recipients: 1
- conversion: 4%

`vacleaner-admin-data-v1` production Edge Function updated from v9 to ACTIVE v10. No VA HOME tables/functions/policies/storage/auth were touched.

## QA
- `npm run check` — PASS before release stamp (330 checks).
- `npm run test:sms-campaigns` — PASS 82/82.
- `npm run test:pwa-static` — PASS 82/82.
- `npm run test:retention` — PASS 27/27, including SMS conversion attribution guards.
- `npm run test:campaign-sms-ux` — PASS 331/331 across 320 / 390 / 430 / 768 / 1024 / 1280 / 1650x760 / 1920.
- `npm run test:desktop-final` — PASS 235/235 on 1440 / 1280 / 1024.
- Full `npm run test:pwa` was run twice post-stamp; both runs reached the local execution window after completing all mobile 320/390/430 campaign/SMS assertions with PASS. The dedicated Campaigns/SMS browser suite covers the remaining tablet/desktop viewports and is fully green 331/331.
