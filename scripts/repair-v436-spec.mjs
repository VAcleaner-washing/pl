import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const baseSha='8fdec822bfbe8d1616b01468ae5c90498216e0bd';
const specPath='docs/VAcleaner-SYSTEM-SPEC.md';
const base=execFileSync('git',['show',`${baseSha}:${specPath}`],{encoding:'utf8'}).replace(/\s+$/,'');
const section=`
# 64. Change record — v4.3.6 FINANCE FLOW CONSISTENCY

### ADDED

- \`assets/admin-v436.css\` — вузький production presentation layer поверх \`admin-v430.css\` для узгодженої фінансової ієрархії на mobile/PWA і desktop.
- \`scripts/test-v4-3-6-desktop-finance-flow.mjs\` — canonical static contract для структури, семантики кольорів, правої осі сум і відсутності вкладених finance-card shells.
- \`scripts/finance_flow_v436_visual_qa.py\` — exact browser regression для 390 px mobile/PWA та 1440 px desktop із screenshot evidence.

### CHANGED

- Mobile booking card використовує одну фінансову вісь: \`Разом витрати\` → \`Отримано\` → \`Залоговий платіж\` → попередній/фінальний результат. Залог і результат більше не виглядають як окремі картки всередині фінансового блоку.
- Mobile \`Попередній розрахунок\` / фінальне закриття використовує одну плоску структуру \`Отримано → Списується → Підсумок\`; helper-стан залогу відображається окремим рядком під label, а всі суми вирівняні по одній правій осі.
- Desktop settlement використовує ту саму semantic money-direction hierarchy: отримане — стриманий зелений акцент, списання — terracotta/red, фінальний refund/due/neutral — один явний результат.
- Фінансовий breakdown на mobile і desktop є однією surface: section separators замість redundant inner frame/background.

### FIXED

- Mobile \`Залоговий платіж 2 000 грн · отримано\` більше не рендериться як велика синя внутрішня картка.
- Mobile \`Попередньо повернути / доплатити\` більше не рендериться як друга велика зелена/червона внутрішня картка.
- У попередньому розрахунку \`Залог\` і \`Отримано\` більше не злипаються в один візуальний рядок.
- Desktop labels і amounts більше не злипаються у строки типу \`Передоплата200 грн\`, \`Доставка250 грн\` або \`ПідсумокДо повернення…\`.
- Фінальний refund/due amount залишається одним очевидним підсумком без дублювання.

### PRESERVED

- Finance formulas, received/expense/refund/due calculations, передоплата, залог, оренда, доставка, extras, chemistry, discounts, persistence і booking status transitions не змінюються.
- Supabase schema/functions/data, SMS/RETURN/referral behavior, availability, delivery pricing та service-worker behavior не змінюються.
- Public booking і VA HOME не зачіпаються.

### TESTS

- \`scripts/test-v4-3-6-desktop-finance-flow.mjs\` через canonical \`test:current-contracts\`;
- \`scripts/finance_flow_v436_visual_qa.py\` через canonical Browser QA — exact 390 px + 1440 px geometry and screenshots;
- \`test:css-architecture\`, \`test:final-desktop-static\`, artifact verification, PWA/browser suites і full canonical QA залишаються release-blocking перед merge у \`main\`.
`;
fs.writeFileSync(specPath,`${base}\n\n${section.trim()}\n`,'utf8');
