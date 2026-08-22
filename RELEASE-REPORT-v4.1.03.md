# VAcleaner Release Report — v4.1.03 / build 4103

## Scope
Correct the Smart Guide and public product copy for VA SPOT FIX / VA STAIN OX without changing the quiz structure or product pricing.

## Root cause
The stain-care copy had drifted across several independent surfaces. VA STAIN OX was incorrectly described in the Smart Guide as a “Кислотний плямовивідник pH 3,5”, generic “соки” blurred natural vs synthetic dyes, and the SPOT FIX instruction simultaneously told a customer to rub and then not rub. A legacy package-language test also required the incorrect pH wording, so a correct content fix would have failed CI and encouraged a regression.

## Fix
- VA STAIN OX is now positioned as an oxidizing spotter for persistent organic/natural-dye stains.
- Generic juice wording is narrowed to natural fruit juice / natural fruit juices in the Smart Guide, recommendation copy, public catalog and stain-care cards.
- Removed all customer-facing `pH 3,5` / acid-spotter wording for VA STAIN OX.
- STAIN OX instructions keep the compatibility test, up-to-15-minute dwell, no-dry rule, cold-water rinse and Puzzi extraction.
- VA SPOT FIX now uses one consistent workflow: small amount → gentle work with a soft brush without aggressive rubbing → blot from edge to center → rinse/extract with Puzzi.
- Canonical `config/vacleaner.json`, generated Edge fallbacks, public booking catalog, hydrated/static booking copy and the Smart Guide are aligned.
- `sync-static-copy.mjs` was updated so an old hydrated/static booking description cannot be restored on the next stamp.
- Regression tests now reject the old acid/pH copy rather than requiring it.

## Production settings
Only `public.vacleaner_settings` key `catalog` was updated, and only these two nested descriptions:
- `extras.spot_lifter.shortDescription`
- `extras.stain_exit.shortDescription`

No VA HOME tables, functions, policies, storage or auth were touched. No Edge Function was redeployed for this release.

## QA
- `npm run check` — PASS, 330 file checks.
- `npm run test:smart-guide-logic` — PASS 17/17.
- `npm run test:package-language` — PASS.
- `npm run test:smart-guide-fit` — PASS 32/32.
- `npm run test:booking-extras` — PASS 11/11.
- `npm run test:public-booking` — PASS.
- `npm run test:public-visual-contract` — PASS 191/191.
- Dedicated browser probe verified the color-stain quiz result on 320 / 390 / 430 / 768 / 1024 / 1280 / 1650x760 / 1920 with the corrected STAIN OX scope and no horizontal overflow.
- Real-page DOM probe for `/rishennia/textile/` verified the stain-care block on the same viewport set with no horizontal overflow. The earlier overflow signal from a minimal synthetic DOM was confirmed to be a harness false positive, so no CSS was changed.
- Static/hydrated runtime scan confirms the old `pH 3,5`, acid-spotter wording, generic old juice copy and contradictory SPOT FIX rubbing instruction are absent from shipped public assets.
