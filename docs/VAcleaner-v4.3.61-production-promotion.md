# VAcleaner 4.3.61: production artifact promotion

The normal operations UI is compiled from shared presentation sources by
`build-admin-release-candidate.mjs`. Its output uses the normal `/admin/` routes,
production API and Auth configuration, existing storage keys and worker identity.
There is no R4 banner, adapter, test data transport or reserved banner space.

The Pages workflow keeps two distinct artifacts:

- `github-pages`: the canonical shell used by the existing broad regression,
  public-site, LAB fixture and WebKit suites. Keeping this input separate avoids
  adding the shared presentation layer twice in fixture builders.
- `production-pages`: the reviewed normal operations artifact. Four acceptance
  jobs download this exact archive and exercise Chromium/WebKit at 440/1440px
  with all remote traffic intercepted. The deploy job selects this artifact only
  after static, canonical Chromium/WebKit and all four operations jobs pass.
  Both 440px jobs also run the shipped forms, public hydration and admin startup
  suites against the downloaded production artifact without LAB injection.
  Their worker suite serves real 4.3.46 and candidate worker bytes, checks offline
  loading, updates and rollback on the same isolated origin. The stable reference
  is built from immutable commit `15bf61dc4da4cf63405a25887353e6ec7178dce8`.

`config/admin-production-release.json` pins the full artifact tree hash and file
count independently of ZIP compression metadata. The reviewed ZIP hash is a
separate provenance field. Both the build job and every operations browser job
verify the artifact against the receipt; browser jobs never rebuild it. Changes
to served files or release metadata require a newly reviewed receipt.
The reviewed 4.3.61/4361 release metadata retains its 13 November build date;
the actual production publication date belongs in the operator's release receipt.

Local preparation (no publication):

```sh
npm run qa:static
npm run test:release-candidate
npm run verify:production-artifact
npm run test:production-promotion
```

The source build remains the canonical fixture input; `npm run build` alone is
not the production deployment artifact. Pages explicitly promotes the reviewed
candidate. Deployment is restricted to a successful push to `main`.

**Never publish or install `production-pages` on the private LAB/R4 origin.** It
retains production Auth, API, manifest and worker identities. The private test
site must continue using its separately isolated `/r4/` artifact.

The artifact checks do not certify a physical iPhone PWA, an active administrator
session, or every production history size. Fixture service workers are blocked
to prevent network interception bypass. Existing worker/cache regression gates
and unchanged worker identity remain separate evidence. Backend compatibility,
live release readback and the verified stable 4.3.46 restore artifact must be
confirmed by the release operator before production promotion. Restoring the
frontend does not undo database transactions.
