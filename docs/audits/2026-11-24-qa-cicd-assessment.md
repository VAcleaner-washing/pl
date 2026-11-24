# QA & CI/CD Assessment — 2026-11-24

Historical measurements/contracts remain in [CI diagnostics](../CI-DIAGNOSTICS.md) and [selective validation](../CI-SELECTIVE-VALIDATION.md). This is P1 inventory/P0 evidence, no test/workflow changes.

## Current main and deployment

Main `68c274f49690e9844c468ef46e68cb78c70584ce`, [run45373663445](https://github.com/VAcleaner-washing/pl/actions/runs/45373663445), attempt1, all nine jobs success:

| Job | UTC interval | Duration |
| --- | --- | --- |
| Classification |10:19:22–10:19:29|7s|
| Static/build |10:19:32–10:20:02|30s|
| Browser aggregate |10:20:06–10:32:42|12m36s|
| Operations Chromium440 |10:20:05–10:24:21|4m16s|
| Operations WebKit440 |10:20:05–10:25:24|5m19s|
| Operations Chromium1440 |10:20:06–10:21:35|1m29s|
| Operations WebKit1440 |10:20:05–10:21:48|1m43s|
| WebKit/mobile |10:32:46–10:44:17|11m31s|
| Pages deploy |10:44:23–10:44:34|11s|

Workflow span10:19:19–10:44:35 =25m16s, not sum of parallel jobs. Against documented baseline45238142446 (34m22s), this single full-run observation is26.48% shorter (`1-1516/2062`), not a general speedup or three-run median. Browser12m36s versus22m10s is43.16% shorter in this observation; variable provisioning limits causal attribution. Preserve #93 main first failure45367294251 and #94 transition correction; later GREEN does not erase failure.

Downloaded production-pages artifact14909892158 from this exact run: ZIP SHA256 `89ebf687e6469d71d011377e52a03b2b2ba924fab739ab5e76358235d81bb998` matches Actions metadata. Tar has273 files, all equal to the locally reproduced normal candidate. Tree digest `4109bb6e7124ea3cad9a67e60e710574d893a9d39a8ac482f53ed36963139063` matches receipt. Historical receipt ZIP identity is not used as the current GitHub ZIP hash.

Independent HTTP readback2026-11-24 19:50:40 UTC:273 paths via curl,268 exact byte matches,4 alias redirects,1 managed robots prefix with exact artifact suffix; zero unexplained same-path differences. `/release.json` matches4.3.69/4369. Manifest and deployed worker match promoted artifact, including operations assets. HTTP does not prove a particular device's installed worker. Initial urllib batch received272 HTTP403s and a robots variation; curl obtained valid responses without server changes. Failed probes are retained as client/environment evidence, not proven outage.

## Verification boundaries

| Layer | Result | Meaning |
| --- | --- | --- |
| Self-review |Performed|Scope, changed files, contracts and links; not independent review|
| Independent review |Not obtained|Original #95 review API empty; no fabricated team sign-off|
| Local canonical static |70/70 groups pass,19:48:48–19:49:13 UTC|Stamp +68 static suites +build. Runner's FULL QA GREEN string in static mode does not certify browser/device/production|
| Initial sandbox run |Blocked check with spawnSync python EPERM; nested Node EPERM|Authorized subprocess execution passed same checks; no assertions edited|
| Diagnostics |68 static/52 browser; missing scripts0; identical commands0|Potential repeated session recovery is review lead only|
| Deterministic fixtures |Selective CI; CI pipeline35/35; runtime Python6; diagnostic/timing/scope/classifier checks|Failure predicates, not real pinned browser startup|
| Normal artifact |273 files/tree pin pass|Candidate/promotion checks separate from publication|
| Local full browser |Not run|Installed Playwright1.62.0 differs from required1.65.1; no installs allowed; exact-main CI used pinned runtime|
| Production integration |Metadata-only|No booking/payment/client/equipment writes or real notification sends|
| Physical device |Unavailable|Existing iPhone checklist remains required|

## Coverage and feedback

Booking/finance/deposit/discount/status/customer/referral/delivery/auth/PWA/artifact/operational UI coverage already exists in Node/Python. Controlled browser fixtures do not certify live persistence/concurrency. SQL smoke and #84 exist, but isolated multi-connection races/duplicate additions need separate evidence; no production execution even for rollback-only fixtures.

Registry/runner owns canonical membership. Separate WebKit and four operations variants consume validated artifacts; operations additionally exercises stable46 worker migration/rollback. No rebuild before deploy. cancel-in-progress:false preserves acceptance evidence but can consume time on superseded heads; run grouping alone cannot establish waste. Docs-only classifier is fail-closed with paginated complete changed-file list. Root AGENTS/CLAUDE in #95 require full QA despite documentation-only behavior.

Source-string assertions remain: `test-v4-3-21-booking-detail-reference.mjs` checks renderer hooks via includes. Some are valid architectural guards. Age/string usage alone does not prove staleness; replace only with equivalent behavioral and negative cases tied to a demonstrated false failure. Browser/server pricing/deposit mirrors require equivalence before extraction. Standalone session recovery and registry membership need setup/assertion comparison before removal.

Branch API reports main unprotected/no required contexts; effective rulesets not assessed. YAML deployment conditions protect deployment, repository enforcement is separate G03. CWV field data, alert delivery and GA4 receipt remain unverified. Targets/acceptance are in [Gap Analysis](2026-11-24-gap-analysis.md).
