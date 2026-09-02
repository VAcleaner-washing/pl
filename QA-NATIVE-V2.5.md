# VAcleaner · Native UI V2.5 QA

## Final visual / regression audit

V2.5 is the final polish candidate on the parallel route `/admin/bronuvannia-native-v25/`.

### User-reported regressions corrected
- `Найближчі` restores the fast left operational rail: arrow, time, issue/return label, relative day badge.
- Process exposes private document photo add/replace and view controls via the canonical document service.
- `Вадим` profile card on `Ще` is informational and no longer duplicates Settings navigation.
- RETURN SMS workspace was reflowed to avoid clipped title/header/body overlap.
- Client segment/sort controls no longer clip at the right edge.
- Analytics and Finance period selectors (`7 днів / 30 днів / Місяць / Рік / Увесь час`) fit fully at 320 / 390 / 430 px.
- Settings fuel inputs use one visible shell instead of framed-control-inside-framed-control.
- All five Settings tabs remain reachable/visible without a clipped right-side rail.
- Booking Detail keeps compact `Оновити`, audit history and visible `Ще` actions.

## Native V2.5 primary/action parity QA

The main V2.5 QA was executed in two parts in the local harness to stay within the execution window:
- Part 1: **105 PASS / 0 FAIL**
- Part 2: **37 PASS / 0 FAIL**
- Combined: **142 PASS / 0 FAIL**

Coverage includes:
- 320 / 390 / 430 px primary views;
- no horizontal overflow;
- no nested interactive shells;
- Finance category filter;
- all six booking statuses and list/detail action parity;
- audit history and action sheet;
- compact historical booking truth;
- profile online/offline state;
- Analytics/Finance period clipping checks;
- Clients filters;
- `Найближчі` operational rail;
- Settings fuel single-shell contract;
- Process document upload/view controls;
- RETURN SMS geometry;
- V2.5 manifest, SW, deep-link and local-notification route contracts.

## Deep mobile QA

`python scripts/native_v25_deep_qa.py` → **93 PASS / 0 FAIL**.

Coverage at 320 / 390 / 430 px:
- all five Settings tabs;
- Process;
- Issue;
- Preliminary finance;
- Final finance / complete;
- Extend;
- New booking;
- SMS workspace;
- Client card;
- modal footer visibility;
- no horizontal overflow;
- no nested interactive shells.

## Focused screenshot-derived regression audit

`python /mnt/data/v25_extra_audit.py` → **40 PASS / 0 FAIL**.

Covers the specific regressions reported from real iPhone screenshots: clipped period controls, Clients toolbar, `Найближчі`, RETURN SMS, fuel shells, profile navigation, document controls, Detail Update/More.

## Canonical static/build

`npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**.

`npm run verify:artifact` → **PASS**, deploy artifact verified for release `4.2.47 / 4247`.

## Full archive parity with clean v4.2.47 baseline

Compared against `VAcleaner-v4.2.47-CI-PIPELINE-HARDENING`:
- baseline files: **521**;
- shared files present in V2.5: **521 / 521**;
- missing baseline files: **0**;
- byte differences among baseline files: **1** — only `docs/VAcleaner-SYSTEM-SPEC.md`, intentionally updated with the Native test contract.

Production invariants specifically checked SHA-256 identical (**10 / 10**):
- `admin/bronuvannia/index.html`
- `assets/admin-v250.js`
- `assets/admin-v250.css`
- `admin/manifest.webmanifest`
- `admin/sw.js`
- `assets/address-autocomplete.js`
- `assets/address-autocomplete.css`
- `assets/vacleaner-core.js`
- `release.json`
- `package.json`

## Status

V2.5 is a **Final Polish RC on a parallel test route**, not yet a production replacement. The remaining release barrier is the full GitHub Pages Browser gate on the QA branch / deployed Pages artifact.
