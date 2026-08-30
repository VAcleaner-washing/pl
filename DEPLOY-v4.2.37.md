# Deploy — VAcleaner v4.2.37

Version: **4.2.37** · build **4237**.

## Scope
- Admin UX route context: search → booking → client → nested action → exact return.
- Calm desktop hover/focus behavior without layout jumps.
- PWA Settings horizontal-navigation affordance.
- iOS Instagram external launch keeps VAcleaner PWA alive.
- PWA update notice sits above floating navigation and defers during modal/detail/keyboard work.
- Nested client cards expose an explicit Back arrow without adding permanent mobile footer height.

## Pre-commit gates
- `npm run qa:static`
- `npm run test:v4.2.37-route-smoke`
- `npm run test:admin-context-navigation`
- `npm run test:keyboard-nav-focus`
- canonical GitHub Browser QA aggregate after commit

Do not merge/deploy if the canonical GitHub Browser QA aggregate is red.
