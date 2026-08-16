# VAcleaner Release Report — v4.0.91 / build 4091

## Scope
Step 2 SMS readability follow-up after user review of v4.0.90.

## What changed
- Increased typography in SMS Step 2 where the layout had spare horizontal and vertical space.
- Enlarged the main message textarea copy for better desktop readability.
- Increased helper/meta text below the textarea.
- Increased “Приклад SMS” label and preview text.
- Increased route-picker title/body text and inline route note.
- Preserved compact modal header, stepper and footer; no workflow or backend logic changes.

## Verified
- `npm run check` — PASS (336 file checks)
- `node scripts/test-sms-campaigns.mjs` — PASS (69 assertions)
- `node scripts/test-pwa.mjs` — PASS (82 assertions)
- `node scripts/test-final-desktop.mjs` — PASS
- Browser QA for SMS Step 2 on 1024×768, 1280×900, 1650×760, 1920×1080 — checked visually after the CSS change.

## Targeted typography result
- 1024×768: textarea 14.5 px, meta 11 px, preview 13.5 px, route title 14 px.
- 1280+ wide desktop: textarea 15 px, meta 11.5 px, preview 14 px, route title 14.5 px.

## Notes
- This package only contains the static frontend release.
- Backend / Supabase functions were not redeployed.
- Production was not updated by packaging this ZIP alone.
