# VAcleaner v3.0.58 — PACKAGE PRICE ALIGNMENT & HOME RESET GIFT UI

## Scope
Visual-only public-site correction on top of v3.0.57. No admin/PWA shell, Supabase, rental pricing logic, deposits, campaigns, or VA HOME code changed.

## Fixes
- Centered the headline price rows on `/komplekty/` for a cleaner card rhythm.
- Centered the tariff/value copy beneath each package price.
- Rebuilt the HOME RESET diffuser gift presentation as a dedicated high-contrast note above the booking CTA, removing the overlap/low-contrast visual bug.
- Runtime enhancement now normalizes the gift element position even after Next hydration.
- Preserved the exact VA HOME Entry deep-link: `https://vahome.com.ua/catalog?collection=entry`.

## Archive hygiene
- Only the current Release Report is included at root.
- Generated `dist/`, test artifacts and Python cache are excluded from the source ZIP. GitHub Actions rebuilds the Pages artifact.

## Acceptance
- Price rows are horizontally centered on desktop and mobile.
- HOME RESET gift text is readable and does not collide with the CTA border/text.
- Entry collection filter remains intact.
