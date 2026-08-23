# VAcleaner v4.1.22 / build 4122

## Scope
PWA resume/data-recovery hotfix for the admin app, especially the mobile **Найближчі** view.

## Production evidence behind the fix
- At the time of the reported empty PWA screen, the database contained active upcoming work (an issued rental returning 24.08 and a confirmed rental starting 24.08).
- Supabase Edge Function logs around the same time contained **no** `vacleaner-admin-data-v1` / `vacleaner-admin-bookings-v3` calls from the PWA.
- Therefore the empty screen was not a legitimate empty server response: the restored iOS PWA was rendering local empty state without performing a data refresh.

## Root cause
`visibilitychange`, `pageshow` and `focus` recovery handlers were registered only by `startLiveBookingSync()`, and `startLiveBookingSync()` was called only after the initial full `load()` had completed successfully.

If iOS restored a stale PWA snapshot or the first load had previously failed/been interrupted, the admin shell could remain alive without any resume listener capable of triggering a new server request.

## Fix
- Added `state.bookingsLoaded` as an explicit distinction between **real empty data** and **data not loaded yet**.
- Data-dependent admin views no longer render misleading zero/empty states before the first successful server load.
- Added boot-level `installAdminResumeRecovery()` **before** the first `start()` call.
- Resume recovery listens to `pageshow`, `visibilitychange`, `focus`, and `online` even if the first load never completed.
- If initial loading never completed, resume recovery performs the full `load()` (bookings, calendar, clients and campaigns), not only a lightweight booking refresh.
- If the app had already loaded successfully, resume uses a lightweight fresh booking list to avoid unnecessary work.
- Switching to an admin data view while data is still unresolved also triggers recovery.
- If the persisted session is gone, the app shows auth instead of a false `0 / no events` state.
- Live sync no longer silently ignores a missing/expired session while the admin shell is visible.

## Regression coverage
New test: `npm run test:pwa-resume`

It simulates:
1. persisted valid PWA session;
2. first admin data load fails;
3. app remains mounted;
4. an iOS-style `pageshow` occurs after connectivity returns;
5. the app performs a new server request;
6. a real upcoming booking is rendered without a manual Retry or login.

The CI workflow now compiles and executes both dedicated session suites:
- `npm run test:pwa-session`
- `npm run test:pwa-resume`

## Verified results
- `npm run test:pwa-session` — **7/7 PASS**
- `npm run test:pwa-resume` — **9/9 PASS**
- `npm run test:pwa-static` — **82 assertions PASS**
- `npm run test:calendar-live` — **7/7 PASS**
- `npm run test:admin-labels` — **36/36 PASS**
- `npm run test:operational-health` — PASS
- `npm run test:analytics` — PASS
- `npm run check` — **342 file checks PASS**
- `npm run build` — PASS, 205 files

A full `npm run test:pwa` run progressed through the mobile 320/390/430, Safari-tab, tablet, landscape, auth, expense and public-date suites with PASS output, but the complete suite exceeded the execution limit and ended with an EPIPE after timeout. It is intentionally **not** reported as a full PASS.

## Backend
No production Edge Function or database mutation was required for this release. The defect is in the PWA lifecycle/client state recovery.

## Deployment note
Because an installed iOS PWA can keep an already-running JavaScript snapshot alive, after deploying build 4122 the installed PWA should be fully closed once and reopened (or use the in-app **Оновити зараз** prompt) so the new runtime becomes the active page process.

## GitHub Actions
Local relevant CI checks are green. GitHub Actions is not claimed as PASS until this release is committed/pushed and the new run completes.
