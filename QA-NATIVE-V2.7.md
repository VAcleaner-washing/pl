# VAcleaner · Native UI V2.7 Full Re-audit QA

Route: `/admin/bronuvannia-native-v27/`.

## Re-audit focus
- Booking status filters fit the viewport and do not overlap cards.
- `Найближчі` keeps the operational rail: direction arrow, time, issue/return label and relative day badge.
- Upcoming CTA labels remain fully visible at 320 / 390 / 430 px.
- Mobile Issue / Finance / Complete footers stay inside the viewport.
- Analytics / Finance period controls use balanced responsive geometry.
- Delivery fuel analytics no longer uses redundant nested shells.
- Update prompt is suppressed during detail/modal/keyboard workflows.
- V2.7 service worker caches the complete V2.7 visual layer and keeps offline/deep-link routing inside the V2.7 scope.

## Browser QA
- Primary surfaces, 320 / 390 / 430 px: **30 PASS / 0 FAIL**.
- Deep workflows, 320 / 390 / 430 px: **93 PASS / 0 FAIL**.
- Full parity/status run reached all six booking statuses, list/detail actions, `Ще`, audit history, Finance category filter, More online/offline state and completed-card truth with **no FAIL before the local execution window ended**. Remaining geometry is covered by the split primary/deep suites above.

## Canonical QA
- `npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**.
- `npm run verify:artifact` → **PASS**; deploy artifact release `4.2.47 / 4247` verified.

## Production isolation
Compared with clean `VAcleaner-v4.2.47-CI-PIPELINE-HARDENING` baseline, SHA-256 is identical for **10 / 10** production invariants:
- `admin/bronuvannia/index.html`
- `assets/admin-v250.js`
- `assets/admin-v250.css`
- `admin/manifest.webmanifest`
- `admin/sw.js`
- `assets/address-autocomplete.js`
- `assets/address-autocomplete.css`
- `assets/vacleaner-core.js`
- `release.json`
- `package.json`

V2.7 remains a parallel RC. Production replacement still requires the repository GitHub Pages Browser gate on the QA branch.
