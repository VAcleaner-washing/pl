# VAcleaner v4.0.79 — SENDPULSE PHONE ACTIVATION WAIT FIX

Released: 2026-08-16
Build: 4079

## Fix
- Personalized RETURN SMS no longer fails after ~22 seconds while SendPulse still marks freshly imported contacts as `New`.
- Address-book readiness waits up to ~85 seconds before provider preflight/send.
- For test batches up to 10 recipients, readiness also checks each phone via SendPulse `/sms/numbers/info/{addressBookId}/{phoneNumber}` so delayed aggregate counters do not cause a false failure.
- Rejected phones remain a hard stop; `New` contacts are treated as provider processing rather than immediate failure.

## Verification
- `npm run test:sms-campaigns`: 55/55 PASS
- `npm run check`: 333 file checks PASS
- `npm run build`: PASS (214 files)
- Production `vacleaner-campaigns-v1`: v15 ACTIVE
- Production SMS state after deploy: 0 submitted/sent dispatches; 0 recipients in submitted/sent/delivered/not_delivered states.

No real SMS was sent during release verification.
