# VAcleaner Release Report — v4.0.92 / build 4092

## Scope
SMS Journal UX/readability follow-up after review of the live Journal screen.

## Root cause
The Journal was technically a separate panel, but it still inherited the workflow stepper and an empty workflow footer. It also had legacy high-specificity `#smsHistory` rules that overrode newer readability CSS, leaving dispatch titles, metadata and refresh actions too small on desktop.

## Changes
- Journal mode now hides the irrelevant 1–2–3 workflow stepper.
- Journal mode hides the empty workflow footer.
- Removed double list padding from the legacy `#smsHistory` layout so rows align with the Journal heading.
- Raised desktop dispatch title to 14.5–15 px depending on short/wide desktop.
- Raised desktop metadata to 11–11.5 px, status badges to 10.5 px and Refresh action to 12–12.5 px.
- Increased row height/spacing while retaining seven dispatches comfortably on short desktop.
- Kept a dedicated responsive mobile hierarchy without horizontal overflow.
- Added SMS regression assertions for the Journal-specific workspace state and readability contract.
- No SMS transport, audience, promo, SendPulse or Supabase backend logic changed.

## Verification
- `npm run check` — PASS after QA artifacts were removed from the release tree.
- `node scripts/test-sms-campaigns.mjs` — 71/71 PASS.
- `node scripts/test-pwa.mjs` — 82 assertions PASS.
- `node scripts/test-final-desktop.mjs` — PASS.
- Final desktop visual suite (same assertions, screenshots disabled for execution speed): 235/235 PASS across 1024 / 1280 / 1440.
- Targeted Journal browser matrix with 7 dispatch records: 320 / 390 / 430 / 768 / 1024 / 1280 / 1650×760 / 1920 — no horizontal overflow; stepper and workflow footer are absent in Journal mode.

## Release hygiene
- v4.0.92 / build 4092 stamped after the final CSS/JS changes.
- No backend deployment performed.
- ZIP excludes QA screenshots/results, dist, __pycache__ and Python bytecode.
