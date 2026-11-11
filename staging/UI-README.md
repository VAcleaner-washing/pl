# R4 hosted UI candidate 4.3.55 / 4355

The separate stage artifact is mounted at `/r4/` on the existing owner-private
Site. It must not replace the root LAB54 artifact or production46. Only public
client configuration is checked in. Reuse project `jdthhqxzfpvosfdxwfem`; do not
create another Supabase project, copy real rows or restore a production backup.

```sh
npm run build
npm run build:staging-ui
npm run test:admin-staging-ui
```

Output: ignored `staging-ui-test-results/dist`, plus an exact SHA manifest.
Mount the output under the Site's `dist/r4/`; paths are intentionally absolute
`/r4/admin/`, `/r4/assets/` and `/r4/images/`. Canonical normal Pages does not ship
`staging/`, the generated stage runtime or credentials. The source builder and
targeted QA runner are tooling only.

Before publishing, confirm `/auth/v1/settings` returns disable_signup=true for
the exact R4 project. Its initial fresh read-back after the user's report was
still false, so no connected UI access was opened. The client also checks this
policy before every authenticated stage transport can proceed through readiness.
It does not treat an unverified setting as success or simulate a saved booking.

Six canonical handlers remain enabled. Provider dispatch, address service,
unprepared promo/waiver/integration endpoints and Auth signup/invite/recovery
flows fail visibly. These disabled integrations must be completed and accepted
separately before production rollout; this is a test preview, not all-screen
integration acceptance. The server continues to authorize through Auth getUser,
server allowlists and existing grants/RLS; browser checks are not authorization.

Current stage users are manager-a and manager-b; passwords stay outside source,
the Site, generated archives and test reports. Do not reuse the working admin
password. Only synthetic .invalid identities and synthetic contacts/documents
are used. There are no registration, reset-password, invite or mail workflows
in this entrypoint; global Auth mail shutdown is not claimed.

Publication must preserve the existing Site project ID and owner-only audience.
The old root `/*` CSP, if present as an HTTP rule, must not intersect the new
stage CSP: scope LAB CSP to old paths and stage CSP to `/r4/*`, preserving
noindex/referrer/content-type protections. Both documents keep independent meta
CSP. Stage connect-src only permits its own origin; never allow production API.
Compare hashes of every pre-existing LAB file except intentional header rules;
do not rebuild or overwrite LAB54 from UI55.

Separate storage namespace, manifest ID/scope and SW/cache prefix prevent state
mixing. The stage worker does not unregister another worker, handle push or
evict another environment's caches. Leaving stage must not clear the old LAB.

Local managed Sites browser preview has no callable cua_repl.js in this session.
Per the Sites skill, no substitute local server/browser is started. Targeted
VM/transport/artifact checks are distinct from connected-browser validation;
canonical CI/browser and physical iPhone acceptance remain required. New source
UI55 is not certified by the previous UI54/hosted-checkpoint CI result.
