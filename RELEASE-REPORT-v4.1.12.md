# VAcleaner v4.1.12 / build 4112 — Release report

Release date: 2026-08-23

## Scope

This frontend release starts from `VAcleaner-v4.1.11-STORY-ELIGIBILITY-E2E-FIX(2).zip` and addresses only the confirmed current issues below. No Supabase Edge Function or production backend deployment is included.

## Root causes confirmed

1. `/rishennia/textile/` rendered the Puzzi equipment row as plain feature text while `assets/site-v400.js` injected a separate contextual `Про Kärcher Puzzi 8/1 →` CTA. This did not match the intended feature-list interaction.
2. The mobile Stories browser regression selected a Puzzi bundle by stale marketing copy `Глибоке очищення текстилю`, while the current public title is `Глибоке очищення диванів і матраців`. A static policy test was also asserting the stale selector.
3. At 1024 px, `.campaign-summary` was constrained to about 389 px while four KPI cells, `nowrap` labels, padding, and large values required more content width. Browser reproduction showed internal overflow and visible KPI/value collision even though the container itself stayed inside the viewport.

## Changes

### Textile solution

- The first `Усе потрібне вже зібрано` row is now the clickable equipment name itself:
  `Kärcher Puzzi 8/1 і насадка для меблів`.
- It links to `/tekhnika/karcher-puzzi-8-1/`.
- The textile route no longer appends a separate `Про Kärcher Puzzi 8/1 →` CTA.
- SSR markup and runtime enhancement use the same interaction model.

### Stable Stories E2E identity

- Booking product buttons now expose `data-product-code`.
- The eligible Stories regression selects `puzzi_jimmy` by stable product identity instead of marketing copy.
- The gift policy test now rejects the stale text selector and verifies the stable product-code contract.
- The public client-facing title remains `Глибоке очищення диванів і матраців`.

### Campaign KPI at 901–1180 px

- `.campaign-summary` changes structurally to a 2×2 KPI grid in this breakpoint.
- Typography is not reduced to hide the issue.
- Campaign row actions and the SMS workflow were not redesigned.
- Browser QA now explicitly asserts that the summary and every KPI cell have no internal horizontal overflow in this range.

### Release stamp

- Version: `4.1.12`
- Build: `4112`
- Static version/cache references were stamped for build 4112.

## Verification completed

### Static / contract QA

- `npm run check` — PASS, 339 file checks.
- `npm run test:copy-integrity` — PASS.
- `npm run test:package-language` — PASS.
- `npm run test:delivery-settings` — PASS, 14 checks.
- `npm run test:public-seo` — PASS.
- `npm run test:growth-content` — PASS.
- `npm run check:backend` — PASS against the repository inventory contract; no backend was deployed.
- `npm run test:deposit-policy` — PASS.
- `npm run test:stabilization` — PASS.
- `npm run test:public-visual-contract` — PASS, 206 checks.
- `npm run test:retention` — PASS.
- `npm run test:booking-cta` — PASS, 14 checks.
- `npm run test:process-metadata` — PASS, 29 checks.
- `npm run test:peer-admin-push` — PASS, 26 checks.
- `npm run test:issue-workflow` — PASS, 18 checks.
- `npm run test:financial-control` — PASS.
- `npm run test:operational-health` — PASS.
- `npm run test:analytics` — PASS.
- `npm run test:smart-guide-logic` — PASS, 17 checks.
- `npm run test:booking-date-default` — PASS, 9 assertions.
- `npm run test:pwa-static` — PASS, 82 assertions.
- `npm run test:sms-campaigns` — PASS, 82 checks.
- `npm run test:booking-gifts` — PASS, 14 checks.
- `npm run test:booking-extras` — PASS, 11 checks.
- Python compile check for modified browser-QA scripts — PASS.

### Browser / responsive QA completed

- `npm run test:campaign-sms-ux` — PASS, 332/332 across 320, 390, 430, 768, 1024, 1280, 1650 and 1920 widths.
- The 1024 KPI summary was re-measured after the fix: `scrollWidth == clientWidth`; all four KPI cells also fit internally; computed grid is two columns.
- `npm run test:booking-gifts-visual` — PASS, 40/40 across 320, 390, 430, 768, 1024, 1280, 1650×760 and 1920.
- `npm run test:desktop-final` — PASS, 319/319 after updating the stale 1024 four-column expectation to the intended 2×2 responsive contract.
- Targeted PWA browser suites for tablet, desktop and 1650×760 short desktop — PASS, 80/80.

## Environment limitations — not counted as PASS

- Full `npm run test:e2e` could not execute in this sandbox because Chromium navigation to its temporary local server was blocked with `net::ERR_BLOCKED_BY_ADMINISTRATOR` for `http://127.0.0.1:...`. Result: 0 passed; this is not reported as a green E2E run.
- Full `npm run test:pwa` did not produce a final suite result before the execution limit, so only the targeted PWA browser subset listed above is claimed as PASS.
- `npm run test:public-booking` did not complete within the sandbox execution limit, so it is not claimed as PASS.

## GitHub Actions / deployment status

No commit or push was performed from this workspace. Therefore there is no new GitHub Actions run for v4.1.12 to claim as green, and production/live was not updated. After committing/pushing this release, the new Pages workflow must complete successfully before deployment is considered verified.

## Backend note

No production Supabase function was changed or redeployed. Existing production SMS/backend behavior is intentionally outside this frontend release.
