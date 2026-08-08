# VAcleaner v3.0.60 — UPCOMING HOME & ANALYTICS RANGE

## Scope
Operational admin UX update on top of v3.0.59. No Supabase schema, RLS, pricing, deposit, campaign, VA HOME, public booking, or PWA fixed-nav architecture changed.

## Changes
- Mobile bottom navigation order is now: `Найближчі | Бронювання | + Нове | Календар | Ще`.
- On mobile/PWA widths (`<=900px`), `Найближчі` is the default start view.
- Desktop keeps `Бронювання` as its default start view and keeps the existing sidebar order.
- Push/deep links to a concrete booking still switch to `Бронювання` and open that booking.
- Global search still switches to `Бронювання` when needed.
- Analytics delta labels now show the exact comparison window, e.g. `+49% · проти 10.06–09.07`, instead of the ambiguous `до попереднього періоду`.

## PWA
- `start_url` and `scope` are unchanged.
- The existing root-level fixed mobile nav architecture is unchanged.
- No keyboard/visualViewport/safe-area logic was added.

## Archive hygiene
- Only this current Release Report is included at root.
- Generated `dist/`, test artifacts and Python cache remain excluded from the source ZIP.

## Acceptance
- Mobile opens to `Найближчі` with that nav item active.
- Desktop opens to `Бронювання`.
- Mobile nav order is exactly Upcoming, Bookings, New, Calendar, More.
- Opening/closing `Ще` continues to preserve the correct active state.
- Analytics comparisons show the concrete previous date interval.

## QA
- Static build checks: 255 PASS.
- Stabilization: 153 PASS.
- Finance: 19 PASS.
- Session: 4 PASS.
- Retention/campaign: 15 PASS.
- Rental/deposit/slot policy: 46 PASS.
- PWA static: 64 PASS.
- UX: 18 PASS.
- CSS architecture / operational health / desktop density / final desktop guards: PASS.
- Pages artifact build: 190 files.
- Full browser E2E could not start in this execution environment because local `127.0.0.1:4173` navigation is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; this is not recorded as a product PASS.
- Real iPhone/PWA remains the acceptance source for mobile runtime behavior.
