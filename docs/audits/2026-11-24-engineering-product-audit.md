# Engineering & Product Audit — 2026-11-24

Статус: Professional Audit & Gap Analysis; пропозиції не є дозволом на implementation.
Scope: P0 — перевірити production baseline; P1 — інвентаризувати архітектуру, тести та CI; P3 — сформувати продуктовий backlog. Фази, порядок і exit criteria [Roadmap](../DEVELOPMENT-ROADMAP.md) не змінені. Стандарт v1.1 інтегрується окремо як документація в PR #95.

## Executive Summary

VAcleaner має зрілу систему захисних контрактів: канонічну специфікацію, registry QA, fail-fast static checks, Chromium/WebKit, чотири operations gates, перевірку точного production artifact і main-only deployment. Модернізація вже відбулася частково: docs-only PR classifier, pinned browser runtime, instrumentation і контрольовані негативні fixtures існують. Перезапускати ці роботи з нуля недоцільно.

Основний ризик — розрив між великою кількістю контрактів і доказами фактичних operational outcomes. Спільний Supabase та перевірки через `admin_users` потребують окремої перевірки меж авторизації; актуальний main не protected за Branch API. Старі snapshot inventories не описують новий fleet повністю. Автоматичні browser fixtures не закривають iPhone acceptance, а analytics hooks не доводять надходження коректних подій у GA4.

## Доказова база та межі

Baseline: [main 68c274f](https://github.com/VAcleaner-washing/pl/commit/68c274f49690e9844c468ef46e68cb78c70584ce), PR #94 merged; [PR #95](https://github.com/VAcleaner-washing/pl/pull/95) початковий head `2cdda0b49dc808a8eb96d459a3ef23b8709caea0`. Branch `docs/va-engineering-standard-v1-1` є прямим нащадком baseline; початково лише AGENTS, CLAUDE, standard і tooling. Перевірені всі вісім запитаних нормативних документів; пріоритет локальних product/release contracts збережено.

Live GitHub API 2026-11-24: 22 open PR — #95, #84, #77, #76, #75, #74, #69, #68, #67, #66, #65, #64, #63, #62, #61, #60, #59, #58, #53, #39, #25, #24. #84 Draft, ізольований SQL smoke не прийнятий; його не змінено. #74–77 уже зазначені як integrated у production receipt: open статус не доводить відсутність функції в main. Жоден сторонній PR не закрито й не merged.

Full main [run 45373663445](https://github.com/VAcleaner-washing/pl/actions/runs/45373663445), attempt 1: усі дев'ять jobs success, включно з deployment. 10:19:19–10:44:35 UTC = 25m16s. Production version/build: 4.3.69/4369. Докази local/CI/live/device розділені в [QA assessment](2026-11-24-qa-cicd-assessment.md).

## Оцінка напрямів

| Напрям | Поточний стан і практичний висновок | Evidence / gaps |
| --- | --- | --- |
| Architecture | Static public export + modular enhancement; vanilla admin + compiled normal operations presentation; Edge Functions/Postgres | [Ownership inventory](2026-11-24-architecture-data-ownership.md); rewrite framework не обґрунтований |
| Booking/equipment | Snapshot booking/resources; reservation RPC, fleet serviceability та mutex; UI є проєкцією | `vacleaner_apply_reservation`, fleet migration, isolated browser gates; multi-connection DB proof не закритий #84 |
| Finance | Canonical `calc()` і server settlement; service charges, received funds, refundable deposit розділені | `assets/admin-v250.js:376`, `settlement.mjs`, finance tests; не еквівалент бухгалтерському ledger |
| Customers/referral | CRM authoritative для контактів; окремі uses/rewards/messages; best-of discount | DATA-002, REF-010/011; production reconciliation без читання PII не виконувалася |
| Delivery/operations | Global settings, route quotes, operational status guards | config, booking/admin/extend functions, route/status suites; немає дозволу змінювати тарифи |
| Product management | Approved roadmap, scope guard, P3 intake та історичний CSV | Немає підтвердженого accountable owner/SLO для кожного KPI; old open PR inventory потребує disposition |
| UX/design | Shared Back, compact finance, scroll/dirty-state protection, layered CSS і visual suites | 33 asset CSS files; shared patterns існують, Figma/Storybook не виявлені; iPhone та accessibility acceptance відкриті |
| QA/CI/DX | 68 static + 52 browser registry suites, pinned runtime, full release provenance | Див. QA assessment; source-string assertions і потенційний повтор recovery ще є |
| Supabase/security | Live RLS, direct-deny policies, service-only mutation RPC; shared Auth/service role blast radius | Metadata queries + advisor; admin allowlist межа й migration reconciliation потребують review |
| PWA | `/admin/` identity, network-first versioned assets, activation-before-reload guard, offline/update/rollback tests | Live build4369; native installed-client evidence відсутній |
| Performance | Read-performance/browser suites, static asset pipeline | Немає отриманого p75 CrUX/RUM або актуального Lighthouse report; не заявляємо CWV GREEN |
| Observability/SRE | CI artifacts, booking audit, operational-health та SMS audit | Це не підтверджений external uptime/error alerting; owner, alert delivery і recovery drill невідомі |
| Business analytics | Existing decision/finance/referral analytics та event attribution | Потрібен звірений metric dictionary з timezone/status/refund rules; deposits ≠ revenue |
| SEO/Growth | Canonical routes, sitemap/SEO registry/tests, GTM/GA4 contract, funnel hooks, referral/retention | GSC ownership, GA4 delivery, consent configuration, campaign ROI не підтверджено |

## Документація та результати

Виявлені суперечності часу: CI documents містять історичні «current/open/not implemented» записи, хоча #88–94 вже інтегровані; додано dated entry points, історію не стерто. `reviewMode` receipt — історія candidate review, а не live deployment state; runtime receipt не редагується цим аудитом. Старий P3 backlog уже містить triage реалізованих функцій; новий backlog не дублює ці вимоги.

1. [Architecture & Data Ownership Inventory](2026-11-24-architecture-data-ownership.md).
2. [Professional Tooling Assessment](../TOOLING.md) — єдине місце оцінки інструментів.
3. [Gap Analysis](2026-11-24-gap-analysis.md) — рекомендації з повним набором полів.
4. [Risk Register](2026-11-24-risk-register.md).
5. [QA & CI/CD Assessment](2026-11-24-qa-cicd-assessment.md).
6. [Запропонований план](2026-11-24-modernization-proposal.md).

Машиночитаний [evidence snapshot](2026-11-24-evidence.json) зберігає точні SHA, run/jobs, список PR та результати static/artifact/live без бізнес-рядків.

Self-review виконано; independent review не отримано. Live metadata та артефакти перевіряються окремо від physical-device acceptance. Жодних product/runtime/deployment-config/DB змін, installs, paid subscriptions або production business API writes цим аудитом не виконано.
