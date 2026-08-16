# VAcleaner v4.0.81 — SMS CAMPAIGN UX DESKTOP + MOBILE POLISH

Released: 2026-08-16  
Build: 4081

## Scope

UX-only pass for the SendPulse campaign modal on desktop and mobile. SMS provider transport, campaign rules, promo linking and backend send logic are unchanged from v4.0.80.

## UX changes

- Recipient selection is the primary working area on both desktop and mobile.
- Desktop modal is wider with compact header/footer chrome and a larger practical recipient viewport.
- Mobile modal uses nearly the full viewport with tighter header, metrics and controls.
- Audience counters are more compact while keeping the same four signals.
- Selected recipient count is visible beside the section title.
- `Вибрати доступних` becomes `Зняти вибір` once all selectable recipients are checked.
- Recipient metadata wraps cleanly instead of truncating the whole line; name, rental count, phone, last rental and dormant days remain readable.
- SMS journal is now a collapsed secondary section by default, so it no longer competes with recipient selection.
- Journal labels humanize internal segment values such as `all` to `Уся база` (or show the current campaign name when applicable).
- Footer actions remain in one stable row on mobile; primary send action gets more space than cancel.
- Internal recipient list remains the dedicated scroll owner.

## Safety

No Supabase/SendPulse backend logic changed in this release. No SMS was sent during this UX work.

## QA

- Build checks: 336/336 PASS
- SMS regression: 61/61 PASS
- PWA static: 82/82 PASS
- PWA browser visual/interaction QA: 720/720 PASS
- CSS architecture: PASS, specificity budget remains at 5 `!important` declarations
- Pages build: PASS

## Release hygiene

- Cache/build stamp: 4081
- No stale `?v=4080`, `PWA_BUILD=4080`, or `vacleaner-manager-4080` references in release source.
- Generated test/build artifacts are excluded from the ZIP.
