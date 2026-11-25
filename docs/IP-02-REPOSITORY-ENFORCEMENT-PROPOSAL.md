# IP-02 — Release readiness and native enforcement proposal

**IP-02A:** additive guard implemented in this PR, pending independent exact-head review and recorded CI. **IP-02B:** native Ruleset activation remains BLOCKED pending separate owner approval. No settings changed. This is the existing canonical proposal, not an applied configuration or another regression registry.

Roadmap P2 — deterministic feedback and preservation of full release gates. [System Spec CI-P2-READINESS-001](VAcleaner-SYSTEM-SPEC.md), [same-change mapping](CHANGE-IMPACT-MAPPING.md), the registry and workflow remain authoritative. No runtime/Supabase/business/dependency/Roadmap changes, IP03/IP04 or G09 repair. Do not publish private actor/access findings.

## IP-02A event and lane contract

The CLI reads actual GITHUB_EVENT_NAME, ref/base/repository and event JSON. READINESS_NEEDS is bound to toJSON(needs). The decision step uses !cancelled() && success(), supplies the verified non-cancelled flag, and a final always() assertion fails on cancellation or any absent/unsuccessful decision. Status functions are used in supported step-if contexts, not env expressions; no caller-selected lane/event overrides. PR number/ref/base/head and repository must match the runner. The unchanged production workflow filter admits PRs targeting main.

| Actual event / classifier | Required heavy aggregates | Result |
| --- | --- | --- |
| Eligible pull_request, classifier success, literal docs_only=true | validate/browser/WebKit/Operations all skipped | Success, docs-only |
| Eligible pull_request, classifier success, literal docs_only=false | All heavy aggregates success | Success, full |
| Main/qa push or dispatch, classifier success, literal docs_only=false | All heavy aggregates success | Success, full |
| Non-PR with docs_only=true; invalid/missing event/ref/repository/payload/classifier | Any | Failure |
| Missing/unknown/neutral result, full lane with skipped/failed/cancelled gate, docs lane with unexpected results | Any | Failure |
| Explicit cancellation, missing/unknown cancellation state, malformed/missing/extra needs | Any | Failure |

Operations success means the unchanged complete Chromium/WebKit ×440/1440 matrix, not one child. The non-matrix Release readiness job has if: always(), all five producer dependencies, read-only contents, a5-minute bound and a direct evaluator command. Existing jobs, variants, selection, runtime pins and deployment needs/success predicates remain unchanged. This is a merge check, not deployment/provenance/live/device acceptance.

`node scripts/test-merge-readiness.mjs` runs automatically in classify before classification/expensive gates for both lanes. Fixtures cover event/ref/payload consistency, both decisions, all missing/unknown/failure cases, cancellation, real CLI exits, an always-green evaluator mutant and unsafe workflow mutations. Mutation checks reject removed automation, conditional readiness, missing dependencies, forced non-cancellation, matrix/continue-on-error and swallowed exits. No extra file, dependency or registry change is required for automatic execution.

## Real CI and cancellation evidence

- The CLI exits0 only for acceptance,1 for rejection; no neutral exit, retry or caught signal converted to success. Normal docs-only heavy-job skipping must not skip readiness.
- Scheduler cancellation can terminate/prevent a job; cancelled/missing evidence is not acceptance. If a real cancellation probe produces skipped/neutral readiness, preserve it and treat native activation safety as unverified/BLOCKED. A script cannot guarantee server scheduling or retroactively change a completed check after late cancellation.
- Full-code validation runs on the implementation PR. Actual docs-only scheduling is rehearsed before merge on a separate non-production base containing this implementation. Its workflow copy adds only a temporary PR-target filter; evaluator/tests/readiness/gates remain identical, with hashes recorded. This is an explicit rehearsal deviation, not a main deployment or production-trigger change.
- Controlled cancellation uses a distinct rehearsal SHA/run while a prerequisite is pending/running; never cancel the canonical acceptance run. Preserve event, dependency results, actual readiness/workflow conclusions and IDs. Expected failed/cancelled probe evidence is neither a product defect nor an automatic retry.
- Link actual full/docs-only/cancellation outcomes from the PR. Hosted decision fixtures alone do not certify GitHub scheduling. No main/deployment/device acceptance or speedup is claimed for an unmerged PR.

## Tampering and enforcement boundaries

The same PR can edit its workflow, evaluator and fixtures. Mutation tests detect particular unsafe edits; an author able to replace all three can manufacture green. GitHub Actions producer binding verifies the app, not trusted source content or independent review. Native skipped/neutral semantics make preserving the unconditional guard especially important. A stronger trust root/required workflow outside the writable PR needs a separate capability/scope decision; it is not silently installed here.

| Mechanism | Automatic boundary | Procedural/unverified boundary |
| --- | --- | --- |
| Classifier + automatic fixtures | Complete-file classification and tested decision predicates | Semantic regression adequacy; coordinated replacement of their own checks |
| Release readiness | Reviewed event/lane/cancellation/result consistency | Integrity if its own workflow/evaluator/fixtures are replaced |
| Existing full gates/deploy | Original assertions, variants, artifacts and main-only publication | Independent approval, live readback, installed-device behavior |
| Proposed native contexts | Presence/source/freshness and accepted check conclusions | Human review with approval count0; same-app context forgery |
| Independent exact-head review | Mandatory review of actual source, fixtures/workflow and preserved gates | Not automatic enforcement by the Solo Owner review counter |

Self-review and role labels are not independent review. Every changed head needs a new procedural review decision. Do not claim tamper-proof enforcement or security certification.

## IP-02B alternative — Solo Owner + AI Engineering Model

**PROPOSED ONLY, NOT ACTIVE.** Native approval count0 and last-push approval false as requested. Independent exact-head review remains mandatory procedurally: preserve the separate reviewer decision/SHA, re-review any changed head and obtain the owner's merge decision. External review is not automatically a GitHub submitted approval; with count0 GitHub cannot enforce that human procedure.

| Setting | Proposed value |
| --- | --- |
| Ruleset/target | vacleaner-main-release-v1; refs/heads/main; activate only after separate approval |
| Bypass | Empty; no standing admin/bot/Actions bypass |
| Ref protection | Block deletion/non-fast-forward; linear history |
| PR/method | Require PR; squash only |
| required_approving_review_count | 0 |
| require_last_push_approval | false |
| Other review rules | Dismiss stale reviews=true; resolve threads=true; codeowner review=false |
| Required contexts/producer | PR change classification, Roadmap scope guard, Release readiness; integration15368 |
| Base freshness | Strict required status policy=true |
| Deployment/repo toggles | No pre-merge deployment requirement; no repo-wide merge/auto-merge change |

Review artifact, not an apply command:

```json
{
  "name": "vacleaner-main-release-v1",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {"ref_name": {"include": ["refs/heads/main"], "exclude": []}},
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "required_linear_history"},
    {"type": "pull_request", "parameters": {
      "required_approving_review_count": 0,
      "require_last_push_approval": false,
      "dismiss_stale_reviews_on_push": true,
      "required_review_thread_resolution": true,
      "require_code_owner_review": false,
      "allowed_merge_methods": ["squash"]
    }},
    {"type": "required_status_checks", "parameters": {
      "strict_required_status_checks_policy": true,
      "do_not_enforce_on_create": false,
      "required_status_checks": [
        {"context": "PR change classification", "integration_id": 15368},
        {"context": "Roadmap scope guard", "integration_id": 15368},
        {"context": "Release readiness", "integration_id": 15368}
      ]
    }}
  ]
}
```

Direct requirements for the four expanded operations names deadlock docs-only, which emits a literal skipped matrix name; requiring that literal name instead deadlocks full-code. Readiness consumes the unchanged matrix aggregate. Pages deployment before merge also deadlocks main-only publishing. References: [status checks](https://docs.github.com/en/pull-requests/reference/status-checks), [required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [Rules REST](https://docs.github.com/en/rest/repos/rules).

## Activation and rollback

1. Complete IP-02A independent exact-head review plus full/docs-only/cancellation evidence; no self-merge. Preserve five-file scope, same-change Spec/tests and all existing gates.
2. IP-02B stays BLOCKED until separate owner approval of exact Solo Owner configuration, procedural residual risk and administrator/rollback path. Export current settings before future mutation. Private actor/access details are not public PR evidence.
3. Before activation, readiness must exist and native admission be validated safely in an approved isolated context. No production-main push probe, forced merge, missing-check bypass, bulk update of unrelated PRs or assumed Enterprise-only evaluation feature.
4. Read back effective rules after separately authorized configuration; green CI is not proof of settings enforcement. No paid tool or approval service is proposed.

Rollback IP-02A via reviewed revert of its5 process files, retaining pre-existing gates. If a future Ruleset requires readiness, remove/disable that separately approved dependency before reverting its producer to avoid a missing-context deadlock. IP-02B rollback restores the settings export and manual exact-head/full-release controls, never production data. Emergency policy edits need owner decision, actor/time/reason and evidence; no standing bypass.

IP03/IP04 need separate review. G09 remains unresolved with its bounded diagnosis closed; no runtime/test repair. Keep implementation/review/CI distinct from Ruleset activation and production/device acceptance. No speedup claim.

<!-- IP02A docs-only CI rehearsal; no runtime change; never merge this probe. -->
