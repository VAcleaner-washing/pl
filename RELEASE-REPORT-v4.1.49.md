# VAcleaner v4.1.49 — PERFORMANCE + CI STABILITY

Release date: 2026-08-26
Build: 4149

## What changed

- Fixed the stale browser smoke test that clicked a hidden booking product after Smart Entry was introduced.
- Generic booking E2E now selects the `sofa` task first and clicks only a visible product recommendation.
- Updated the deposit browser assertion to the current final-settlement wording instead of an obsolete exact sentence.
- Split GitHub Pages CI into `validate`, `browser`, and `deploy` gates.
- Browser suites run independently with `continue-on-error` only for collection; a final aggregate gate fails the job if any suite failed. This prevents one browser test from hiding/skipping every later QA suite.
- Deploy now requires both the static/build gate and the aggregate browser gate.
- Added Playwright browser cache in Actions and kept the dependency pinned.
- Added v4.1.48 content static + visual regressions to GitHub CI.
- Added v4.1.49 performance/CI regression contract and raw-JS budgets.

## Public performance changes

The full ~52 KiB Smart Guide engine is no longer eagerly loaded on the home page or generic booking page.

- Home loads `home-smart-guide-v4149.js` (4.3 KiB). The complete quiz engine is lazy-loaded only when the user opens Smart Guide; `/pidbir/` still loads the complete engine directly.
- Booking loads `booking-entry-v4149.js` (4.8 KiB) for the booking helper, Smart Guide/extras presets, promo preset, and preset banner without loading the full quiz engine.
- Smart Guide exposes an explicit lazy-open bridge for progressive enhancement.
- Home Smart Guide hydration repair observer is bounded and disconnects after the initial hydration window.

Raw local script payload (uncompressed source bytes referenced by HTML):

- Home: ~781 KiB → ~734 KiB (about 47 KiB less, ~6%).
- Booking: ~1119 KiB → ~1073 KiB (about 46 KiB less, ~4%).
- `/pidbir/`: ~76 KiB and retains the full interactive quiz.

These are conservative raw-file figures, not network-compressed transfer sizes.

## CI contract

GitHub Actions now follows:

`Static/Core validation → Pages build artifact → full browser aggregate QA → deploy`

A real browser regression still blocks deployment. `continue-on-error` is used only on individual browser suites so every suite gets a result; the final aggregate step returns failure if any suite failed.

## Verification

- `npm run check`: 407 file checks passed.
- `npm run test:v4.1.49-performance-ci`: 17/17 passed.
- `npm run test:v4.1.48-content-local-demand`: 94/94 passed.
- v4.1.47 SEO + Local SEO regression: 209/209 passed.
- v4.1.47.2 delivery distance: 18/18 passed.
- v4.1.46 funnel analytics: 15/15 passed.
- v4.1.45 trust rules: 16/16 passed.
- v4.1.44 booking hardening: passed.
- Static policy / retention / finance / SMS / PWA / admin regressions passed in the v4.1.49 static suite.
- v4.1.48 in-memory browser visual QA: 90/90 passed at 390px and 1280px.
- Pages artifact: 231 files, 6972 KiB.
- Workflow YAML parsed successfully with jobs `validate`, `browser`, `deploy`.

Local URL-based `test:e2e` cannot execute in this ChatGPT container because Chromium navigation to localhost is blocked by environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`) before the page opens. The stale selector/assertion that caused the previous GitHub Actions failure has been corrected in source, but final hosted GitHub browser confirmation requires the commit to run in GitHub Actions.

## Not changed

No changes to Supabase production functions, booking availability/reservation authority, RETURN promo rules, Campaigns/SMS transport, rental prices, deposits, delivery-distance business rules, statuses, or admin finance formulas.
