# v4.3.38 / 4338 — PWA session recovery candidate

Production baseline: `8f11ba5aa0349f690ae138a8d19756387ee4a00f`, v4.3.37 / build 4337. This document describes the candidate; it does not claim a production rollout.

## Confirmed failures and change

Three failures were reproduced against the original request code with isolated HTTP fixtures: a delayed 401 rotated an already refreshed token again; terminal refresh rejection with HTTP 400 missed the existing sign-in path; a pending refresh could overwrite logout or a new sign-in. The original four-scenario diagnostic failed three cases and passed temporary-outage preservation.

The candidate keeps existing session storage and Web Locks. A shared authenticated request helper refreshes known expired/near-expiry tokens before protected requests, carries the rejected access token through bounded 401 recovery, and is reused by settings, private documents, push and the prepayment-waiver adapter. Temporary auth outages preserve the session and retry UI. Refresh results cannot overwrite a changed session. Network failures and non-401 responses never automatically replay mutations.

No booking, pricing, deposit, settlement, discount, inventory or SMS business rules change. No Supabase function deployment, migration, auth configuration change, production test booking or finance write is included. VA HOME is outside the change.

## Reminder audit

The 503 at **19 October 2026, 19:00:13 UTC / 22:00:13 Kyiv** carried `SUPABASE_EDGE_RUNTIME_SERVICE_DEGRADED` and took 8 ms. Adjacent scheduled requests at 18:59 and 19:01 UTC returned 200. The minute schedule is active; the inspected 24-hour cron job history had 1,440 successful scheduler executions. Scheduler success is distinct from HTTP success: the function-edge logs contained the isolated 503.

Live reminder v9 differs from the repository in notification labels/aliases, so the full files are not identical. The dispatch helper and retry behavior were inspected on both. Five isolated scenarios passed on each: concurrent dispatch, already-delivered fallback, failed-send retry, thrown provider failure and independent issue/return keys. Read-only PostgreSQL inspection confirmed the atomic lease and delivered-event predicates in the active claim/finish functions. No live push or SMS was sent for this audit.

Delivery acknowledgements are event-wide after at least one provider send succeeds; this audit does not claim per-device exactly-once delivery. No reminder runtime change is warranted by the observed platform failure.

## Verification and rollout

- `npm run test:auth-refresh`: original single-flight guard plus 28 real-code session/adapter recovery scenarios and five reminder-dispatch scenarios.
- `npm run qa:static`: canonical static, finance, booking, backend, version and artifact checks.
- `npm run qa:browser`: all canonical suites plus actual shipped-asset session recovery at 320/390/430/768/1440 px, including real sign-in/retry UI and screenshots. Auth/API I/O is intercepted in an isolated browser context.
- Browser screenshots must be reviewed and the exact PR head must pass CI before merge. Physical iPhone and authenticated production CRUD are not claimed.

Only the approved frontend candidate may be merged/deployed after the gates pass. Postdeployment checks must confirm release 4.3.38/4338, asset/cache parity and public/admin loading. Rollback is a reviewed revert to the v4.3.37 frontend; no database repair or Edge Function rollback is needed for this candidate.
