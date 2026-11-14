# VAcleaner4.3.61 /4361 — production release execution

Status: **production deployed and live files verified**. Owner explicitly approved merging PR #70 into main and publishing 4.3.61 after the earlier automatic-review rejection. The rejected attempt did not merge; approval preceded the successful mutation.

- PR70: https://github.com/VAcleaner-washing/pl/pull/70
- Final candidate:65ea095436d64b7813ee0dd612234a9ce1df1025.
- Final PR verification: https://github.com/VAcleaner-washing/pl/actions/runs/43602791381
- Stable46 verification-only: https://github.com/VAcleaner-washing/pl/actions/runs/43602791476
- Normal frontend artifact273files, treeSHA256 b53be1c5e112cf70358ce8d575ffd6d88964d1d943ecc189e6acc1696cad76d4.
- Production ZIP SHA25697d5c7145bd4ddb45101ea07bc77b7ec33693d8294dd39e3eb022e4133127145.
- Canonical read-only campaign-reporting handler/helper already deployed productionv19, exactsource readback and3Auth/CORSsmokes pass. Actualv18source preserved for backend rollback.
- Stable46 frontend:270entries, CRCpass, SHA2561d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e;40criticallivefilesmatchedbackupbeforecutover.
- Manual rollback workflow defaultsverify_only; actualrestore requiresmain, exactROLLBACK-4346, successful270-filemanifest andPages environment. No database rollback or provider dispatch.

The final candidate fixes duplicate waiting service workers after a versioned app reload. The older e082/b0b review artifact is superseded. The real worker tests retain actual async readiness, offline/API/Auth-cache boundaries, draft protection, explicit activation and46→61→46Auth preservation. Earlier red runs are preserved; no failing job is counted as success.

Native iPhone behavior is not certified by Linux emulation; older intermittent WPEWebKit failures retain their evidence and unproven cause. No production client/booking/finance mutation, schema migration, new Auth account or message send is part of release execution. Private R4/Site13 remains isolated.

## Actual production verification

- Squash main commit: `76b83bad27c8a61bd9dccd7422d4342fe9633ea1`.
- Main and reviewed PR head have identical Git tree `e65dbb26e4f12b72e6b4825f09aa494695a8ae52`.
- Main workflow [43607449279](https://github.com/VAcleaner-washing/pl/actions/runs/43607449279) actually deployed successfully at 2026-11-14 15:10:02 UTC. Pages environment status success at 15:10:05; deployment ID7789388067.
- All eight jobs passed. Static61/61; canonical Chromium49/49; WebKit9/9; exact production mobile operations21, forms431, public62, startup30 and PWA40 on both engines; desktop operations17/17 each. Actual worker46→61→46 retains Auth/session and draft protection with intercepted test APIs. See main-pipeline-verification.json and .md.
- Deployed artifact `production-pages` ID14119006400 contains the pinned273-file tree. The production ZIP passes CRC and matches all273 candidate files exactly.
- Live release readback 2026-11-14 18:36UTC confirms61/4361. All273URL checks are retained in frontend-after.json: **268 exact same-path bodies; four301redirects to canonical pages with exact candidate bodies; one robots.txt response with a2676-byte Cloudflare-managed prefix and exact69-byte original suffix.** There are no unexplained differences. The strict verifier's original five differences remain visible; do not relabel these as273same-path byte matches. See live-host-routing-verification.json/.md for full proof. Pre-existence of the routing rules was not independently established; no routing configuration was changed.
- All admin files and manifest match. `/admin/sw.js?v=4346` and `?v=4361` both return exact61 worker SHA-256 `0cde3688d865baafb7bd83ba3b2c8776394d1841374d7149a080f4522289fbef`. See live-worker-manifest-verification.json. This confirms the server can update the old retained canonical worker script URL.
- Production entrypoint retains original Supabase yweluzclearwrazdkahu and has no R4 test banner/transport. Backend19 remains compatible with46. No real customers, bookings, finances, SQL schema or provider messages were changed by release execution.
- Stable46 rollback archive and manual verification/restore workflow are retained; no actual production rollback was invoked. Backend18 source backup and private R4/Site13 remain available. Existing limitations above remain explicit: no physical iPhone certification and no positive API request from an existing production manager session.

The 2026-11-13 date in release.json identifies the prepared build; actual publication was 2026-11-14. Release archives and evidence are published at GitHub tag v4.3.61 only after this actual deployment and live verification.
