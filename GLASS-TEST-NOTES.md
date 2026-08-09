# VAcleaner Liquid Glass Test — base v3.0.75

This is an experimental visual branch inside the same ZIP.

- Production/default admin: `/admin/bronuvannia/`
- Liquid Glass test: `/admin/bronuvannia-glass/`
- Main `release.json` remains `3.0.75` / build `3075`.
- No Supabase, booking logic, finance, auth, or data model changes are part of the glass test.
- The glass layer is limited to navigation and controls; content cards remain mostly opaque for legibility.


## Glass V3 UX status accents
- Upcoming cards restored strong left status rails.
- Confirmed / issue cards use amber edge, badge and time-chip accents.
- Issued / return cards use green edge, badge and time-chip accents.
- Goal: faster visual scanning in “Найближчі” without losing the premium glass feel.


## Glass V4 — unified UX pass
- Bookings: semantic status rail + status-tinted badge hierarchy.
- Calendar: clearer available / one-left / occupied control states.
- New booking: stronger 4-step progress, stable glass header/footer, premium selected controls.
- Client card: quick Call / Telegram / New rental actions, stronger private document hierarchy and rental history.
- Core production /admin/bronuvannia/ remains unchanged; V4 assets load only in /admin/bronuvannia-glass/.
