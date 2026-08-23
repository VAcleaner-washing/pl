# VAcleaner v4.1.13 / build 4113 — Release report

Release date: 2026-08-23

## Scope

This frontend release continues from the verified `v4.1.12 / build 4112` archive and contains two admin UX changes only: subtle pointer hover illumination across admin controls and a mobile/PWA-specific redesign of the `Динаміка бізнесу` chart. No Supabase Edge Function or production backend deployment is included.

## Changes

### Admin hover feedback

- Added a subtle pointer-only hover illumination for admin buttons and `.btn` links.
- Normal controls use a restrained warm/neutral glow; primary gold, green and danger actions keep their semantic color.
- Hover does not translate, scale or otherwise move the control.
- The effect is wrapped in `@media (hover:hover) and (pointer:fine)`, so touch/PWA taps do not get sticky hover states.

### PWA analytics trend

- Desktop analytics keeps the existing line/area trend chart.
- At `<=700 px`, the trend now uses vertical bars instead of compressing a 720-coordinate line chart into phone width.
- Mobile SVG geometry now has its own 360-wide coordinate system and a shorter 150 px plot, avoiding horizontally squashed dots/geometry.
- Zero-value mobile points are not rendered as visual clutter.
- The old nested `Шкала` card chrome was removed; the range is now a quiet inline label such as `0–800 грн`.
- `За період` and `Пік` remain visible in a simpler two-column summary without nested cards.
- The mobile chart preserves the same underlying daily/monthly analytics values; only presentation changes.

### Release stamp

- Version: `4.1.13`
- Build: `4113`
- Static version/cache references are stamped for build 4113.

## Verification completed

### Static / contract QA

- `npm run check` — PASS, 339 file checks from the clean release archive.
- `npm run test:analytics` — PASS.
- `npm run test:pwa-static` — PASS, 82 assertions.
- `npm run test:css-architecture` — PASS.
- `npm run test:sms-campaigns` — PASS, 82 checks.

### Browser / responsive QA

- `npm run test:analytics-visual` — PASS, 103/103 across 320, 390, 430, 768, 1024, 1280, 1650×760 and 1920 viewports.
- The PWA analytics contract explicitly verifies mobile bars, no mobile line spike, readable scale/date labels and no horizontal overflow.
- Desktop analytics explicitly verifies that the line trend remains present.
- `npm run test:campaign-sms-ux` — PASS, 332/332 across the campaign/SMS responsive viewport matrix.
- `npm run test:desktop-final` — PASS, 319/319.
- Targeted pointer browser check — PASS: hover changes `box-shadow` and `filter` on real admin controls while computed `transform` remains `none`.

## Environment limitations — not counted as PASS

- A full `npm run test:pwa` run did not produce a final suite result before the sandbox execution limit. It is not claimed as PASS. The changed analytics surface is instead covered by the dedicated 8-viewport `test:analytics-visual` suite above.
- No new full localhost E2E result is claimed in this release; the sandbox limitation from the previous release remains relevant for browser runs that require its temporary localhost server.

## GitHub Actions / deployment status

No commit or push was performed from this workspace. Therefore there is no new GitHub Actions run for v4.1.13 to claim as green, and production/live was not updated. A new workflow run must complete successfully after commit/push before deployment is considered verified.

## Backend note

No production Supabase function, database object or VA HOME resource was changed or redeployed.
