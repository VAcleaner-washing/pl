# VAcleaner v3.0.65 — PUBLIC CARE & RETURN RULES

## База
- VAcleaner v3.0.64 — FLEXIBLE DISCOUNTS & RETURN SETTLEMENT UX.

## Що змінено
- Додано публічну інформацію про відповідальність і дбайливе користування технікою.
- FAQ отримав 3 нові відповіді: несправність під час роботи, фізичні пошкодження, стан техніки при поверненні.
- `/umovy/` отримав окремі правила щодо несправностей, фізичних пошкоджень і чистоти повернутої техніки.
- У детальному блоці умов додано секцію «Дбайливе користування» з людською, некаральною подачею.
- Зафіксовано фактичний соціальний доказ: за 300 оренд VAcleaner ще не доводилося штрафувати клієнтів за техніку.
- Прямо пояснено: природний знос/технічна несправність не з вини клієнта не є його відповідальністю; самостійно розбирати чи ремонтувати техніку не потрібно.
- Для повернення пояснено базовий догляд: злити брудну воду, прибрати велике сміття/волосся, сполоснути робочі ємності та насадки; звичайні сліди використання — нормально.

## Не змінювалося
- Адмінська бізнес-логіка.
- Розрахунок оренди, залогу, знижок і фінального settlement.
- Supabase schema/RLS/functions behavior.
- PWA navigation / mobile shell.
- VA HOME.

## QA
- Static build guard перевіряє наявність усіх нових public care rules та відповідного UI.

## Перевірки
- `npm run check`: PASS — 253 file checks.
- CSS architecture: PASS.
- Stabilization: PASS — 157 assertions.
- Retention/campaign: PASS — 18 checks.
- Finance: PASS — 23 scenarios.
- UX: PASS — 18 scenarios.
- Operational health: PASS.
- Pages build: PASS — 190 files, 5011 KiB.
- Browser runtime QA у container-середовищі не виконано: Chromium блокує локальні/file/custom-origin навігації з `ERR_BLOCKED_BY_ADMINISTRATOR`; це не позначено як PASS.

## Deployment
- Зміни лише public frontend copy/UX.
- Supabase schema, RLS та Edge Functions не змінювалися по поведінці й окремого deploy для цього релізу не потрібно.
