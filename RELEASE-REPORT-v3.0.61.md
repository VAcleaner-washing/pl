# VAcleaner v3.0.61 — PWA QA START VIEW SYNC

## Scope
CI/QA synchronization release on top of v3.0.60. No product business logic, Supabase, public site, pricing, deposit, PWA fixed-nav architecture, or mobile navigation behavior changed.

## Root cause
- v3.0.60 intentionally changed the mobile/PWA default view from `Бронювання` to `Найближчі`.
- `scripts/pwa_visual_qa.py` still waited for `.booking-list` immediately after authenticated render at every viewport width.
- On mobile/PWA widths the correct initial DOM is now `.upcoming-scope`, so GitHub Actions timed out after 30 seconds even though the product behavior matched the new requirement.

## Changes
- PWA visual QA now waits for `.upcoming-scope` at widths `<=900px`.
- Desktop PWA QA continues to wait for `.booking-list` because desktop still starts on `Бронювання`.
- Added a static build guard that rejects future PWA QA if this mobile/desktop start-view readiness contract is lost.

## Product behavior
- Mobile/PWA order remains `Найближчі | Бронювання | + Нове | Календар | Ще`.
- Mobile/PWA still starts on `Найближчі`.
- Desktop still starts on `Бронювання`.
- No application runtime logic was changed for this fix.

## Archive hygiene
- Only this current Release Report is included at root.
- Generated `dist/`, browser artifacts and Python cache are excluded from the source ZIP.

## Acceptance
- `npm run test:pwa` must no longer time out waiting for `.booking-list` on mobile.
- Mobile PWA visual QA must render and validate `Найближчі` first.
- Desktop visual QA must retain the existing `Бронювання` default.
- Existing business and PWA regression suites must remain green.

## QA
- Static build: 253 file checks PASS.
- Rental/deposit/slot policy: 46 PASS.
- Stabilization: 153 PASS.
- Retention/campaign: 15 PASS.
- Finance: 19 PASS.
- Session: 4 PASS.
- PWA static: 64 PASS.
- UX: 18 PASS.
- CSS architecture / operational health / desktop density / final desktop guards: PASS.
- Pages artifact: 190 files.
- Targeted runtime start-view regression: PASS — 390px renders `.upcoming-scope` first; 1440px renders `.booking-list` first.
- A full local `test:pwa` run progressed through the updated mobile suites without the former `.booking-list` startup timeout, but exceeded this execution harness time limit before the entire long suite completed; it is not recorded as a full local PASS. GitHub Actions remains the CI acceptance source.
