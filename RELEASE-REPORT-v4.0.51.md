# VAcleaner v4.0.51 — RSC METADATA & CI SYNTAX GUARD

Released: 2026-08-14  
Build: 4051

## Root cause

GitHub Actions v4.0.50 did not fail because the local HTTP server was unavailable. The browser artifact showed that `/bronuvannia/` returned the page, then Next.js crashed during hydration with `Unexpected token '}'` and rendered its built-in `This page couldn’t load` error boundary.

The source was `scripts/harden-public-metadata.mjs`. Its RSC metadata regex used an optional backslash before the closing quote. Because the preceding match was greedy, the backslash from an escaped `\\"` could be consumed, leaving an unescaped `"` inside the outer inline JavaScript string. This corrupted metadata payloads such as `description`, `og:description`, `twitter:description`, title and URL values.

The same latent corruption existed in 13 public HTML pages; `/bronuvannia/` was simply the first route exercised by the browser test.

## Changes

- Replaced the optional-backslash RSC metadata replacement with representation-aware synchronization for:
  - Next inline escaped RSC payloads;
  - plain exported RSC `.txt` payloads.
- Repaired already-corrupted metadata strings during the same hardening pass.
- Synchronized the RSC title node and canonical URL with the rendered HTML metadata.
- Added an inline-JavaScript syntax gate to `scripts/check-build.mjs`.
  - Every inline `<script>` without `src` is compiled before browser QA.
  - JSON/JSON-LD scripts are excluded from JavaScript compilation.
  - A future malformed Next inline payload now fails immediately during `npm run check` with the exact HTML file/script index.
- No booking business logic, Supabase schema, VA HOME data, pricing, deposit rules or PWA navigation logic was changed.
- `google23d85db681a5b7ee.html` remains in the release root.

## QA

- `npm run check` — PASS, 318 file checks.
- Inline JS syntax scan — 134/134 source inline scripts valid.
- Repeated stamp idempotence — PASS:
  - `npm run stamp` executed again on the already-stamped release;
  - `npm run check` remained PASS;
  - inline scripts remained 134/134 valid.
- Static copy integrity — PASS.
- Package language — PASS.
- Delivery settings — PASS, 14 checks.
- Public SEO audit — PASS.
- Backend inventory — PASS.
- Rental/deposit policy — PASS.
- Stabilization — PASS.
- Public visual contract — PASS, 173 checks.
- Retention — PASS, 23 checks.
- Public booking CTA — PASS, 14 checks.
- Processing metadata/push copy — PASS, 29 checks.
- Peer-admin push/analytics layout — PASS, 26 checks.
- Issue payment workflow — PASS, 12 checks.
- Pages artifact build — PASS, 204 files.
- Local HTTP smoke — `/` and `/bronuvannia/` both return HTTP 200; booking fallback contains `.booking-summary`.

## Browser QA limitation

The local execution environment blocks Playwright navigation to `127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR`, so the full browser suite cannot be truthfully marked as locally PASS. The failing GitHub artifact itself was downloaded and inspected; its recorded runtime error was the malformed inline JavaScript fixed in this release. GitHub Actions remains the final browser-level confirmation after upload.

## Production status

Local release only until GitHub Actions completes build + deploy and production `/release.json` reports `4.0.51`.
