# VAcleaner v4.0.59 — CALENDAR CONTAINMENT & PACKAGE PRICE BASELINE FIX

## Fixed
- Desktop admin calendar no longer lets morning/evening slot buttons escape their day card.
- The calendar three-column grid and both slot columns use shrinkable `minmax(0,1fr)` containment instead of min-content widths.
- `/komplekty/` now reserves a four-line title zone at every three-column desktop width (`>=1200px`), so the longer public title no longer pushes the first price down.

## QA hardening
- PWA visual QA now asserts every calendar slot remains physically inside its own day card and that desktop keeps three contained columns.
- Static build check enforces the shrinkable calendar grid/row contract.
- Existing E2E package-baseline tolerance remains `<=1.5px`; it was not relaxed.
- Public visual contract now requires the stronger four-line title zone across all three-column desktop widths.

## Measured package price geometry
Isolated Chromium rendering of the actual `/komplekty/` HTML/CSS:
- 1648px: row delta 0.00px
- 1440px: row delta 0.01px
- 1280px: row delta 0.03px
- 1200px: row delta 0.00px
- 1199px: two-column rows aligned at 0.00px
- 1051px: two-column rows aligned at 0.00px

## QA
- `npm run check`: 319 PASS
- public visual contract: 191/191 PASS
- PWA visual QA: 653/653 PASS
- desktop density: 63/63 PASS
- final desktop visual audit: 232/232 PASS
- stabilization: 171 PASS
- rental/deposit/slots: 46 PASS
- process metadata/push copy: 29 PASS
- issue workflow: 12/12 PASS
- retention: 23 PASS
- booking CTA stability: 14 PASS
- package language: PASS
- financial control: PASS
- operational health: PASS
- static copy integrity: PASS

## Local E2E limitation
The full `test:e2e` runner cannot navigate to the temporary `127.0.0.1` server in this environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). GitHub Actions remains the final full browser-run confirmation after upload.

## Scope
No booking, pricing, deposit, Supabase, public package naming or admin naming logic changed.
