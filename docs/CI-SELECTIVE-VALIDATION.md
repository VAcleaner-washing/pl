# P2 selective CI — docs-only validation

This documentation-only change exercises the selective PR CI policy introduced in PR #88. It does not change application behavior, tests, deployment configuration, or product contracts.

Expected PR checks: change classification succeeds; expensive static/build, browser aggregate, WebKit, and production operations jobs are skipped only because the entire diff consists of an ordinary Markdown file under `docs/`.

Expected main/release checks: the complete static/build, browser, WebKit, production operations and deployment gates remain mandatory on a main push. This validation PR is intentionally Draft and must not be merged merely to demonstrate the skip path.

Record actual GitHub Actions job outcomes and wall-clock duration before concluding that the optimization is verified. If classification fails or a full job unexpectedly runs, investigate before changing the policy.
