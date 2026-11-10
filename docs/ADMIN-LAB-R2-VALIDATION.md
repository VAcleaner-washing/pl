# R2 validation — 4.3.48 / 4348

The stable app remains 4.3.46/4346 at commit `15bf61dc4da4cf63405a25887353e6ec7178dce8`.
R2 includes the unmerged R1 changes and adds a separate synthetic LAB; it does not activate
the experimental UI or adapter in the normal Pages artifact.

## Verified scope

- Chromium LAB: **167/167 passed**, no API routing mocks. WebKit LAB: **167/167 passed**.
- All 10 views at 320/390/430/440/768/1024/1280/1440/1648px; iPhone 17 Pro Max descriptor,
  touch, 3x scale and standalone flag at 440x956, plus 956x440 landscape.
- Local create/rejected save/retry/reload, issue/settlement/reload, closed ledger disclosure,
  compact/full preference, More/cancel confirmation, primary CTA, idle DOM stability,
  zero external/API network requests, worker cache and connection recovery.
- Push is blocked before requesting OS permission. Unsupported operations fail explicitly.
- Chromium uses browser offline mode. Linux WebKit's offline override rejects navigation
  before its worker can respond; its test drops real HTTP connections instead. Physical
  iOS airplane mode, OS keyboard, safe-area insets and background lifecycle are not certified.
- The final LAB modal correction was tested in both complete LAB suites. The canonical
  full run had **93 successful steps and one LAB failure** before that correction; its raw
  failure is retained. All affected LAB checks subsequently passed. This is combined
  full-suite plus focused-fix evidence, not a claim that the earlier invocation was green.
- `npm run check`: System Spec passed and 656 file checks passed. Normal Pages artifact:
  270 files, release 4.3.48/4348, manifest hash prefix `111426aad1e24c3cd88d`, unchanged by
  LAB presentation fixes. `npm run test:admin-lab` isolation/persistence/settlement contracts pass.
- All seven canonical WebKit suites completed successfully across the initial run and
  targeted reruns. One unchanged idle refresh scenario timed out under parallel browser
  load; its full rerun passed 118 checks. Both results are retained in the evidence.
- Stable archive checksum and all 270 files verified and extracted to an isolated restore
  directory. No restoration deployment occurred.
- Canonical catalog/prices, pricing.mjs and settlement.mjs remain byte-identical to stable 46.
  Production main and production release.json were re-read and still point to 46.

## Visual review and additional finding

Screenshots cover all views and critical forms. Review focused on compact/full lists,
financial detail, reachable actions, persistent LAB identity and landscape modal footer.
The previous fixed viewport height ignored the reserved LAB header; a definite remaining
height now keeps the footer within the screen, with the form body scrolling independently.

On the checksum-verified stable46 artifact with synthetic API fixtures at 1440px,
closed `details.booking-action-more` has both an invisible summary and invisible cancel
button. `assets/admin-v250.css` uses desktop display:contents and hides the summary.
LAB exposes More explicitly and reuses the original handlers. This is tracked separately
as VA-AUD-23; production 46 is preserved as requested.

## Limits and release gates

This validates the isolated synthetic app. It does not prove live database transactions,
RLS/auth, availability, delivery geocoding, referral RPCs or dispatch services. No production
customer, booking, finance, schema or integration data was written.

Local Playwright is 1.62.0, repository CI remains pinned to 1.61.0. Local WebKit uses the
official browser with a workspace-only launcher for missing Linux libraries; CI independently
validates its environment. GitHub CI is a separate gate; no merge/deploy is authorized by
this report. The physical installed iPhone and private hosting sign-in still need acceptance.

The managed Sites source helper and browser route are absent in this environment.
Publication uses exact pushed static source, manifest/provenance and an archive; ephemeral
Git access is passed through hidden stdin/environment, never credentials in files or arguments.
Local browser QA validates the same runtime files copied into that private Site.

See `ADMIN-LAB-ROLLOUT.md` and `ADMIN-IMPROVEMENTS-BACKLOG.csv` for remaining work,
staging integration, controlled production cutover and retiring the old served UI while
retaining its recovery archive.
