# P2 — bounded WebKit rollback reproduction

Roadmap: P2 — behavioral regression evidence while preserving complete release gates.

Baseline main is `3c6ef8eaa8e8838ce408d22f4afffa5c91e15499`, production 4.3.67/4367. The owner reports general PWA use seems okay; detailed physical offline/update/cache acceptance was not claimed.

Preserved failed run 44690977306, attempt 1, artifact 14608213659 (ZIP SHA-256 `479456b22e9f33a8c8913fc03fa130844c47cacfa5a044dc0d0afa0a92d7a0d3`) contains successful ready snapshots for 4346 and 4367, with matching worker hashes. The failure occurs on rollback to 4346: complete cache, no missing assets, but controller/active worker remain `activating` at the 30-second deadline. Native root cause remains unproven.

Local Playwright is 1.62.0 and available disk is insufficient for the complete CI image. Use the existing GitHub Actions runtime pinned by digest. This diagnostic branch adds one job, with ten fresh-process executions of the unmodified production worker test. It uses local API fixtures, aborts external page requests, and must perform zero production writes.

Each iteration retains its own result, trace, full log and exit status. Any failure fails the diagnostic job even if later iterations pass. A timeout is a failure and an incomplete ten-run sample. Existing full QA is retained; the QA branch cannot deploy Pages. This is a reproduction experiment, not a release or proof that the historical flake was fixed. Do not merge diagnostic instrumentation merely to publish a GREEN result.

## Reproduced baseline and paired control

Run 45179734198 on `666967a` reproduced the exact activating/complete-cache rollback deadline twice in ten fresh runs (iterations 1 and 8); the diagnostic job failed and retained both failures. The environment blocker is resolved through the exact CI image, not a locally substituted browser.

The next diagnostic alternates ten unmodified executions, ten observed executions and ten timing controls on the same runner. The unmodified group checks whether observation itself affects the failure rate. Observation records controller/statechange/beforeunload events across document reloads. The control defers only controllerchange listener delivery until the controller is activated; existing worker tests, artifacts, deadlines and application bytes remain unchanged. This intentionally changes client event timing in an isolated fixture and is **not release acceptance**. All three modes retain every failure; their combined job fails if any mode fails. This tests the early-reload hypothesis without changing production PWA code. No native cause is asserted before inspecting the results.
