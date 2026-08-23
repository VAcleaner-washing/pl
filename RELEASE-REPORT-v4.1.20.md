# VAcleaner v4.1.20 / build 4120

## Scope
Structural cleanup of public deposit-group resolution and synchronization of the canonical `combo` product label.

## Root cause
Public deposit rendering still contained local hardcoded product-to-deposit-group mappings in `assets/public-booking-slots.js` and `assets/public-experience.js`, even though `config/vacleaner.json` already defines `depositGroup` per product and `VACLEANER_CORE.depositGroup()` is generated from that config. This created two sources of truth.

The central catalog also still used the retired `combo` label `Текстиль + кухня та ванна`, while the current client-facing title is `Дивани + кухня та ванна`.

## Changes
- Removed the duplicated hardcoded `twoUnits` product list from both public deposit renderers.
- Public deposit calculations now resolve the group through the config-backed `VACLEANER_CORE.depositGroup()` only.
- Updated `config/vacleaner.json` `combo.label` and `combo.shortLabel` to `Дивани + кухня та ванна`.
- Kept `Текстиль + кухня та ванна` only as a legacy alias for backward compatibility.
- Regenerated `assets/vacleaner-core.js` and local Supabase fallback config files from the central config.
- Cleaned `scripts/sync-static-copy.mjs` so legacy `Комбо` can no longer regenerate the retired combo title in HTML/RSC/hydrated output.
- Updated regression tests so they require config-driven deposit groups and explicitly reject the old hardcoded group list.

## Verified
- `npm run test:deposit-policy` — PASS, 62 assertions.
- `npm run test:package-language` — PASS.
- `npm run test:copy-integrity` — PASS.
- `npm run test:admin-labels` — PASS, 36 checks.
- `npm run test:delivery-settings` — PASS, 14 checks.
- `npm run test:public-visual-contract` — PASS, 206/206.
- `npm run test:booking-extras` — PASS, 11/11.
- `npm run test:booking-gifts` — PASS, 21/21.
- `npm run test:public-booking` — PASS.
- `npm run check` — PASS, 340/340 file checks.
- `npm run build` — PASS, Pages artifact prepared.

`npm run test:desktop-final` was also started as extra non-blocking coverage and produced many passing desktop checks, but the whole suite did not finish within the execution limit. It is not reported as PASS.

## Backend
No production Edge Function was redeployed for this release. The frontend now consumes the config-backed product group; generated local backend fallback configs were synchronized for the next backend deployment.
