# Professional Tooling Assessment — VAcleaner

Baseline: main `68c274f` on 2026-11-24, [audit](audits/2026-11-24-engineering-product-audit.md). Availability, configuration, account access and successful execution are separate. No tools installed or paid plans activated. The following original foundation is retained; current evidence and decisions follow it.
- GitHub, package.json, Pages workflow, Node QA scripts and Python browser suites: present. See AGENTS.md, CI-DIAGNOSTICS.md and CI-SELECTIVE-VALIDATION.md for canonical commands/evidence. Do not replace existing suites merely to adopt Vitest or Playwright wrappers.
- Supabase: repository directory present; live configuration and permissions not audited.
- Codex: intended execution agent; Claude Code adapter supplied. ChatGPT must explicitly receive/read these files.
- Candidates only: Figma/Storybook (design), axe-core/Lighthouse CI (accessibility/performance), Sentry/Better Stack (monitoring), PostHog/GA4/Clarity (analytics), Metabase (business data), CodeQL/Dependabot/CodeRabbit (security/review), n8n (automation), GitHub Projects (planning).
- For each candidate record existing equivalent, verified access, cost, privacy, benefit, integration effort, owner and acceptance criteria. No installation or paid subscription without applicable approval.

## Verified stack and candidate decisions

GitHub repository/Actions/Pages and Supabase metadata access worked through MCP. Codex executed local Node/Python checks. Registry has68 static/52 browser suites. Main full CI succeeded; local static passed70 runner groups. CI Playwright1.65.1 immutable Noble image differs from local1.62.0, so local browser acceptance is not claimed. No Supabase CLI on PATH. No ESLint/Prettier/Storybook/Dependabot/CodeQL configuration found in the inspected repository. Account configuration outside repository remains unknown.

Cost categories below are preliminary, not vendor quotes: OSS excludes maintenance; free/paid tiers require current limits/eligibility review before adoption. Effort L≈0.5–1 person-day evaluation, M≈2–4, H≥5. Owners are proposed roles, not assigned people. G01–G08 refer to the canonical [recommendations and acceptance criteria](audits/2026-11-24-gap-analysis.md).

| Tool | Current equivalent / verified state | Benefit, compatibility and decision | Cost / effort / proposed owner | Privacy, maintenance, dependency and acceptance |
| --- | --- | --- | --- | --- |
| GitHub | Repository/PR/Actions/Pages accessible; main Branch API unprotected | Retain; assess effective rulesets | Current tier/quota unknown; L; Release | Least privilege; G03 enforce compatible PR gates |
| GitHub Projects | Roadmap, P3/CSV, PRs; has_projects=true, board unverified | Optional intake; never copy roadmap into divergent board | Free/paid unknown; L; PM | Issue visibility; G08 item links/owner/disposition |
| Codex | This session + AGENTS adapter | Retain scoped execution/evidence | Existing subscription unknown; existing; Engineering | Repository/customer data permissions; no invented review roles |
| MCP | GitHub/Supabase connectors verified | Prefer narrow read-only capabilities for audit | Existing terms unknown; L; Security | Credential scope; G01/G02 no unnecessary business-row reads |
| ADR | Spec/change records; no dedicated ADR directory observed | Short Markdown decisions for substantial changes | OSS; L; Architect | Low ops; G08 alternatives/consequences linked, no duplicate spec |
| ESLint | Custom syntax and architectural checks; config/dependency not found | Evaluate new/changed modules, avoid mass legacy rewrite | OSS; M; Frontend | Generated sources exclusions; G04 extra actionable findings |
| Prettier | Existing source conventions, no config found | Optional scoped formatter; no generated/export churn | OSS; L/M; Frontend | Maintenance/diff noise; G08 no artifact or behavior drift |
| Figma | Screenshots/source patterns; account/plugin unverified | Optional collaborative handoff if real need | Free/paid; M; Design | Never upload client PII; G08 approved reusable patterns |
| Storybook | Existing lab/sandbox and UI fixtures; not found | Defer until component boundaries justify additional build | OSS/hosting; H; Design/Frontend | Extra stack; G08 source ownership prerequisite |
| Design Tokens | Existing CSS variables/styles; no token pipeline found | Inventory current variables before extraction | OSS; M; Design | Layer drift; G08 visual parity and one authority |
| axe-core | Keyboard/focus/mobile tests; not found | Useful supplemental accessibility candidate | OSS; M; QA | Sanitized local fixtures; G05 detect known violation, retain manual/native checks |
| Playwright | Python suites + pinned CI runtime present | Retain; wrapper migration unnecessary | OSS/CI quota; existing; QA | Fixture/artifact privacy; G04 exact artifact/negative cases |
| Vitest | Node actual-function/fixture runner; not found | Defer absent demonstrated isolation/reporting gap | OSS; M/H; QA | Migration maintenance; G04 equivalent cases and measured benefit |
| Browser testing | Chromium/WebKit/four operations jobs verified | Retain and close physical iPhone checklist | CI/device time; L; QA | No production mutations; G05 native evidence separate |
| Visual regression | Existing screenshots/contracts; managed diff service unverified | Inventory reviewed screenshots, optional stable golden subset | Existing/OSS/paid; M; QA/Design | Font/runtime noise; G05/G08 known defect detected without blanket updates |
| Lighthouse CI | Static/read-performance tests; not found | Optional lab budgets; field p75 separate | OSS/CI; M; SRE | Public/sanitized pages; G06 reproducible sample, no score-only optimization |
| GitHub Actions | Selective/full release gates executed | Retain and measure serial path | Current minutes/quota unknown; existing; CI | Token/artifact retention; G03/G04 |
| CodeQL | Custom backend/security checks; workflow not found | Evaluate JS/TS/Deno/export coverage before enabling | Public eligibility/terms verify; M; Security | Code access/triage; G01/G04 actionable finding and owner |
| Dependabot | Pinned imports/image/client; config not found | Assess support for actual Deno npm/jsr/image manifests | Repository feature terms verify; L/M; Security | Update churn; G02/G04 controlled PR/full QA |
| CodeRabbit | Installation/review unverified | Optional aid after independent review ownership | Free/paid eligibility unknown; L; Engineering | Third-party code access; G03/G08 scoped permission and useful review proof |
| Supabase CLI | MCP + snapshot check; CLI absent | Later isolated replay/drift work; no install now | OSS; M; Backend | Wrong-project/reset risk; G02 isolated target and migration map |
| Sentry | CI/DB audits; SDK/workspace unverified | Consider one error aggregator only if existing logs insufficient | Free/paid quota; M; SRE | PII/session/token scrubbing; G06 release tags, alert drill, responder |
| Better Stack | Hosting/Supabase logs; external alert delivery unverified | Consider non-mutating uptime checks | Free/paid; L/M; SRE | Endpoint/log exposure; G06 detection≤5min proposed, test notification |
| GA4 | WEBANA-001/GTM/dataLayer/funnel hooks; account/receipt unverified | Verify existing setup before replacement | Existing/free/paid variant unknown; L/M; Growth | Consent/UTM/PII; G07 observed receipt, dedupe, status/refund rules |
| Google Tag Manager | Normative integration exists; container management unverified | Govern current container, avoid duplicate SDKs | Existing/free/paid unknown; L; Growth | Tag permissions/rollback; G07 consent/tag inventory |
| PostHog | Existing funnel/decision analytics; workspace/SDK not found | Defer unless a concrete unanswered question remains | Free/usage/self-host ops; M/H; Product | Replay/identity PII; G07 masking, retention, measurable question |
| Microsoft Clarity | Flow QA/screenshots; integration not found | Defer replay until specific UX question and privacy controls | Terms/pricing verify; M; Design | Customer document/input capture risk; G05/G07 masking verified |
| Metabase | Admin finance/referral views; connection unverified | Defer until metric definitions/scoped read-only views | OSS hosting/paid; H; Analyst | No service-role BI; G07 restricted views and reconciled metrics |
| Google Search Console | SEO tests/sitemap; property/access unverified | Verify indexing/queries/CWV before extra SEO tools | Terms verify; L; Growth | Minimal data; G06/G07 sample/window/property evidence |
| Meta Pixel | fbclid attribution exists; Pixel installation unverified | Only after approved campaign/consent need | Ad spend separate; M; Growth | Cross-site tracking; G07 consent/deduplication, no installation now |
| n8n | Edge reminders/dispatch claims/automation already exist | Defer unless workflow has no reliable equivalent | Self-host ops/paid; H; Ops | Secrets/duplicate sends; G01/G07 idempotency/audit/owner |

Shared acceptance for adoption: verify access and existing equivalent, name owner, review actual tier/limits/cost, scope permissions/consent/retention, demonstrate sanitized fixture benefit and rollback, measure outcome using G01–G08. Absence of a vendor tool alone is not a gap. No candidate is implementation-approved by this assessment.
