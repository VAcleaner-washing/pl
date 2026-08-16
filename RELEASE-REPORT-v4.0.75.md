# VAcleaner v4.0.75 — SENDPULSE PREFLIGHT DIAGNOSTICS

Released: 2026-08-16
Build: 4075

## Root cause
- Two attempted personalized RETURN SMS dispatches were rejected by SendPulse before a campaign was created.
- Both attempts used the international route for 18 recipients and ended with HTTP 422.
- The previous Edge Function stored only `sendpulse_http_422`, so the provider's actual response text was lost and the admin UI could only show a generic error.
- No successful SMS delivery/submission was recorded from those attempts.

## Changes
- Added SendPulse balance to SMS status data and the admin modal.
- Added `sms_preflight`: the first send click validates the exact campaign with SendPulse in test/emulation mode before any real SMS send.
- Personalized RETURN preflight creates a temporary address book with per-recipient `PromoLink` variables, tests the campaign, then removes the temporary address book.
- Generic SMS preflight tests the direct SMS payload in emulation mode.
- SendPulse non-2xx response details are now preserved and surfaced in the admin UI instead of being reduced to a generic HTTP code.
- Real SMS sending is a separate second confirmation only after a successful preflight.
- Any change to recipients, message, or route invalidates the previous preflight confirmation.
- Production `vacleaner-campaigns-v1` deployed as version 10.

## Verified
- `npm run check` — 333/333 PASS
- `npm run test:sms-campaigns` — 50/50 PASS
- `npm run test:pwa-static` — 82/82 PASS
- `npm run test:pwa` — 699/699 PASS
- `npm run test:public-booking` — PASS
- `npm run build` — PASS
- Production SMS state after backend deployment: 0 submitted/sent dispatches; 2 historical failed dispatches; 0 recipient sent/delivered states.

## Not verified / intentional limits
- No real paid SMS was sent during QA or deployment.
- The exact historical reason for the previous HTTP 422 cannot be recovered because the old backend discarded SendPulse's response body. After this release is deployed, the new preflight will show the exact provider message if the payload is rejected again.
- The broad local legacy E2E suite cannot open `127.0.0.1` in this environment (`ERR_BLOCKED_BY_ADMINISTRATOR`); focused browser/PWA QA passed as listed above.
