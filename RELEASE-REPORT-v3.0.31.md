# VAcleaner v3.0.31 — ADMIN NAV + MODAL GEOMETRY REPAIR

Release date: 2026-08-07  
Build: 3031

## Scope

This is a focused admin/PWA regression repair based strictly on v3.0.30. No VA HOME tables, functions, policies or UI were changed. No new business features were added.

## Fixed

1. **Global search reset between tabs**
   - Explicit navigation between admin tabs now clears `#globalSearch` and hides the clear control.
   - Contextual search still works inside Bookings and Clients while typing.

2. **Issue / return modal geometry**
   - Mobile `Видача техніки`, `Закриття оренди` and finance summaries use intrinsic grid rows.
   - Summary cards can no longer overlap the primary data card.
   - Deposit quick actions use a stable two-column mobile layout; the tariff action spans the full row.

3. **Mobile date picker tap target**
   - The native `<input type="date">` owns the full visible date-control tap area on mobile/PWA.
   - The styled display layer is presentation-only and cannot intercept the tap.

4. **New-booking progress composition**
   - Progress dots are integrated into the modal header.
   - The redundant visible `Крок 1 з 4 · ...` strip between the header and the form is removed.
   - The form now has one clear header / scroll-body / footer contract.

5. **Sticky booking status filters**
   - `Усі / Нові / Очікують / Підтверджені / Видані / Повернені / Скасовані` stay sticky after the KPI/hero area scrolls away.
   - Mobile uses one compact horizontally-scrollable row instead of a tall wrapped sticky block.
   - Sticky position aligns directly below the fixed topbar on mobile and desktop.

## Regression gates

Final stamped build results:

- `npm run check`: **278 file checks PASS**
- Rental / deposit / slot policy: **46/46 PASS**
- Stabilization contract: **112/112 PASS**
- CSS architecture: **PASS** (`admin-v250.css`: 1 `!important`)
- Operational health contract: **PASS**
- Retention / campaign rules: **13/13 PASS**
- Public booking resilience: **PASS** (mutation plateau 19→19; unavailable 409 stays in-page)
- Installed-PWA / browser visual QA: **434/434 PASS**
- Desktop density QA: **60/60 PASS**
- Final desktop visual QA: **205/205 PASS**
- Pages build: **193 files / 4961 KiB**

New v3.0.31 runtime gates specifically verify:

- search clears when the manager changes tabs;
- booking filters become sticky directly below the topbar;
- tapping the mobile date control reaches the native date input;
- booking progress is inside the header and the old interstitial label is not rendered;
- issue/return/finance summary starts after the main data card and never overlaps it.

## Local E2E limitation

`npm run test:e2e` could not start product scenarios in this environment because Chromium is blocked from opening `http://127.0.0.1:4173/` with `ERR_BLOCKED_BY_ADMINISTRATOR`. Result: 0 product scenarios started. This is not reported as PASS. GitHub Actions remains the authoritative full HTTP E2E gate after upload.

## Security / packaging

- `.github/workflows/pages.yml` is present in the release archive.
- No customer import files / historical booking source payloads are included.
- No JWT, Supabase service-role key or Telegram bot token literals were found by release scan.
- No Supabase / Edge deployment is required for v3.0.31; this release is admin UI + QA only.
