# VAcleaner v3.0.74 — iOS Liquid Glass TEST

Experimental visual study built on top of the unchanged VAcleaner v3.0.74 release.

## Important

- `release.json` remains `3.0.74 / build 3074`.
- The normal admin route `/admin/bronuvannia/` is byte-for-byte identical to the original v3.0.74 archive.
- The experiment lives at `/admin/bronuvannia-glass/`.
- No Supabase schema, data, RLS, Auth, Storage, Edge Function, booking logic, finance logic or public-site logic was changed.

## Glass test scope

The experiment applies only to the mobile/PWA layout (`<= 900px`) and follows the Liquid Glass hierarchy idea:

- floating translucent bottom navigation;
- glass search capsule;
- glass filter pills / segmented controls;
- tinted glass primary controls;
- modal header/footer material;
- content cards remain dark/mostly opaque instead of becoming glass.

## Files added

- `assets/admin-glass-test.css`
- `admin/bronuvannia-glass/index.html`
- `admin/manifest-glass-test.webmanifest`
- `GLASS-TEST-NOTES.md`

## QA

- `npm run check`: PASS — 269 file checks.
- Original `/admin/bronuvannia/index.html` SHA256 matches the original v3.0.74 archive exactly.
- Targeted Liquid Glass geometry QA: PASS on 320 / 390 / 430 px.
- Checked: horizontal overflow, floating nav bounds, backdrop material, search capsule, content-under-nav layout, filter material, booking width.
- 390 px preview screenshots generated separately for Upcoming / Bookings / Calendar.

This is not a new production release and must not be treated as v3.0.75.
