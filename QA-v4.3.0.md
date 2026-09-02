# VAcleaner v4.3.0 — QA status

## Release identity
- version: 4.3.0
- build: 4300
- canonical admin/PWA: `/admin/bronuvannia/`
- Native V1–V2.8 parallel routes are retired from this release tree.

## Static / build gate
- `npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**
- current contracts → **20 / 20 PASS**
- `npm run verify:artifact` → **PASS** · release `4.3.0 / 4300`

## Focused v4.3 mobile visual / interaction QA
320 / 390 / 430 px:
- Bookings primary status row has no right clipping or broken multi-line status words.
- Full 8-status booking filter opens through the header filter action sheet.
- Upcoming filter action sheet exposes all three scopes and changes the canonical scope control.
- Header bell opens pending/new bookings when a pending count exists.
- Finance and Analytics five-period controls stay inside the viewport in one compact row on current iPhone widths.
- No horizontal document overflow in focused production checks.
- `V4.3 CONTROL QA: 7/7 PASS`.

## Canonical Browser suite note
The full canonical Browser suite was started twice. Completed suites emitted PASS results with no observed FAIL, but the complete long run exceeded the local execution window before the final aggregate result. GitHub Actions Browser gate therefore remains the final production deployment verification gate.

## R2 screenshot correction
- Finance/Analytics five-period selector is a single 5-segment rail (not 3+2 cards).
- Bookings shows four primary statuses in one segmented rail; all 8 remain available from the working filter sheet.
- 320 / 390 / 430 px screenshot geometry rechecked after this correction.
- R2.1 booking primary filter labels keep full width with corner count badges; 4 primary filters remain one row at 320/390/430 px.
