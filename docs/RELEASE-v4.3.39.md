# v4.3.39 / build 4339 — rental status guards

The general admin status endpoint previously permitted issue without a recorded deposit and completion without the final settlement workflow. The handler now checks stored paid-or-waived prepayment plus a recorded deposit before issue, and rejects generic completion with a clear instruction to use the existing return workflow.

Already-issued retries remain read-only. Waivers never manufacture a 200 UAH receipt. Existing bookings, settlement amounts, prices, schema and other Edge Functions are unchanged.

Validation includes real TS/deployment-JS handler persistence scenarios, shipped-asset rejection UX, the full static/build and Browser/PWA gates, and screenshot review. Physical iPhone and production mutation tests are not claimed.

Rollout must deploy only the reviewed admin v4 bundle with its existing internal authentication setting, then verify the exported bundle and Pages release. The exact live admin v11 export is archived at rollback/v4338-admin-v11-20261021, commit 1ca61402f57e68ba9f8e91ee0fb002f6620c7192; frontend rollback uses the previous main commit 0a03a77ecd19547343c3e1d2e16ed62f4e002c59. No booking/finance repair is part of this release.
