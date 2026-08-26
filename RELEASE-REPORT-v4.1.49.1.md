# VAcleaner v4.1.49.1 — CI Browser QA Hotfix

## Why
GitHub Actions v4.1.49 correctly exposed three browser-suite failures after the aggregate gate was introduced. All three were CI fixture/test drift, not production feature regressions:

- mobile E2E attempted to click the hidden `puzzi_jimmy` catalogue button before selecting a Smart Entry task;
- PWA visual QA mocked `vacleaner-admin-bookings-v3`, while production admin now uses `vacleaner-admin-bookings-v4`;
- Glass V4 reuses the same PWA fixture, so its calendar received no mocked days/slots.

## Fixes
- Mobile booking smoke now selects the visible `mattress` Smart Entry task before interacting with Puzzi + Jimmy.
- PWA/browser QA mock accepts the current `vacleaner-admin-bookings-v4` gateway while retaining legacy fixture compatibility.
- v4.1.49 static CI contract now guards both failure modes so they cannot silently return.
- No production booking, PWA, admin, delivery, finance, RETURN, campaign or Supabase business logic changed.
