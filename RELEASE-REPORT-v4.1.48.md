# VAcleaner v4.1.48 — CONTENT & LOCAL DEMAND

Released: 2026-08-26

## Scope
Content SEO release built on v4.1.47.2 without changing booking availability, rental prices, RETURN, Campaigns/SMS, status transitions or delivery-distance business rules.

## Priority content cluster
Six priority guides are now surfaced on `/blog/`:

1. `yak-pochystyty-dyvan-vdoma` — complete sofa-cleaning sequence.
2. `skilky-sokhne-dyvan-pislia-chyshchennia` — existing drying guide, retained as a priority page.
3. `yak-prybraty-zapakh-z-dyvana` — odor source / Neutralix / Odour Zero / Puzzi workflow.
4. `yak-pochystyty-matrats-vdoma` — Jimmy dry stage + Puzzi controlled rinse.
5. `shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom` — steam-cleaner surface safety guide.
6. `yak-pomyty-vikna-robotom` — window-robot preparation, safety and use-case guide.

The older stain guide and child-mattress guide remain indexable as supporting long-tail pages; they were not deleted or cannibalized.

## SEO architecture
- SEO map expanded from 24 to 29 indexable routes.
- New pages have unique title, description, canonical, Open Graph/Twitter metadata, LocalBusiness, BlogPosting and BreadcrumbList schema.
- Sitemap includes all five new article URLs with route-specific lastmod.
- No suburb/city doorway pages were added.
- Commercial rental pages keep equipment intent; articles keep informational intent.

## Internal linking
Related-reading blocks were added to:
- `/rishennia/textile/`
- `/rishennia/mattress/`
- `/rishennia/steam/`
- `/rishennia/windows/`
- Puzzi equipment page
- SC 2 equipment page
- ABIR equipment page

The three pre-existing blog guides also gained contextual crosslinks into the new cluster.

## UX
- Blog index now separates six priority guides from two supporting situational guides.
- Every new article opens with a concise answer before the long-form guide.
- Mobile/desktop related cards use the existing VAcleaner visual system and do not introduce a separate design language.
- No new public runtime JS was added.

## Reproducibility
`scripts/apply-content-v4148.mjs` is wired into `npm run stamp`, so content pages, blog cluster, related blocks, CSS and sitemap additions are recreated idempotently before SEO metadata enforcement.

## QA
- `npm run check` — PASS, 401 file checks.
- `npm run test:v4.1.48-content-local-demand` — PASS, 94/94.
- `npm run test:v4.1.48-content-visual` — PASS, 90/90 across 390px and 1280px changed surfaces.
- `npm run test:v4.1.47-seo-local` — PASS.
- `npm run test:public-seo` — PASS, 402/402.
- `npm run test:growth-content` — PASS.
- `npm run test:growth-visual` — PASS.
- `npm run test:public-inner-heroes` — PASS, 259/259.
- `npm run test:public-booking` — PASS.
- `npm run test:booking-cta` — PASS, 14 checks.
- `npm run build` — PASS, 229 Pages files / 6963 KiB.
- Full URL E2E cannot start in this container because Chromium policy blocks `http://127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR`; content visual QA uses in-memory documents and passes.

## Not changed
- Supabase production logic / migrations.
- Authoritative availability and inventory reservation.
- RETURN / campaigns / SMS.
- Booking statuses and financial workflow.
- Rental and deposit tariffs.
- v4.1.47.2 distance delivery pricing.
