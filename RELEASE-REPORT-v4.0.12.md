# VAcleaner v4.0.12 — CI BOOKING STEP CONTRACT FIX

Base: VAcleaner v4.0.11 — MOBILE CLIENT CARD DOCUMENT & HISTORY FIX.
Date: 2026-08-09.

## Fixed

- No production booking logic was reverted or loosened.
- Updated the stale Playwright smoke assertion in `scripts/e2e_smoke.py` that still expected an unfinished mobile booking wizard to jump from step 1 to step 2 by tapping the progress bar.
- The smoke test now matches the guarded booking contract introduced in v4.0.10: a future step cannot open until its prerequisites are complete.
- This aligns the browser smoke test with the already-current public visual contract and the dedicated booking step-order regression.

## Confirmed GitHub Actions cause

The failed v4.0.11 GitHub Actions run completed 81 browser checks successfully and failed only `Progress navigation switches mobile booking step`. The same run also passed the current static contract `mobile booking progress buttons switch only to unlocked steps`. Therefore the failure was an obsolete QA expectation, not a runtime regression.

## Local QA

- Build check: 293 file checks PASS.
- Pages artifact build: 213 files PASS.
- Deposit / rental / slots: 46 assertions PASS.
- Stabilization: 159 assertions PASS.
- Public visual contract: 144 PASS.
- Retention / campaigns: 18 PASS.
- CSS architecture: PASS.
- Public booking resilience: PASS.
- Smart Guide fit: 20/20 PASS.
- Mobile client card: 320 / 390 / 430 — 3/3 PASS.
- Finance: 23 scenarios PASS.
- Session: 4 scenarios PASS.
- Rental extension: 10 assertions PASS.
- Header parity: 51/51 PASS.
- PWA static: 71 assertions PASS.
- Dedicated booking step-order browser regression: PASS (`1 → 2 → 3 → 4`, no default pickup, future navigation locked).
- Full `test:e2e` cannot execute in this local sandbox because navigation to `127.0.0.1` is blocked by the environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). The stale assertion that failed on GitHub has been replaced with the inverse guarded-state assertion matching the observed v4.0.11 runtime and dedicated regression test.

## Production status

Local release only. Production is not considered updated until GitHub Pages deploy succeeds and `https://vacleaner.pp.ua/release.json` reports `4.0.12`.
