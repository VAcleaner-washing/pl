# VAcleaner4.3.63 / build4363

The public booking step now starts with neither pickup nor delivery selected, matching React's existing explicit-choice state. The first tap selects exactly one method. Delivery retains address validation; pickup advances without an address.

Regression also found that initialization autosave could overwrite an existing saved draft before delayed restoration. The stored snapshot now survives that interval, and current trusted edits cancel older deferred replay. Reload checks cover product, dates, pickup/delivery, contact, comment, delivery address and address detail. Schema2, one-hour TTL and explicit URL preset priority are preserved. Existing saved pickup intent cannot be inferred retrospectively; drafts are not migrated or deleted.

## Deployed identity

- Production: https://vacleaner.pp.ua/
- Release4.3.63/build4363, plain release.json verified at2026-11-16T20:47:34.110066+00:00.
- Main commit: e76f8a133032eb09ac739d12b49711729101e0a7.
- Git treefaca1d8d91fca4bb1104fbb138d68e47de56d57d is identical to reviewed PR72 head1535dd8e26269112385955ea2546ee88ea20a163.
- Production workflow: https://github.com/VAcleaner-washing/pl/actions/runs/43948184720.
-273-file normal production tree SHA256: b352e02782f86b9f650ea484a518f0fd5cc247e2ef24a98b244ef84089a18ece.
- Production ZIP SHA256: a87cce96a494eea0c8c2fee65cbcd91ff059c8653dd1e81e6118128a2eccf45f.

## Validation and limits

The reviewed PR passed all7required jobs. Production's final effective8jobs, including actual Pages deployment, passed on the same source/artifact. Static67/67; canonical Chromium49/49 suites; WebKit9/9 suites; all4 exact-artifact operational jobs. Public hydration63/63 and mobile worker40/40 in both engines. Function timing9/9; candidate boundary19/19; promotion guards7/7. Retained62 fails the new initial-selection checks.

The first production attempt's two WebKit failures are retained in main-pipeline-verification.json. The operational job completed all selection/reload assertions but reported a separate access-control page error; another WebKit job passed its public63/63 and then raised TargetClosedError during LAB settings interaction. Causes are unproven. Exactly one controlled failed-jobs retry used unchanged source, artifacts, assertions and timeouts; successful jobs were reused. No errors were filtered and no checks were removed. The earlier request while the workflow was still active was rejected and started no retry.

Read-only full live verification checked273artifact paths: 268same-path byte matches, 5documented hosting transformations, 0unexplained differences. Focused public verification confirms neutral initial choices and reviewed HTML/JavaScript bytes. Old46,61,62 and current63 worker URLs, the manifest and canonical admin identity were checked separately. No authenticated business records were opened and no business-data request or write was made in live verification.

Browser testing uses intercepted fixtures. Linux Chromium/WebKit emulation does not certify physical iPhone keyboard, VoiceOver, OS suspension or native Safari behavior. Financial rules, availability, discounts, statuses, backend payloads and the original production Supabase remain as before. No backend deployment is included. Owner-required two-finger zoom blocking is retained. The PWA Back-button consistency request is a separate next update and is not included in63.

## Recovery

- Immediate previous4.3.62 production ZIP: SHA25673430f9009c66528bcce3d6dacfb8c58526c718f7174c7b0193c433909d47852.
- Stable4.3.46 Pages ZIP: SHA2561d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e; full frozen270-file manifest checked. The existing manual rollback4346 workflow and its explicit confirmation remain available.
- Older4.3.61 recovery remains in the4.3.62 GitHub release. Recovery archives were not modified or deployed by this publication.
- SHA256SUMS.txt covers all published payloads. The isolated archive-publishing workflow compares the actual successful main deployment artifact with this ZIP, verifies all9uploaded digests before publication, and has no Pages deployment permission.

The working PWA can activate this release through its normal update prompt. Public booking pages receive the new export on reload.
