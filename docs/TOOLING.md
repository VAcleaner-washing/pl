# Tooling inventory — VAcleaner

Observed from main on 2026-11-24; availability and successful execution are separate.
- GitHub, package.json, Pages workflow, Node QA scripts and Python browser suites: present. See AGENTS.md, CI-DIAGNOSTICS.md and CI-SELECTIVE-VALIDATION.md for canonical commands/evidence. Do not replace existing suites merely to adopt Vitest or Playwright wrappers.
- Supabase: repository directory present; live configuration and permissions not audited.
- Codex: intended execution agent; Claude Code adapter supplied. ChatGPT must explicitly receive/read these files.
- Candidates only: Figma/Storybook (design), axe-core/Lighthouse CI (accessibility/performance), Sentry/Better Stack (monitoring), PostHog/GA4/Clarity (analytics), Metabase (business data), CodeQL/Dependabot/CodeRabbit (security/review), n8n (automation), GitHub Projects (planning).
- For each candidate record existing equivalent, verified access, cost, privacy, benefit, integration effort, owner and acceptance criteria. No installation or paid subscription without applicable approval.
