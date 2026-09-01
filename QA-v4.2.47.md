# VAcleaner v4.2.47 — QA / ACCEPTANCE

## Scope

CI and regression architecture only. No public/admin UX, pricing, delivery, deposit, availability, finance, RETURN/referral, Supabase schema or VA HOME behavior changes.

## Canonical gates

- `npm run qa:static` stamps source, runs current static/domain contracts once and creates `dist`.
- `npm run verify:artifact` proves source/artifact release coherence and validates the deploy tree without changing it.
- `npm run qa:browser` consumes an existing verified `dist`; it must never stamp or rebuild.
- GitHub `browser` downloads `github-pages/artifact.tar` uploaded by `validate`; `deploy` consumes that same artifact after Browser QA passes.

## Regression policy

- `config/qa-suites.json` is the canonical suite registry.
- `test:current-contracts` is the release-blocking current-state domain set.
- Historical `scripts/test-v*.mjs` remain available through `npm run qa:legacy`, but are not appended permanently to every future release gate.

## Required evidence

- Static summary with zero failures.
- Browser summary with zero failures.
- `verify:artifact` SHA-256 line for the tested deploy tree.
- No tracked/generated `dist`, QA summary, test-results, Playwright report or Python cache artifacts.

## Release evidence — 2026-09-01

- Static gate: **38/38 suites passed**; current-state contracts: **20/20 passed**.
- Browser gate: **33/33 suites passed**, including E2E **135/135**, PWA **912/912**, SMS **336/336** and desktop audit **411/411**.
- Exact deploy artifact: **236 files**, SHA-256 tree digest `7b1c704dcd222d1dce2c`, release `4.2.47/4247`.
- Release-blocking static suite count is down from 104 displayed suites to 38; the complete historical archive remains available on demand with `npm run qa:legacy`.
- Browser launchers use managed Playwright Chromium rather than an unconditional `/usr/bin/chromium` dependency.

## Security note

Admin MFA enforcement was inspected but deliberately not changed in this CI-hardening release. Migration `20260813083000_vacleaner_admin_mfa_guard.sql` added the guard and `20260813101500_vacleaner_remove_admin_mfa_guard.sql` removed it. Current Edge Functions still require a valid Supabase user and the admin allowlist, but do not require AAL2/MFA. Re-enabling MFA must be a separate, end-to-end security release.
