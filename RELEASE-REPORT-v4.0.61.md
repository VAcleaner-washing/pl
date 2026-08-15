# VAcleaner v4.0.61 — SPOT CARE SELECTED STATE & NEXT CHUNK CACHE FIX

## Fixed
- VA SPOT FIX / VA STAIN OX keep their warm branded background, border treatment and `VA PROFESSIONAL SPOT CARE` marker after checkbox selection.
- Root cause of the production-only regression: the manually patched booking React chunk kept the historical filename `146ntlcv_t6~w-v4041.js`, so a returning browser could hydrate fresh v4.0.60 server HTML with a cached older React component. On the first checkbox rerender the old component dropped `is-va-stain-care`.
- Booking HTML and all exported Next/RSC payloads now version that chunk URL with the current release build.
- `public-catalog.js` also reapplies canonical chemistry presentation on checkbox changes as a defensive fallback.

## Regression coverage
- Browser E2E now checks that VA SPOT FIX keeps `is-selected` + `is-va-stain-care`, the professional badge and a branded background after selection.
- `check-build` rejects unversioned booking chunk references or a hydrated component that can drop the branded class.

## Scope
- Public booking presentation/cache behavior only.
- No pricing, rental, deposit, finance, admin, Supabase schema/RLS or VA HOME logic changed.
