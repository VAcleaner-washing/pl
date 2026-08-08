# VAcleaner v3.0.59 — PACKAGE CARD RHYTHM ALIGNMENT

## Scope
Desktop `/komplekty/` visual alignment correction on top of v3.0.58. No admin/PWA shell, Supabase business logic, pricing rules, deposits, campaigns, or VA HOME code changed.

## Root cause
The package cards share the same outer grid height, but their `h2` titles have different line counts. One-line titles collapsed the heading zone by roughly one line, pulling every following section upward: product line, purpose, feature list, price and tariff copy. Centering only the price text in v3.0.58 did not solve that structural offset.

## Fix
- In the desktop three-column package grid, every package title now reserves the same two-line heading zone (`min-height: 2em`).
- This keeps the following content sections on matching horizontal baselines across cards in the same grid row: product line, purpose, feature list, price and tariff/value copy.
- Existing horizontally centered price/value treatment is preserved.
- CTA remains bottom-aligned by the existing card contract.
- HOME RESET gift UI and exact VA HOME Entry deep-link remain unchanged.
- The rule is desktop-only (`min-width: 1051px`); single-column tablet/mobile cards keep their natural content height.

## Archive hygiene
- Only this current Release Report is included at root.
- Generated `dist/`, test artifacts and Python cache remain excluded from the source ZIP.

## Acceptance
- In each desktop package-card row, content below the title starts on the same baseline even when one title uses one line and another uses two.
- Prices remain horizontally centered.
- Mobile/tablet card flow is unchanged.

## QA
- Static build checks: 253 PASS.
- Rental/deposit/slot policy: 46 PASS.
- Stabilization: 149 PASS.
- Finance: 19 PASS.
- Session: 4 PASS.
- Retention/campaign: 15 PASS.
- UX: 18 PASS.
- PWA static: 64 PASS.
- CSS architecture / operational health / desktop density guards: PASS.
- Isolated Chromium geometry check at 1648 px confirmed matching top coordinates for title zone, product line, purpose, feature list, price and tariff copy within each desktop card row; CTA baselines also match.
- 390 px check confirmed the desktop title reservation is not applied on mobile (`min-height: 0`).
