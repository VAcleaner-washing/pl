# VAcleaner v4.0.85 — SMS RECIPIENT ROW & COOLDOWN UX FIX

Released: 2026-08-16  
Build: 4085

## Scope

- Restored readable desktop SMS typography after the overly compressed v4.0.84 short-desktop mode.
- Desktop recipient rows now use available horizontal space: client name, rental count, phone, last rental date and dormant days stay on one line; consent badge remains on the right.
- Short desktop (1650×760) keeps a large recipient workspace without spreadsheet-sized text.
- Clients contacted by marketing SMS within the 90-day cooldown are removed from the recipient list instead of remaining as disabled rows.
- The `Пауза 90 днів` KPI still shows how many clients are temporarily excluded.
- Frontend has a defensive cooldown filter; the included `vacleaner-campaigns-v1` source also omits cooldown rows from the audience payload while retaining summary counts.
- SendPulse send/preflight transport, promo logic and booking logic were not changed in this release.

## QA

- `npm run check` — 336/336 PASS
- `npm run test:sms-campaigns` — 69/69 PASS
- `npm run test:css-architecture` — PASS
- `npm run test:pwa-static` — 82/82 PASS
- `python scripts/pwa_visual_qa.py` — 766/766 PASS
- Short desktop 1650×760: recipient capacity ≈8.7 readable rows
- Short desktop: name + rental metadata verified on one horizontal line
- Short desktop: 90-day cooldown client verified absent from the list and present only in the cooldown KPI
- `npm run build` — PASS

## Production note

No SMS was sent by this release work. The live SendPulse transport remains `vacleaner-sms-v2`. The production `vacleaner-campaigns-v1` Edge Function was not redeployed as part of this UI pass; the frontend filter already enforces the requested list behavior, and the backend send validation continues to block cooldown recipients.
