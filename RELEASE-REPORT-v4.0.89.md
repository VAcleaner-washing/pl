# VAcleaner v4.0.89 — CAMPAIGNS 1024 RESPONSIVE CI FIX

Released: 2026-08-16
Build: 4089

## Root cause

The Campaigns redesign kept the wide desktop campaign row (`campaign identity + three metrics + SMS/Codes/More`) down to a 901 px viewport. At 1024 px the persistent admin sidebar leaves a much narrower content column, so those minimum grid widths no longer fit. `details.campaign-more` was pushed beyond the viewport (`right ≈ 1037 px`), and the existing final desktop visual QA correctly failed both horizontal-overflow assertions.

## What changed

- Existing QA thresholds and overflow checks remain unchanged.
- Added a medium-desktop responsive layout for 901–1180 px.
- Campaign row becomes a deliberate two-tier layout at those widths:
  - top: campaign identity + `SMS / Коди / •••`;
  - bottom: conversion / revenue / discounts across the full row width.
- Wide desktop keeps the compact single-row layout.
- Mobile keeps the existing stacked card layout.
- No campaign business rules, SMS/SendPulse flow, promo codes, cooldown logic, booking logic, Supabase schema, or backend functions changed.

## Verification

- `npm run check`: PASS — 337 file checks.
- `npm run test:sms-campaigns`: PASS — 69/69.
- `npm run test:pwa-static`: PASS — 82 assertions.
- `npm run test:css-architecture`: PASS.
- `npm run test:desktop-final`: PASS — 232/232 after final stamp.
  - 1024 Campaigns page/main horizontal overflow: PASS.
  - 1024 Campaigns visible-element viewport containment: PASS.
- `npm run build`: PASS — Pages artifact prepared successfully.
- 1024 Campaigns browser screenshot reviewed: actions remain inside the campaign card and metrics use the second tier without clipping.
