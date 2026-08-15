# VAcleaner v4.0.64 — TRUST PROOF, CONTEXTUAL PICKER & MOBILE CTA POLISH

Released: 2026-08-15
Build: 4064

## UX changes
- Reviews trust block is now compact and positive:
  - `✓ Підтверджена оренда`
  - explains that the mark is tied to an actual VAcleaner booking
  - name publication remains permission-only
  - removed defensive copy about “вигадані рейтинги”.
- 30-second picker is integrated contextually rather than duplicated everywhere:
  - home hero keeps its existing picker CTA;
  - home “Що хочете почистити?” helper now routes multi-task users into `/pidbir/`;
  - home package section gets a compact “Допоможіть підібрати комплект” bridge;
  - `/komplekty/` gets a dedicated compact picker bridge after the package cards;
  - `/rishennia/` existing choice strip now routes to the 30-second picker;
  - textile / steam / windows / mattress solution pages get a cross-sell picker bridge before the final CTA;
  - booking step 1 gets a small “Не впевнені, що обрати? Підбір за 30 сек” hint only while no product is selected/preselected;
  - Puzzi landing is intentionally unchanged because it already contains two contextual picker entries.
- Shared footer now uses `Підбір за 30 сек`, removing the remaining old `Підбір рішення` shell label.
- Mobile fixed CTA is lighter:
  - booking is the clear primary action (~72% width);
  - Instagram is a smaller supporting action;
  - height reduced to 50 px;
  - bar appears only after the first hero has been passed instead of covering the first screen.

## Hydration / persistence
- Home multi-task picker copy and target are persisted in server HTML and the hydrated home React chunk.
- `/rishennia/` picker copy/target is persisted in static HTML and RSC payloads.
- Shared shell footer naming is normalized by `sync-static-copy.mjs` so repeated `npm run stamp` cannot restore the old label.
- `site-v400.js` MutationObserver re-establishes contextual picker bridges if React re-renders an owned section.
- `check-build.mjs` now guards the v4.0.64 trust, picker, sticky-CTA and hydration contracts.

## QA
- `npm run stamp` twice: PASS
- `npm run check`: 319 file checks PASS
- `npm run test:package-language`: PASS
- `npm run test:public-visual-contract`: 191/191 PASS
- `npm run test:booking-cta`: 14/14 PASS
- `npm run test:stabilization`: 171 assertions PASS
- `npm run test:smart-guide-logic`: PASS
- `npm run test:deposit-policy`: PASS
- `npm run test:process-metadata`: PASS
- `npm run test:public-seo`: 295/295 PASS
- `npm run build`: PASS, Pages artifact 205 files
- Targeted Chromium visual/DOM QA via static set-content harness: PASS for reviews proof, delayed mobile CTA, home picker helper, home package picker bridge, `/komplekty/` picker bridge, booking picker hint and solution-page picker bridge.
- `/komplekty/` final spacing check: 50 px between final package cards and the picker bridge at 1440 px.

## Scope
No rental prices, deposit rules, finance logic, booking status workflow, admin business logic, Supabase schema/functions, or VA HOME resources were changed.
