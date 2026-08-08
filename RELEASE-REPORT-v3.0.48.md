# VAcleaner v3.0.48 — VA HOME KEYBOARD NAV CONTRACT

Release date: 2026-08-08
Build: 3048
Base: v3.0.47

## Scope

This release changes only the mobile/PWA keyboard interaction contract around the bottom navigation.

### Root cause addressed

VAcleaner was still mutating the fixed bottom navigation whenever `html.keyboard-open` was active:

- the sidebar was hidden via keyboard-state CSS;
- the main shell bottom was changed while the keyboard was open;
- the sidebar therefore entered a hide/show/recomposition cycle on every keyboard session.

The working VA HOME admin does not do this. Its mobile navigation remains a normal `position: fixed; bottom: 0` element and is not mutated by keyboard state.

v3.0.48 adopts that proven contract in VAcleaner:

- no `html.keyboard-open .sidebar` rule;
- no `html.keyboard-open .main` rule;
- sidebar remains `position: fixed; bottom: 0` before, during and after keyboard state;
- keyboard-specific viewport sizing remains only for auth/modal surfaces that actually need it.

No root `scrollTo(0,0)` recovery and no compositor `translateZ()` repaint hack were added.

## QA

Completed locally:

- static/build checks: 279 PASS
- rental/deposit/slot policy: 46 PASS
- stabilization contract: 136 PASS
- finance: 19 PASS
- session: 4 PASS
- UX: 17 PASS
- retention/campaign: 15 PASS
- CSS architecture: PASS, 1 `!important`
- operational health contract: PASS
- backend inventory: PASS
- Pages build: 193 files / 4971 KiB
- desktop density: 60/60 PASS
- focused keyboard-nav geometry QA: PASS on 320×720, 390×844, 430×932
  - sidebar fixed before keyboard state
  - sidebar fixed during keyboard state
  - sidebar fixed after keyboard state
  - CSS `bottom: 0px` throughout
  - physical bottom equals viewport bottom after recovery

The full installed-PWA visual suite was started locally but the container execution window terminated before the complete 320/390/430/tablet/landscape matrix finished. The keyboard-specific assertions that changed in this release passed in the completed runs and in the focused three-width regression above. GitHub Actions remains the authoritative full-suite gate after push.

## Backend / data

No Supabase schema, RLS, data, Edge Function, pricing, finance, booking, campaign or VA HOME changes in this release.
