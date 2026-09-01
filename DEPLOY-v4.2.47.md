# VAcleaner v4.2.47 — deploy

1. Work from the exact latest successful production tree in a release-candidate workspace.
2. Run `npm run hooks:install` once in the real Git checkout to enable the pre-push static gate.
3. Run `npm run qa:full`; do not commit generated QA/build artifacts.
4. Push one clean release commit only after local full QA is green.
5. Accept production only when GitHub `Static / build gate` and `Browser QA aggregate gate` are both green.
6. Confirm deployed `/release.json` reports version `4.2.47`, build `4247`.

The Browser job must download the validated `github-pages` artifact. Any workflow that rebuilds `dist` in Browser QA is a release blocker.

Expected release evidence:

- `npm run qa:static`: 38/38 suites passed.
- `npm run qa:browser`: 33/33 suites passed.
- `npm run verify:artifact`: 236 files, SHA-256 tree digest `7b1c704dcd222d1dce2c`, release `4.2.47/4247`.

`npm run qa:legacy` is an on-demand historical audit and is not part of the normal release gate. Admin MFA is currently not enforced; do not treat this CI release as an MFA restoration.
