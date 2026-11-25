# IP-02 proposal — repository release-policy enforcement

**Design proposal only. No GitHub settings, workflows, dependencies or required checks changed.** This is not implementation approval for IP-02/03/04. Scope if approved later: Roadmap P2 release-checklist enforcement, preserving [System Spec](VAcleaner-SYSTEM-SPEC.md) REL-001/002/003 and [existing classifier/gates](CI-SELECTIVE-VALIDATION.md). Private review artifacts and identity/security findings must not be attached to public issues/PRs.

## Owner decisions before configuration

- Confirm repository administrator, policy owner, available independent reviewers/quorum and documented emergency/bypass accountability. Self-review/agent labels are not independent approvals. Do not create an impossible approval requirement for the available maintainers without an explicit owner decision.
- Require branch/PR flow for main and enforce the approved squash-only integration strategy; define force-push/deletion, stale approval/new-head handling, outstanding review disposition and bypass semantics using actually available repository capabilities.
- Export effective current settings/rules read-only first, including parent rules and applicable environment protections where accessible; distinguish access denied from empty rules. Keep actor-sensitive evidence private. No production direct-push/merge probe.

## Required-check design choices to review

Existing ordinary-docs PRs legitimately skip heavy jobs; code/mixed/workflow/System Spec changes use full QA. A required check must never be satisfied solely by a green classifier/scope result while required product gates fail. It must also avoid permanently pending contexts for allowed docs-only changes.

Option A: if native GitHub semantics can safely enforce the existing contexts for both lanes, document and validate that behavior without changing workflows. Option B: if not, propose a separately reviewed stable aggregate readiness check that verifies complete classification and the appropriate existing results on the exact reviewed SHA, failing closed for missing/failed/cancelled/ambiguous results. Option B would require explicit future workflow scope; it is not authorized or implemented by IP-01. Do not choose contexts from examples or rename actual gates speculatively.

Scope workflow and main-only deployment remain separate checks. Environment approval cannot replace PR protection; a protected branch cannot replace artifact provenance or live acceptance. Define how exact-head check freshness is established before squash/merge.

## Acceptance and rollout proposal

1. Owner-approved policy/check/reviewer/bypass matrix; compatibility and repository capability verified.
2. Isolated repository/dry-run fixtures: allowed docs-only, full-code green, mixed change, renamed/missing file list, code failure with green classifier, missing/cancelled gate, new commit/stale approval, unauthorized bypass/direct-push simulation. Never attempt a prohibited push to production main.
3. Before any live settings mutation, obtain separate scope approval, export previous settings and identify rollback owner. Apply minimal agreed settings only in that future package; no release topology changes bundled silently.
4. Read-only effective-rules/settings evidence confirms the intended contract. Record unsupported features/BLOCKED cases, reviewer responsibility and any explicit residual-risk decision. A green CI run alone is not this evidence.
5. Rollback: administrator restores approved previous settings from export, records reason/time and temporary manual release controls; no business data/production artifact rollback. Never bypass a failing product gate as rollback.

Expected benefit: enforce the same approved main integration contract consistently. Estimated effort 0.5–1 person-day after access/decisions, medium complexity; risks include docs-only deadlock, a green-but-incomplete required check, bypass ambiguity and loss of reviewer availability. No new paid tool proposed. The separate owner-approved IP-02 decision must precede implementation; this proposal alone changes nothing.
