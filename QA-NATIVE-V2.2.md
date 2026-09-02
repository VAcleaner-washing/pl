# VAcleaner · Native UI V2.2 QA

## Targeted V2.2 browser audit

Command: `python scripts/native_v22_qa.py`

Result: **156 PASS / 0 FAIL**.

Coverage:
- 320 / 390 / 430 px: Upcoming, Bookings, Calendar, Equipment, Clients, Campaigns, Finances, Analytics, Chemistry, Settings.
- All five Settings tabs.
- New booking, Process, Issue, Preliminary finance, Final finance, Extension.
- Booking `Ще` action sheet, Detail, Client card, SMS modal.
- No horizontal overflow.
- No nested interactive control shells.
- 44px+ mobile navigation targets.
- Equipment composite inputs have one visible shell.
- Settings slot range is `Початок — Кінець` and save actions clear bottom navigation.
- Issue/Finance booking context occupies a real grid row and does not overlap form content.
- Detail date/time duplicate is removed.

## Visual review fixes found after the first V2.2 pass

- Fixed Issue and Finance context strip overlap caused by the late three-row mobile modal rule in `admin-v250.css`.
- Fixed remaining equipment Settings `label + inner div` double shell.
- Re-ran targeted V2.2 QA after both visual fixes: **156 / 156 PASS**.

## Canonical static/regression/build

`npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**.

`npm run verify:artifact` → deploy artifact verified, release **4.2.47 / 4247**.

## Production isolation

Compared against clean `v4.2.47 CI PIPELINE HARDENING` baseline:
- `admin/bronuvannia/index.html`
- `assets/admin-v250.js`
- `assets/admin-v250.css`
- `admin/manifest.webmanifest`
- `admin/sw.js`
- `assets/address-autocomplete.js`
- `assets/address-autocomplete.css`

Result: **7 / 7 SHA-256 identical**.

## Full canonical Browser QA note

The long canonical Browser suite was also started. Public/editorial browser suites completed with PASS results. Local E2E on the system Chromium then hit `ERR_BLOCKED_BY_ADMINISTRATOR` for localhost — the known system-Chromium policy issue that the pipeline contract explicitly avoids by using Playwright-managed Chromium. The remaining long suite did not finish inside the local execution window. This archive therefore remains a **TEST** build, not a production release candidate.
