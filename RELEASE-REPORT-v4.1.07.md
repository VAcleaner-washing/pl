# VAcleaner v4.1.07 / build 4107

Release date: 2026-08-23
Label: ANALYTICS AXIS + PRODUCT PAGE VISUAL PARITY

## Scope

This release fixes two user-visible regressions without changing backend/Supabase business logic:

1. Analytics chart scales and PWA chart typography.
2. Visual parity of the SC 2 and ABIR product pages with the canonical Kärcher Puzzi landing page.

## 1. Analytics chart scale fix

### Root cause

`analyticsTrendMarkup()` used fixed fractional Y-grid positions and rounded their labels. On the rentals chart this could render different fractional values as the same rounded integer (for example two `2` labels). Revenue labels were abbreviated with `k` (`2.9k`, `2.2k`), which was not appropriate for the business dashboard. A separate mobile CSS rule also forced chart axis labels to 18px, making the PWA chart visually oversized and cramped.

### Fix

- Added a nice-axis scale with stable steps.
- Revenue now uses full grouped values such as `1 000`, `2 000`, `3 000` instead of `1k`, `2.9k`.
- Rentals use unique whole-number ticks only (`0 · 1 · 2 · 3`).
- First and last X-axis labels use edge-safe anchors and wider chart margins.
- Mobile axis typography reduced to an intentional 11px rather than the previous accidental 18px rule.
- Mobile chart height was slightly reduced to improve PWA density without shrinking core dashboard typography.

## 2. SC 2 / ABIR product visual parity

### Root cause

Both product pages linked `assets/puzzi-seo.css`, but their HTML used stale one-off class names that the Puzzi stylesheet did not style (`puzzi-price-row`, `puzzi-use-grid`, `puzzi-process-list`, `puzzi-terms-grid`, etc.). Their `<main>` elements also did not use the canonical `puzzi-seo-page` class. The result was structurally valid SEO content rendered with an incomplete/raw visual system.

### Fix

Both `/tekhnika/karcher-sc-2-deluxe/` and `/tekhnika/robot-dlia-vikon-abir/` now use the same visual contract as `/tekhnika/karcher-puzzi-8-1/`:

- canonical `puzzi-seo-page` wrapper;
- split dark hero with gold model accent;
- canonical price, CTA and microcopy blocks;
- atmospheric product visual with floating metadata cards;
- canonical facts strip;
- matching use-case grids, process steps, terms, FAQ numbering and final CTA;
- product-aware booking links remain preserved;
- mobile decorative glow is constrained to the viewport.

A build regression contract now rejects the stale one-off class names so this divergence cannot silently return.

## QA results (final build 4107)

- `npm run check` on the clean extracted release — 337/337 PASS.
- `npm run test:analytics` — PASS.
- `npm run test:analytics-visual` — 75/75 PASS across 320, 390, 430, 768, 1024, 1280, 1650×760 and 1920.
- `npm run test:growth-content` — PASS.
- `npm run test:growth-visual` — 121/121 PASS across the same responsive set for SC 2, ABIR, reviews and booking.
- `npm run test:public-visual-contract` — 203/203 PASS.
- `npm run test:public-seo` — 321/321 PASS.
- `npm run test:pwa-static` — 82/82 PASS.
- `npm run test:desktop-final` — 319/319 PASS across 1024, 1280, 1440 and 1650×760.
- Full `npm run test:pwa` — 793/793 PASS, 0 FAIL.

## Backend / deployment

- Supabase and Edge Functions were not changed for this release.
- VA HOME resources were not touched.
- This report does not claim that frontend build 4107 has been deployed live or that a new GitHub Actions run is green.
