# VAcleaner v4.0.63 — HOME PACKAGE & 30-SEC PICKER HYDRATION PARITY

Released: 2026-08-15
Build: 4063

## Fixes
- Home package cards now use the same client-facing titles in server HTML and hydrated React:
  - Глибоке очищення диванів і матраців
  - Генеральне прибирання
  - HOME RESET
- Home desktop and mobile navigation now use `Підбір за 30 сек` in both server HTML and hydrated React.
- Added cache-busting for the custom home React chunk and shared public header/footer chunk, in addition to the existing booking chunk versioning.
- Persisted the home copy corrections in `sync-static-copy.mjs` so repeated `npm run stamp` does not restore legacy labels.
- Added regression checks for the server/hydrated header label and home chunk cache version.

## Root cause
v4.0.62 had corrected server HTML in the final archive, but the custom home React chunk still contained the legacy `Підбір` label and historical Next chunk filenames were not versioned. Returning browsers could therefore hydrate with stale cached public components. Earlier working-state QA also exposed that package-language parity was not being verified at the correct final stage.

## QA
- `npm run stamp` twice: PASS
- `npm run test:package-language`: PASS
- `npm run check`: 319 file checks PASS
- `npm run test:public-visual-contract`: 191/191 PASS
- `npm run test:booking-cta`: 14/14 PASS
- `npm run test:stabilization`: 171 assertions PASS
- `npm run build`: PASS, Pages artifact 205 files
- Final dist verification: no legacy home H3 package titles; home desktop/mobile nav both `Підбір за 30 сек`; home and shared public chunks referenced with `?v=4063`.

## Scope
No booking prices, deposit rules, finance logic, admin workflow, Supabase schema/functions, or VA HOME resources were changed.
