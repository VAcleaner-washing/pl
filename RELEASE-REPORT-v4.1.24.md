# VAcleaner v4.1.24 — minimal admin auth hotfix

## Base
- Exact functional base: VAcleaner v4.1.19.
- v4.1.20 was compared file-by-file: admin runtime, admin service worker and admin HTML are functionally identical to v4.1.19 after build/version normalization.
- No v4.1.21/v4.1.22 timeout, resume, recovery or `bookingsLoaded` logic is included.

## Root cause
The stable admin runtime already had a latent refresh-token race:
- the initial admin load starts several protected requests in parallel;
- when the access token expires, every 401 independently called `refresh()`;
- Supabase rotates refresh tokens, so concurrent refresh requests can supersede/revoke each other's token chain;
- production auth logs showed multiple `token_refreshed` plus `token_revoked` events in the same second while admin edge functions returned 401.

## Fix
- Added a single in-flight `refreshPromise` around the existing refresh function.
- Parallel 401 responses now await the same refresh request.
- Existing data loading, `Promise.all`, live sync, render lifecycle, service worker behavior and error handling remain unchanged from v4.1.19.

## Verification
- Normalized runtime diff against v4.1.19: only `assets/admin-v250.js` differs functionally (plus release/package metadata and the new regression test).
- `npm run check`: 341/341 file checks passed.
- Session tests: 4 scenarios passed.
- New auth single-flight regression: 9 assertions passed.
- PWA static: 82/82 assertions passed.
- Desktop final QA: 319/319 passed at 1650 / 1440 / 1280 / 1024.
- Build: passed, 205 files.
- Full PWA visual suite was also started and passed mobile 320/390/430, Safari-tab, tablet, landscape, auth and public-date sections shown before the execution time limit; no full-suite PASS is claimed because the process was stopped by the environment timeout.
