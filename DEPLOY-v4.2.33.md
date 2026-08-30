# Deploy — VAcleaner v4.2.33

1. Create/use QA branch from the latest successful production commit.
2. Upload the complete v4.2.33 source tree.
3. Run canonical GitHub Static / build gate.
4. Run canonical GitHub Browser QA aggregate gate.
5. Do not merge if any browser/PWA suite fails.
6. After FULL GREEN, squash to one release commit and merge to `main`.
7. Verify GitHub Pages deploy and open the admin client card at 1440/1648 desktop plus booking list at 320/390 PWA widths.

No new Supabase migration or Edge Function deploy is required for v4.2.33; this release changes admin frontend geometry/tests/spec only.
