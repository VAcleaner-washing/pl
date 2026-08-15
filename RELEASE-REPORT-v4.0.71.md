# VAcleaner v4.0.71 — SMS CAMPAIGN UI POLISH

Released: 2026-08-15  
Build: 4071

## Scope

Focused visual polish for the SendPulse / `Розбудити клієнтів` modal after v4.0.70 reached production. No Supabase schema, Edge Function, pricing, finance, inventory, booking-slot or SMS-send business logic was changed in this release.

## Root causes fixed

1. SMS section labels reused `.client-section-head small`, a 26×26 icon slot intended for short icons/numbers. Text labels such as `Аудиторія` and `Журнал` therefore overflowed and visually collided with `Одержувачі` / `Останні SMS`.
2. The SMS modal body is the flexible middle row of a full-height modal. Without explicit `align-content:start` / max-content rows, empty sections could visually stretch and make `Останні SMS` look like a large empty panel.
3. Native Windows/Chromium scrollbar chrome remained visible inside the SMS body/list, including arrow buttons, which did not match the VAcleaner PWA visual system.
4. The national SMS action was technically disabled while Sender ID was under moderation, but the generic disabled style still looked too close to an active gold primary action.
5. SendPulse `statusExplain` could duplicate the Ukrainian status with provider text such as `On moderation.`.

## Changes

- Converted SMS section labels into small editorial gold kickers above section titles instead of fixed-size badges.
- Added compact max-content layout to the SMS modal body so empty history does not stretch.
- Reduced SMS section padding and textarea height slightly for better 900px desktop fit.
- Made the empty SMS history state compact.
- Kept SMS body/list scrollable while hiding native scrollbar/arrow chrome.
- Added a dedicated unmistakable disabled appearance for `Надіслати SMS` on an unavailable national route.
- Simplified sender status copy to `VACLEANER · На модерації` without the duplicate English provider phrase.
- Bumped static/PWA cache build to 4071 so clients do not retain the already-deployed 4070 UI.

## Regression protection

- Expanded `test:sms-campaigns` with guards for:
  - non-overlapping SMS section hierarchy;
  - visibly disabled unavailable route action;
  - hidden native SMS scrollbars;
  - no duplicate provider-language moderation copy.
- Expanded PWA visual QA to verify:
  - national send remains disabled while Sender ID is under moderation;
  - no `On moderation` duplicate in the header;
  - `Журнал` never overlaps `Останні SMS`;
  - hidden native scrollbar chrome;
  - compact empty SMS history;
  - no horizontal overflow.

## Verification passed

- `npm run check` — PASS.
- `npm run test:sms-campaigns` — 27/27 PASS.
- `npm run test:pwa-static` — 82/82 PASS.
- Full `scripts/pwa_visual_qa.py` — 683/683 PASS, including the new SMS-modal checks.
- `npm run build` — Pages artifact prepared successfully.

## Environment limitation

The legacy full `npm run test:e2e` still cannot run end-to-end in this local environment because Chromium navigation to `127.0.0.1` is blocked by policy with `ERR_BLOCKED_BY_ADMINISTRATOR`. This occurs before any assertion. The much broader installed-PWA visual suite does run in this environment and passed 683/683.

## Release hygiene

The release ZIP excludes `dist/`, browser/test artifacts, screenshots, `__pycache__`, `.pyc`, editor/OS junk and superseded release reports. Only `RELEASE-REPORT-v4.0.71.md` is included.
