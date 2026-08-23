# VAcleaner v4.1.08 / build 4108

## Scope

- `/rishennia/steam/`: `Kärcher SC 2 Deluxe` in the equipment list is a server-rendered link to `/tekhnika/karcher-sc-2-deluxe/`.
- `/rishennia/windows/`: `Робот для вікон · ABIR WD8` is a server-rendered link to `/tekhnika/robot-dlia-vikon-abir/`.
- Removed duplicated `Робот для вікон Робот для вікон · ABIR WD8` copy from the exported page/RSC payload.
- Added a runtime safety bridge so client-side transitions preserve the equipment links.
- PWA Analytics mobile trend chart no longer squeezes desktop Y-axis labels into a phone viewport.
- On `<=700px`, the plot uses full width with four sparse date labels and a separate `Шкала 0–…` summary; revenue/rental Y labels stay outside the plot.
- Desktop analytics retains full Y-axis values and integer rental ticks.

## QA

- `npm run check`: 342 file checks PASS.
- `npm run test:analytics`: PASS.
- `npm run test:analytics-visual`: 89/89 PASS across 320, 390, 430, 768, 1024, 1280, 1650×760 and 1920.
- `npm run test:public-visual-contract`: 205/205 PASS.
- `npm run test:growth-visual`: 133/133 PASS, including visible product links at 390 and 1280.
- `npm run test:public-seo`: 321/321 PASS.
- `npm run test:pwa-static`: 82/82 PASS.
- `npm run test:desktop-final`: 319/319 PASS.
- Full `npm run test:pwa` produced no failing assertion in the captured run but exceeded the local execution window before a final summary; this report does not claim the full suite completed.

## Backend

No Supabase schema, policies, VA HOME resources or Edge Functions changed in this release.
