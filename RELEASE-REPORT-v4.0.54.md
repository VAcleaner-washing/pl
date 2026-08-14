# VAcleaner v4.0.54 — IOS SLOT PICKER VISUAL FIX

Date: 2026-08-14
Build: 4054

## Changed

- Fixed the mobile/iPhone visual bug where the native iOS `<select>` picker opened on top of the custom `Ранок / Вечір` slot cards.
- Kept the native select in the DOM only as React/form state, but removed it from rendering/hit-testing with `display:none` after enhancement.
- Custom slot buttons now explicitly suppress the wrapping `<label>` default activation before updating the hidden select state.
- Custom date trigger now suppresses wrapping-label native activation as the same defensive pattern.
- Rental duration and pricing logic were not changed; morning/evening may still legitimately change the calculated rental amount when the charged duration changes.
- Added static regression checks so future releases cannot restore an interactive native select behind the custom slot UI.
- Preserved Google Search Console verification file at site root: `google23d85db681a5b7ee.html`.

## QA

- `node --check assets/public-experience.js`: PASS
- public visual contract: 185 PASS / 0 FAIL after double stamp
- `npm run check`: 318 PASS after double stamp
- release stamp executed twice to verify GitHub Actions idempotency
- PWA visual QA: 639 PASS / 0 FAIL
- deposit/slot policy: 46 PASS
- stabilization: 171 PASS
- booking CTA: 14 PASS
- process metadata: 29 PASS
- issue workflow: 12 PASS
- finance: PASS
- static copy integrity: PASS
- package language: PASS
- public SEO: PASS
- post-stamp public visual/static QA: PASS

## Browser QA limitation

The real symptom is Safari/iOS-specific native form-control UI. This environment cannot reproduce an iPhone Safari picker. The fix removes the native slot select from rendered hit-testing entirely and prevents label default activation; final visual confirmation remains the real iPhone after deploy.

## Production status

This is a local release package. Production is not considered updated until GitHub Actions build/deploy succeeds and production `release.json` reports `4.0.54`.
