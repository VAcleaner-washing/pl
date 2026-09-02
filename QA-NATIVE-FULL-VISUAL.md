# Native FULL VISUAL QA · test-only PWA

Production route: `/admin/bronuvannia/` — unchanged.
Native test route: `/admin/bronuvannia-native-test/`.

## Deep pass additions
- Calendar: no duplicate technical ISO date.
- Issue / Finance: booking context remains readable on mobile.
- SMS: history, bulk select, step and back controls use 44+ px touch targets.
- Analytics: segmented/month/year controls use 44+ px touch targets.
- Key native helper copy is 10 px minimum.
- 320 px fallback included for issue/finance context.

## Verification
- Canonical static QA: 38/38 PASS · FULL QA GREEN.
- Current contracts: 20/20 PASS.
- CI pipeline contract: 18/18 PASS.
- Production PWA key-file SHA-256 comparison vs v4.2.47 baseline: 7/7 identical.

Browser QA remains the final release-blocking gate before replacing production UI; this archive keeps native UI parallel and does not replace production.
