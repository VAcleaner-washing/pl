# VAcleaner · Native V2.3 Functional Parity / Final RC QA

## Scope
V2.3 is a parallel test route over the production v4.2.47 runtime. It restores the functional surfaces found missing during the V2.2/base comparison without forking business logic.

## Functional parity fixes verified
- Booking Detail restores `Історія бронювання` as a compact disclosure; the original `auditContent` and `auditReload` nodes/handlers are preserved.
- Booking Detail restores `Ще`; canonical status/cancel actions remain the original production buttons invoked through the existing action-sheet proxy.
- Finance restores `Категорія` filtering and the selected category survives rerender.
- Compact completed/cancelled cards keep deposit state and a comment-presence cue; verbose comment text remains compacted into Detail.
- Mobile `Ще` exposes Online/Offline state while the topbar remains clean.
- Native V2.3 manifest is correctly named/scoped to `/admin/bronuvannia-native-v23/`.
- Native V2.3 has a route-scoped service worker with V2.3 offline fallback and V2.3 notification/deep-link target.
- Sticky Detail header is opaque during scroll, preventing underlying status/content overlap.

## Status/action matrix verified
List + Detail were checked for all canonical states:
- `pending`: Опрацювати заявку · Редагувати · Ще → Скасувати
- `waiting_payment`: Опрацювати заявку · Редагувати · Ще → Виправити статус / Скасувати
- `confirmed`: Видати техніку · Редагувати · Ще → Виправити статус / Скасувати
- `issued`: Прийняти повернення · Розрахунок · Продовжити оренду · Ще → Виправити статус / Скасувати
- `completed`: Переглянути розрахунок · Приведи друга · Виправити статус
- `cancelled`: Виправити статус

The V2 action sheet changes presentation only; it invokes the canonical production buttons/handlers.

## Automated QA
- `python scripts/native_v22_qa.py` → **156 PASS / 0 FAIL**.
- `python scripts/native_v23_qa.py` → **109 PASS / 0 FAIL**.
  - 320 / 390 / 430 px primary surfaces.
  - No horizontal overflow.
  - No nested interactive/double-shell controls on primary surfaces.
  - Finance category filter.
  - Online/Offline state.
  - Completed compact financial/comment truth.
  - List + Detail action parity for 6 statuses.
  - Audit disclosure.
  - Manifest/SW static contracts.
- `npm run qa:static` → **38 PASS / 0 FAIL · FULL QA GREEN**.
- `npm run verify:artifact` → verified Pages artifact, release **4.2.47 / 4247**.

## Base-vs-Native UI comparison
Main-view interactive-control inventory comparison showed:
- Calendar / Equipment / Campaigns / Finances / Analytics / Chemistry / Settings: no missing controls after V2.3 parity fixes.
- Upcoming / Clients: differences are presentation-only (formatted phone numbers, `Відкрити` → `Деталі`).
- Bookings: status/cancel controls are intentionally moved from expanded `<details>` children into the V2 action sheet; parity is verified by the status/action matrix above.
- Detail: audit is collapsed by default and `Ще` actions are in the action sheet; both are reachable and tested.

## Production isolation
Compared with clean `v4.2.47 CI PIPELINE HARDENING`:
- `admin/bronuvannia/index.html` — identical
- `assets/admin-v250.js` — identical
- `assets/admin-v250.css` — identical
- `admin/manifest.webmanifest` — identical
- `admin/sw.js` — identical
- `assets/address-autocomplete.js` — identical
- `assets/address-autocomplete.css` — identical

All **521 shared base files** were compared: **520 identical; only `docs/VAcleaner-SYSTEM-SPEC.md` differs** because the V2.3 test contract is documented.

## Browser service-worker note
The route-scoped SW source, manifest and deploy artifact are verified statically. A direct localhost registration check with the container's system Chromium is blocked by the environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), the same local Chromium restriction already documented for prior Browser QA. This does not affect the source/archive checks above; final production promotion should still pass the repository's normal GitHub Browser gate.
