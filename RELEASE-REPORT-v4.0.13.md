# VAcleaner v4.0.13 — DESKTOP CLIENT DOCUMENT VISUAL FIX

## Scope
Desktop visual correction for the private-document preview inside the client card. Based only on v4.0.12.

## Root cause
When an image preview failed, `img.onerror` added `preview-unavailable` and hid the image, but desktop CSS kept `.document-private-badge` absolutely positioned over the image area. With the image gone, the badge overlapped the filename/description and the anchor inherited browser-like text-link styling.

## Changes
- Desktop `preview-unavailable` state now uses normal document flow.
- `Приватний документ` badge sits above the content instead of overlapping it.
- Filename and fallback message keep their own readable column.
- `Відкрити фото` is a deliberate 44px action button on desktop, without browser underline.
- Mobile rules and document upload/storage logic are unchanged.
- Added regression assertions to Glass V4 QA for desktop fallback geometry at 1440/1280/1024.

## QA
- Static build check: 296 PASS.
- Rental/deposit/slot policy: 46 PASS.
- Finance: 23 PASS.
- Stabilization: 159 PASS.
- Session: 4 PASS.
- Rental extension: 10 PASS.
- Public booking +1 day: 9 PASS.
- Booking step order: PASS (1 → 2 → 3 → 4).
- Header parity: 51/51 PASS.
- CSS architecture: PASS.
- PWA static: 71 PASS.
- PWA browser visual QA: 551/551 PASS.
- Mobile client card: 3/3 PASS.
- Glass V4 regression: PASS at 320/390/430 and desktop 1024/1280/1440/1648; new private-document fallback assertions pass at every desktop width.
- Public visual contract: 144 PASS.
- Smart Guide fit: 20/20 PASS.
- Desktop density: 60/60 PASS.
- Final desktop visual audit: 232/232 PASS.
- Public booking resilience: PASS.
- Full local `test:e2e` could not navigate to local `127.0.0.1` because the environment returned `ERR_BLOCKED_BY_ADMINISTRATOR`; no product-code change was made to bypass that environment restriction.

## Production
Local release only. Production is not considered updated until GitHub Pages deploy succeeds and `https://vacleaner.pp.ua/release.json` reports `4.0.13`.
