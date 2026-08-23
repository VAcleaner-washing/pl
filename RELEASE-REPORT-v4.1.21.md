# VAcleaner v4.1.21 / build 4121

## Scope
PWA/admin session recovery hardening for the `Найближчі` screen and the rest of the authenticated admin shell.

## Root cause
Production logs at the time of the reported stuck skeleton showed a burst of HTTP 401 responses from authenticated VAcleaner admin Edge Functions. Auth logs then showed multiple refresh-token operations starting around the same recovery window.

The frontend loaded several authenticated resources concurrently. When the access token had expired, each failed request independently called `refresh()`. That allowed several refresh-token requests to race against each other. In an installed PWA this could leave the initial Promise chain waiting while `renderLoading()` remained on screen, producing an apparently endless skeleton.

Network requests also had no bounded timeout, so an interrupted mobile connection could keep the same loading state alive too long.

## Changes
- Added a single-flight `refreshPromise` so all parallel 401 responses share one token refresh.
- Added a bounded `requestWithTimeout()` wrapper for authenticated admin API calls and settings bootstrap.
- Added proactive JWT expiry detection: a token that expires within the next minute is refreshed before the initial parallel data load starts.
- Preserved normal re-login behavior when refresh genuinely fails with an authentication error.
- Added a dedicated browser regression that reproduces several parallel stale-token 401 responses and verifies one refresh, successful retries, persisted fresh session, rendered `Найближчі`, and no login bounce.
- Added `test:pwa-session` to package scripts.

## Production evidence
No backend code change was required. Production Edge Function logs showed the failing admin requests as 401 responses, while the settings endpoint remained healthy. Auth logs showed refresh activity around the same incident, confirming session recovery rather than server availability as the relevant path.

## Verified
- `npm run check` — PASS, 341/341 file checks.
- `node scripts/test-session.mjs` — PASS, 4 session scenarios + recovery guards.
- `npm run test:pwa-session` — PASS, 7/7 browser assertions.
- `npm run test:pwa-static` — PASS, 82 assertions.
- `node --check assets/admin-v250.js` — PASS.
- `npm run build` — PASS, Pages artifact prepared.

`npm run test:pwa` was also run as broad non-blocking coverage. It produced extensive PASS results across mobile 320/390/430, Mobile Safari tab, tablet, landscape, auth, expense and public-date scenarios, but the full suite exceeded the execution-time limit during later desktop coverage. It is therefore not reported as a complete PASS.

## Backend
No VAcleaner Edge Function was redeployed for this release. No VA HOME resource was changed.
