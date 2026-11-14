# R4 — isolated backend preparation

Status: **hosted R4 created; core server checks completed; connected UI acceptance pending**.
The user selected VA Home on 2026-11-11. The actual isolated target is
`jdthhqxzfpvosfdxwfem`, `vacleaner-admin-staging-r4`, eu-west-1.
See [the hosted acceptance record](../docs/ADMIN-R4-HOSTED-ACCEPTANCE.md)
and [the non-secret receipt](hosted-r4-receipt.json).
The published LAB remains browser-local 4.3.54/4354; it is not connected to R4.
The separate UI55 candidate is described in [UI-README.md](UI-README.md).
Its generated `/r4/` artifact does not replace the existing LAB54 files and is
not published until the actual Auth policy and private publication gates pass.

Production remains 4.3.46 / 4346. The R4 preflight baseline was private browser-local LAB 4.3.50 / 4350;
4.3.51 / 4351 contains the modal-focus repair; 4.3.52 / 4352 adds the
user-owned scroll follow-up.
No production schema, business rows, Auth users, settings, schedules or functions
were changed. Production inspection used system catalog and Edge source reads.

## Deployment scope and recorded authorization

- Selected organization: `VA Home` (`knylxccxamntjtqukbhe`), also the organization
  containing the unchanged production `Va-home` project.
- New project: `vacleaner-admin-staging-r4`, region `eu-west-1`, independently
  created; never branch/reset/restore/merge the production project.
- Supabase creation quote: **$0/month**, refreshed on 2026-11-11 before creating
  exactly one Free project. Future plan changes or usage charges are not implied.
- Production denylist: `yweluzclearwrazdkahu`.
- Schema: 22 tables, 15 SQL functions, indexes, constraints, triggers, RLS,
  grants and policies captured from catalog metadata. No production table rows.
- Synthetic seed: four resources with declared capacity 2 and checked-in catalog,
  deposit, slot and delivery defaults. No copied customers/bookings/expenses,
  allowlist members, documents, referral events, subscriptions or secrets.
- Six canonical handlers: admin bookings v4, admin data, settings, extension,
  status correction and customer documents. Original files and financial modules
  are copied byte-for-byte; only an extra transport-boundary module is added.
- External requests and integration dispatch are rejected with 503 and
  `delivered:false`; notification success is never invented.

## Prepare, without database access

```sh
node scripts/prepare-admin-staging.mjs --project-ref local
# After the new project is created and independently identified:
node scripts/prepare-admin-staging.mjs --project-ref NEW_STAGING_REF
npm run test:admin-staging-preflight
```

The generator only writes inside `staging/`. It cannot create a project, issue SQL
or deploy functions. It refuses the production ref. The generated bootstrap's
first statement also refuses any database that already has VAcleaner bookings
or an admin allowlist. Generated functions, credentials and SQL stay ignored.
Both Pages building and independent artifact verification exclude `staging/`.

`catalog-snapshot.json` contains schema metadata only. Sequence bounds are strings
to preserve bigint precision. `platform-auth-functions.json` is only for local
compatibility preparation; do not replace managed hosted Auth functions.
`source-parity.json` records actual deployed-source hashes and differences.

## Execution sequence and remaining gates

1. Create the fresh Free project in the selected organization. Retain its actual
   ref and API URL, verify it differs from production, and inspect empty tables.
2. Apply the generated schema only to that target, inspect advisors and verify
   all 22 RLS states, policies, function grants and constraints by read-back.
3. Provision only synthetic `.invalid` Auth accounts through the Auth admin API:
   two managers and one ordinary user. Store credentials outside source/artifacts.
   Do not copy production allowlist members. Disable public signup and external
   email delivery before opening the staging UI; verify the settings.
4. Deploy canonical handlers with transport isolation. Create a private test
   document bucket. Keep SMS/push providers and scheduled dispatch disabled.
5. Bind a visibly labelled STAGING build to the exact new origin/key. Do not
   replace browser-local LAB identity silently or use production credentials.
6. Run the persisted-state and two-device matrix below, then visual/browser CI.
   Record actual failed scenarios and fix candidates; preflight success alone
   is not approval to migrate production.

## Integration acceptance matrix

The table describes the full gate, including pending connected-browser and
physical-device checks. Actual server results and limitations are recorded in
the hosted acceptance document; do not interpret every row as completed.

| Scenario | Independent server evidence required |
|---|---|
| Authentication and authorization | Missing/invalid/foreign-project token → 401; ordinary user and editable user_metadata admin spoof → 403; two allowlisted managers work |
| Direct Data API and RPC | Anonymous/ordinary users cannot read or mutate business data or execute privileged RPC; RLS/grants remain enabled |
| New → prepayment → confirmation → issue → extend → return → settlement → complete | Persisted statuses, resources, monetary values and audit entries agree with the UI after reopening/reload |
| Concurrent create / retry | Same client_request_id in two requests creates one booking; read-back shows final reserved state, not a transient success |
| Response lost after commit | Proxy drops an actual server response after forwarding; second session/SQL sees one committed row; explicit retry does not duplicate it |
| Failed refresh after save | The save receipt stays visible; retry repeats the read only |
| Partial settlement | First phase remains persisted when the second phase fails; read-back and explicit retry preserve amounts and avoid duplicate effects |
| Availability and competing devices | Actual reservation RPC/constraints reject oversubscription and release resources correctly |
| Referral / promo / reward / status correction | Actual SQL/RPC transactions, completion/cancellation and independent attribution sets; no fabricated campaign/referral events |
| Settings and customer edits | Acknowledged values survive reload and appear on another manager device; rejected writes preserve the draft |
| Documents | Synthetic file stored only in private staging storage; signed access and unauthorized denial verified |
| Dispatch isolation | No real SMS, push, contacts, external mail or scheduled calls; blocked delivery is explicit |

Physical iPhone keyboard, safe areas, VoiceOver, background/resume and hosting
sign-in remain device acceptance gates.

## Verification actually completed

- 17 preflight checks: target/path refusal, initial existing-schema guard, RLS and
  grants, synthetic-only seed, unchanged canonical files, outbound rejection,
  permitted target origin, production-env refusal and Pages leakage prevention.
- Generated SQL: 506 statements parsed by PostgreSQL parser `pglast==7.22`.
  This validates syntax, not execution or transaction semantics.
- Normal Pages: 270 files, release 4.3.50/4350; staging files excluded.
- Full static QA: 47/47 passed. At preflight commit c552791, normal Pages was byte-identical to the 270-file R3 artifact.
  4.3.51 intentionally adds the documented modal-focus fix and release stamps.
- Full local Supabase startup failed during image extraction with ENOSPC on the
  environment's 7.9 GiB filesystem. No database or Auth service was started.
  Downloaded unused test images were removed; no data volumes were deleted.
  Do not label Auth/RLS/RPC, server persistence or two-device checks as passed.

The organization choice and isolated project creation are now complete.
This does not authorize a production merge/deploy or use of real business data.
The initial preflight measurements above remain historical; frontend release
4.3.54/4354 and hosted provisioning are separately identified.

## Follow-up CI finding

R4 preflight CI 42906037435 passed static and Chromium; WebKit failed at campaign
dirty-close. A held initial autofocus frame reproduced an empty input six of six
times: the frame moved focus to Close between field focus and text insertion.
4.3.51 respects an already focused control/current native dialog and ignores
disconnected cards. The regression now asserts actual text and focus before the
unchanged dirty-close assertion; it does not add sleeps, forced clicks or retries.
This UI repair does not create a hosted backend or certify integration acceptance.

4.3.51 CI confirmed that the autofocus regression passed, then exposed a separate
missing issueForm action. The existing view-switch reset schedules a final timer
after 60ms. Releasing that real callback between pointerdown/pointerup moved the
list from 1934px to zero and prevented the form opening. 4.3.52 retains the initial
reset sequence while invalidating older callbacks after a new view or trusted
pointer/key/wheel action. No sleep, retry or forced click is used in the regression.
The hosted backend remains uncreated until organization selection.
