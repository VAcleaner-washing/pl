# VAcleaner · Native UI V2.6 QA

## Real iPhone visual corrections

V2.6 is a visual correction pass over V2.5 based on the screenshots where `Оновити`, `Ще` and RETURN SMS `Журнал` were still visibly wrong.

### Corrected
- Detail audit header is a deliberate two-column row.
- `Оновити` is a normal 44px control with stable width; it cannot float into the heading or clip at the right edge.
- Detail `•••  Ще` has a stable gap and 48px touch target.
- RETURN SMS campaign title and close action own the first row.
- `Журнал` owns a full separate row, including count badge, and no longer competes with the title or close button.
- SMS sender metadata starts below Journal; body starts below metadata.
- SMS history Back control is responsive.

## Browser QA
- Primary views at 320 / 390 / 430 px: **30 PASS / 0 FAIL** (no horizontal overflow across Upcoming, Bookings, Calendar, Equipment, Clients, Campaigns, Finances, Analytics, Chemistry, Settings).
- Deep mobile flows at 320 / 390 / 430 px: **93 PASS / 0 FAIL**.
- Real-screen geometry audit for Detail Update/More and RETURN SMS header: **30 PASS / 0 FAIL**.

## Canonical QA
- `npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**.
- `npm run verify:artifact` → PASS.
- V2.6 route/assets/SW/manifest are present in `dist`.

## Production isolation
SHA-256 identical to clean v4.2.47 baseline for 10/10 production invariants:
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

## Status
V2.6 remains a parallel RC route: `/admin/bronuvannia-native-v26/`.
