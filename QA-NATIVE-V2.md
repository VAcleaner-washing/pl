# VAcleaner · Native UI V2 QA

## Routes
- Production: `/admin/bronuvannia/`
- Native V1: `/admin/bronuvannia-native-test/`
- Native V2: `/admin/bronuvannia-native-v2/`

## V2 cleanup scope
- Settings: one border per input/select; no nested/double control shells.
- Settings slots: `Початок / Кінець` instead of visually ambiguous `З / До`; compact morning/evening rows.
- Deposit editor: one card per category with clean inner fields.
- Settings actions: one primary save action; reset remains secondary.
- Bookings: compact active cards; quiet selected filter; left status rail preserved.
- Booking `Ще`: real root-level action sheet with actual actions and close behavior; no stretched empty block.
- Bottom nav: badge offset corrected; `Ще` is active while More screen is open.
- Client card: all-caps names are normalized in display only; stored customer data is unchanged.
- Booking detail: duplicate date row hidden; consistent SVG icon set replaces temporary glyphs.
- Calendar summary compacted; duplicate technical ISO date stays hidden.
- Search height reduced slightly without changing global-search behavior.

## Verification
- Native V2 targeted browser QA: **78 PASS / 0 FAIL** at 320 / 390 / 430 px plus exact Settings / Booking More / Detail / Client checks.
- Canonical static/regression/build QA: **38 PASS / 0 FAIL · FULL QA GREEN**.
- Deploy artifact verification passed after build: release **4.2.47 / 4247**.
- Production PWA key files vs clean v4.2.47 baseline: **7 / 7 SHA-256 identical**.
- A full canonical Browser QA run was started and showed no failures before the local execution window ended; V2-specific browser coverage is the 78/78 suite above.

## Production isolation
V2 adds only a parallel test route/assets/manifest and System Spec documentation. Production route, production admin CSS/JS, production manifest/service worker, business logic and Supabase contracts are unchanged.
