# VAcleaner · Native UI V2.4 QA

## Screenshot-driven visual audit

V2.4 was reviewed across the primary mobile surfaces and deep operational flows after V2.3 functional parity.

### Visual defects corrected
- Booking filter rail no longer floats over and cuts booking-card headers while scrolling.
- Returned/cancelled cards use tighter historical density and no longer waste a row on neutral `Фінальний баланс 0 грн`.
- Booking audit history uses flat timeline rows instead of card-inside-card styling; `Оновити` is 44px+.
- Booking `Ще` action sheet is one equal-row list; danger action remains distinct.
- Online/offline status moved into profile metadata on `Ще`.
- Issue and preliminary/final finance booking context now has one thin shell and one internal divider.
- Campaign KPI microcopy, Analytics KPI context, Calendar headers, Settings tabs and SMS key metadata were raised from micro-type.
- PWA update notice is a compact toast above bottom navigation instead of a second large bottom panel.
- Search/filter touch targets are 44px+ where they are primary mobile controls.

## Targeted V2.4 QA

`python scripts/native_v24_qa.py` → **123 PASS / 0 FAIL**.

Coverage includes:
- 320 / 390 / 430 px all 10 primary PWA views;
- no horizontal overflow;
- no nested interactive shells;
- Finance category filter;
- all six booking statuses and list/detail action parity;
- Detail audit disclosure and `Ще` action sheet;
- compact historical cards;
- profile online/offline state;
- issue/finance context shell;
- manifest, scoped SW and local-notification route ownership.

## Deep mobile QA

`python scripts/native_v24_deep_qa.py` → **93 PASS / 0 FAIL**.

Coverage includes 320 / 390 / 430 px:
- all five Settings tabs;
- Process;
- Issue;
- Preliminary finance;
- Final finance / close rental;
- Extend rental;
- New booking;
- SMS workspace;
- Client card;
- fixed modal footer visibility;
- no horizontal overflow and no nested interactive shells.

## Canonical static/build

`npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**.

`npm run verify:artifact` → **PASS**, release `4.2.47 / 4247`.

## Production isolation

Compared with clean `v4.2.47 CI PIPELINE HARDENING` baseline. These production invariants are SHA-256 identical:
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

Result: **10 / 10 identical**.

## Release status

V2.4 is a **test/RC route**, not a production replacement yet. The final GitHub Pages Browser gate should still run after the RC is pushed to its QA branch.
