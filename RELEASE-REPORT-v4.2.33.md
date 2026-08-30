# VAcleaner v4.2.33 — CLIENT CARD GEOMETRY + PWA DENSITY

## Fixed

- Client card on wide desktop is optically centered against the full viewport; root scrollbar reservation no longer shifts the dialog left while a modal is open.
- Wide client card uses three independent vertical CRM columns instead of one row-locked grid that left a large empty block on the right when History was shorter than Contacts/Document.
- Column grouping: Contacts + Referral; Document + Next action; History + Bonuses + SMS.
- Tablet/mobile behavior is preserved by flattening the column wrappers at <=1220px.
- Mobile stacked booking cards were compacted enough to meet the one-usable-phone-viewport PWA density contract at 320 and 390 px.

## Preserved

- Full admin typography hierarchy from v4.2.32.
- Client data/editing, private document behavior, referral, promo/SMS, rental history and navigation.
- Delivery road-distance logic, settlement/promo/RETURN logic, Supabase schema/functions, VA HOME objects.

## QA

- Static/build aggregate: 91/91 PASS.
- v4.2.33 client geometry contract: 17/17 PASS.
- Full PWA: 882/882 PASS.
- Admin typography/browser: 185/185 PASS.
- Admin context navigation: 11/11 PASS.
- Client card mobile: 3/3 PASS.
- Glass V4: FULL GREEN.
- Desktop density: 63/63 PASS.
- Desktop final: 394/394 PASS.
- Measured booking card max height: 320px viewport = 708.47px (limit 708.96px); 390px = 704.47px.
- Measured 1440px client modal center: exact 720px / 1440px viewport center.

## Release gate

This archive is a QA-RC. Merge to production only after the canonical GitHub Browser QA aggregate is GREEN on the uploaded branch.
