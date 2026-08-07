# VAcleaner v3.0.45 — DESKTOP SIDEBAR NEW HIDE

Date: 2026-08-07
Build: 3045
Base: v3.0.44

## Change

- Desktop sidebar no longer shows the mobile-only `+ Нове` item.
- Mobile/PWA keeps the centered `+ Нове` action unchanged.
- Desktop topbar `+ Нове бронювання` remains unchanged.
- Fix is intentionally minimal: global selector changed from `.mobile-new-nav{display:none}` to `.nav .mobile-new-nav{display:none}` so it wins over the generic `.nav button{display:flex}` rule; the mobile `<=900px` override still re-enables it.

## Verification

- `npm run check`: PASS — 276 checks.
- `npm run test:stabilization`: PASS — 131 assertions.
- `npm run test:pwa`: PASS — 484 checks.
- `npm run test:desktop-final`: PASS — 232 checks.
- `npm run build`: PASS — 193 files / 4971 KiB.
- Visual desktop verification at 1440 px confirms there is no `+ Нове` item in the left sidebar.

## Backend

No Supabase / Edge Function / database changes.
