# VAcleaner Admin UX Audit — v4.2.41

Дата: 2026-08-31  
Scope: desktop admin + installed iPhone PWA  
Source of truth: `docs/VAcleaner-SYSTEM-SPEC.md`

## Executive verdict

Адмінка має зрілу операційну основу: статусний процес, фінансові розрахунки, контекстні повернення, safe-area, keyboard handling, модальні focus traps і критичні CTA вже захищені окремими regression-контрактами. Основний знайдений системний недолік був не в бізнес-логіці, а в узгодженості станів керування: активність розділу, pressed/selected, focus, mobile More та compact mode частково існували лише візуально.

У v4.2.41 цей шар уніфіковано без зміни тарифів, фінансових формул, статусів, Supabase-контрактів або VA HOME.

## Покриття екранів і маршрутів

| Розділ / поверхня | Основна операція | Перехід назад / збереження контексту | Результат аудиту |
|---|---|---|---|
| Бронювання | фільтр, detail, edit, process, issue, return, finance, cancel/correct | detail → список; child modal → detail; search → detail → search | контракт збережено |
| Календар | день/слот → нове бронювання | modal → календар | контракт збережено |
| Найближчі | видача, доставка, повернення | action → detail/операція → вихідний список | контракт збережено |
| Техніка | каталог, комплекти, ціни | modal → розділ | контракт збережено |
| Клієнти | пошук/сегмент, картка, контакт, нова/активна оренда, referral | клієнт → бронювання/referral → клієнт; deep parent chain | контракт збережено |
| Кампанії | кампанія, коди, SMS wizard, журнал | крок назад; журнал → розсилка; search return | контракт збережено |
| Фінанси | період, витрата, delivery economics | expense modal → фінанси | контракт збережено |
| Аналітика | період, метрика, деталізація | локальний стан розділу | контракт збережено |
| Хімія | залишки/використання/Story reward | modal → хімія | контракт збережено |
| Налаштування | оренда, доставка, техніка, push, health | tab state зберігається; save лишає поточну задачу | контракт збережено |
| Глобальний пошук | бронювання, клієнт, витрата, кампанія | точний query + source view + scroll | контракт збережено |
| Mobile More | 7 другорядних розділів + logout | dismissal повертає focus на «Ще» | виправлено v4.2.41 |

## Перевірені control states

- default / hover / focus-visible / active / pressed / selected / disabled;
- primary, green, subtle і destructive actions;
- booking filter chips, shared Finance/Analytics periods, Settings tabs;
- desktop sidebar, mobile bottom navigation, mobile More;
- modal backdrop, `×`, `Escape`, explicit `← Назад`;
- compact list toggle, PWA update prompt, keyboard-open state;
- touch target, input zoom, reduced motion, safe-area clearance.

## Зміни v4.2.41

1. Навігація має синхронні `.active` + `aria-current="page"` стани.
2. Choice chips отримують `aria-pressed`; Settings tabs лишають правильний `aria-selected`.
3. Compact mode повідомляє поточний стан і наступну дію, а не лише показує `☷/▦`.
4. Mobile More повідомляє `aria-expanded` і повертає focus після закриття.
5. Один focus-visible стиль застосований до всіх типів control без зміщення геометрії.
6. На iPhone всі form controls мають мінімум 16 px і не викликають Safari zoom.
7. Reduced-motion охоплює всю адмінку, включно з динамічними overlay та pseudo-elements.
8. Active/hover/touch feedback зведено до спокійної ієрархії без стрибків карток.

## Responsive / PWA contract

- контрольні ширини: 320, 390, 430, 768, 1024, 1280, 1440, 1648 px;
- iPhone 15 Pro Max: 430 × 932 CSS px;
- root-fixed topbar/main/mobile-nav, edge-to-edge content, safe-area clearance;
- mobile nav — окремий body-level node, не desktop sidebar;
- software keyboard прибирає nav за viewport і не перекриває active field;
- primary mobile tap targets — не менше 44 px;
- critical booking actions не ховаються під декоративними або рідкісними діями;
- модальні форми не мають horizontal overflow і зберігають доступний Back/Close.

## QA evidence

- archive integrity and unsafe-path audit: pass;
- source/build/System Spec coherence: pass;
- static regression aggregate: 99/99 pass;
- v4.2.41 interaction contract: 12/12 pass;
- desktop synthetic-data inspection: booking list, navigation, calendar and clients list reviewed;
- canonical local Playwright browser aggregate could not start in this execution environment because the Chromium CDN returned repeated 502/truncated archives. Per `REL-002`, this is recorded as an environment blocker rather than misreported as green. The suite remains mandatory in CI/production verification.

## Designer recommendations — separate from this release

These are optional improvements, not defects and not included because they change product behavior or information architecture:

1. Add a command palette for expert desktop users (`⌘/Ctrl + K`) with booking/client/route actions.
2. Add a lightweight “recently opened” stack to global search for repeat operational work.
3. Add per-action optimistic progress text in long backend operations, while keeping current idempotency and retry contracts.
4. Gradually consolidate historical CSS overrides by component ownership. Current cascade is stable and tested, but the file has substantial legacy duplication; refactor only as a dedicated no-visual-change release with screenshot diffs.

## Release decision

v4.2.41 is a low-risk interaction/accessibility release. Business rules and data contracts are preserved. Static release gates are green. Production promotion still requires the canonical browser/PWA aggregate in an environment with an available Chromium runtime.
