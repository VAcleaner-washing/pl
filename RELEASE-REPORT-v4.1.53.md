# VAcleaner v4.1.53 — Address provider repair

Released: 2026-08-27

## Fixed

- Restored address suggestions after Photon stopped accepting `lang=uk` and returned HTTP 400.
- Kept native Ukrainian OpenStreetMap names without forced transliteration.
- Confirmed live lookup for `Перспективна`, `Перспективна 2`, and `Європейська 146`.
- Restored address suggestions without changing the established delivery zones.
- Retained the manual 250/350 UAH fallback only for a real provider failure or unresolved address.

## Production verification

- `vacleaner-address-v1` v10: active.
- This package was superseded by v4.1.54, which explicitly restores the agreed 250 UAH local zone.

## QA

- 58/58 Node regression suites passed.
- 421 build checks passed.
- 402/402 public SEO checks passed.
- Build stamping is idempotent: 0 files changed on the second run.
