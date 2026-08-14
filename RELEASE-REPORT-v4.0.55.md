# VAcleaner v4.0.55 — E2E SLOT CONTROL PARITY FIX

Date: 2026-08-14
Build: 4055

## Changed

- Kept the v4.0.54 iOS visual fix unchanged: the native booking slot `<select>` remains hidden after enhancement so Safari cannot open its grey native picker over the custom `Ранок / Вечір` cards.
- Fixed the GitHub Actions browser test that still called Playwright `select_option()` on that now-hidden native select.
- E2E now drives the same customer-visible `.vx-slot-option` buttons used in production and only asserts the hidden select value as internal form/React state.
- Updated both desktop rental/deposit scenarios and mobile booking-step scenarios to use the visible slot cards.
- Added a static CI guard: `npm run check` now fails if `scripts/e2e_smoke.py` reintroduces `.select_option()` against hidden booking controls.
- Rental duration, weekday/weekend pricing, deposit rules and booking business logic were not changed.
- Preserved Google Search Console verification file at site root: `google23d85db681a5b7ee.html`.

## Root cause of failed v4.0.54 GitHub Actions

The production UI intentionally made `.booking-date-grid select.vx-native-control` non-visible. The old E2E still executed `locator.select_option(...)`, and Playwright correctly waited for a visible/enabled element until the 30-second timeout. This was a stale QA interaction contract, not a reason to restore the native iOS picker.

## QA

- `python -m py_compile scripts/e2e_smoke.py`: PASS
- release stamp executed twice: PASS
- `npm run check`: 318 PASS after each stamp
- Pages artifact build: PASS (204 files)
- public visual contract: 185 PASS / 0 FAIL
- PWA visual QA: 639 PASS / 0 FAIL
- deposit/slot policy: 46 PASS
- stabilization: 171 PASS
- booking CTA: 14 PASS
- process metadata: 29 PASS
- issue workflow: 12 PASS
- package language: PASS
- static copy integrity: PASS
- public booking resilience: PASS
- isolated Chromium regression: visible custom slot button successfully changes the hidden native select state while the select stays non-visible

## Browser QA limitation

The full local `npm run test:e2e` cannot navigate to the temporary localhost server in this execution environment because Chromium returns `ERR_BLOCKED_BY_ADMINISTRATOR` for `127.0.0.1`. The exact v4.0.54 GitHub failure path was nevertheless removed from the test source and verified with an isolated Chromium control test. GitHub Actions remains the final full browser-run confirmation.

## Production status

This is a local release package. Production is not considered updated until GitHub Actions build/deploy succeeds and production `release.json` reports `4.0.55`.
