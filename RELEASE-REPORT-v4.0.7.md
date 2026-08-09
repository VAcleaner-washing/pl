# VAcleaner v4.0.7 — HEADER PARITY & REAL UX FIX

Release date: 2026-08-09  
Build: 4007

## Scope

No redesign. This release fixes public-header inconsistencies that survived previous audits and adds regression coverage so they cannot silently return.

## Concrete defects found and fixed

1. **Desktop hamburger leaked into `/pidbir/` and `/bronuvannia/`.**
   `public-fixes.css` used `.site-header button { display:inline-flex }`, which overrode the base desktop `display:none` for `.menu-button`. The fourth grid child created an implicit second row, pushing logo/nav/booking CTA to the top of the 76px header. The rule now preserves the component's native display mode.

2. **`/pidbir/` hid the global header entirely.**
   Standalone Smart Guide CSS previously used `display:none` on `.site-header`. The Smart Guide now starts below the same global header used everywhere else. Desktop layer begins below 76px header; mobile below 68px header.

3. **Home React chunk still contained legacy `Процес / FAQ`.**
   Static HTML had the new `Відгуки / Підбір`, but the hydrated home component could restore old labels. The actual home React chunk is patched to the current nav.

4. **`site-v400.js` rebuilt navigation after first paint.**
   Post-load `innerHTML` rewrites were removed. Static HTML and React are now the source of truth, eliminating a second visual mutation pass.

5. **React mobile menu was double-bound.**
   React pages already own hamburger state, while `site-v400.js` also added a click listener. The fallback handler now runs only on non-Next standalone pages.

6. **Navigation dead zone at 861–1180px.**
   Base CSS hid desktop nav at <=1180px but only showed hamburger at <=860px. New behavior:
   - >1180: full desktop nav;
   - 961–1180: compact desktop nav;
   - 621–960: logo + booking CTA + hamburger in one row;
   - <=620: logo + hamburger, booking CTA hidden as before.

7. **621–860px header had 3 children in a 2-column grid.**
   CTA + burger + logo could create a second implicit grid row. This range now explicitly uses a three-column header.

8. **Home header geometry differed from inner pages.**
   Desktop home header was 72px vs 76px elsewhere, and home nav text was 12px vs 13px. Desktop header is now 76px everywhere; nav typography uses the same breakpoint contract everywhere.

## Geometry verification

Actual computed `getBoundingClientRect()` checks were run on `/`, `/pidbir/`, `/rishennia/`, and `/bronuvannia/` at representative widths including 1440, 1180, 1024, 960, 860, 768, 620 and 390px.

Verified after fixes:
- same header height per breakpoint;
- same logo Y/height;
- same booking CTA Y/height when visible;
- same nav Y/height and typography contract;
- same hamburger Y/size when visible;
- no implicit second grid row;
- no 861–1180 navigation gap.

## Automated regression

New `scripts/test-public-header-parity.mjs` verifies:
- canonical 5-item nav on every public page;
- canonical booking CTA;
- no desktop hamburger display leak from `public-fixes.css`;
- `/pidbir/` keeps the global header;
- compact/tablet breakpoint contracts exist;
- `site-v400.js` does not rewrite nav after paint;
- no double-binding of React mobile menu;
- home React header contains no legacy `Процес / FAQ` labels.

Result: **51/51 PASS**.

## Existing QA

- Build: **288 file checks PASS**
- Rental/deposit/slot policy: **46 PASS**
- Finance: **23 PASS**
- Stabilization: **159 PASS**
- Rental extension: **10 PASS**
- Public booking +1 day default: **9 PASS**
- CSS architecture: **PASS** (specificity budget unchanged)
- Desktop density guard: **PASS**
- PWA QA: **551/551 PASS**
- Glass primary QA: **320 / 390 / 430 PASS**

`final_desktop_visual_qa.py` could not complete because the local Playwright driver terminated with environment-level `EPIPE`. No PASS is claimed for that runner. Public header geometry was independently verified with targeted browser-computed measurements as described above.

## Backend / business logic

No booking finance, deposit snapshot, promo, campaign, Supabase, push, or rental-extension business logic was changed in this release.
