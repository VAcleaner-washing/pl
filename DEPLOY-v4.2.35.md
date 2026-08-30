# Deploy — VAcleaner v4.2.35

## Scope

- Compact desktop finance badge geometry.
- Stabilized canonical PWA list-height regression assertion.
- No Supabase migration or Edge Function change in this release.

## Pre-commit gate

1. Work from this local release candidate; do not use `main` as a test workspace.
2. Run targeted finance/PWA tests after the fix.
3. Run full `npm run qa:static` and `npm run qa:browser`.
4. Generate and visually review control screenshots at 320 / 390 / 430 / 768 / 1440 (plus wide desktop where finance geometry is visible).
5. Verify changed-file scope and remove transient test/visual artifacts from the release ZIP.
6. Only one production commit after the complete gate is green.

Version: 4.2.35 · build 4235.
