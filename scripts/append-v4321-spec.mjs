import fs from 'node:fs';

const specPath='docs/VAcleaner-SYSTEM-SPEC.md';
const workflowPath='.github/workflows/v4321-spec-append.yml';
const helperPath='scripts/append-v4321-spec.mjs';
const marker='# 77. Change record — v4.3.21';
let spec=fs.readFileSync(specPath,'utf8');

if(!spec.includes(marker)){
  spec=spec.trimEnd()+`\n\n---\n\n# 77. Change record — v4.3.21\n\n## UI-009 — detail booking finance hierarchy\n\nДля мобільної detail-картки бронювання у статусах \`issued\` / \`completed\` фінансовий блок має відділяти фактично отримані від клієнта кошти від нарахованих витрат.\n\n- \`Отримано від клієнта\`: передоплата + фактичний залоговий платіж.\n- \`Нараховано\`: оренда + додатково + доставка.\n- Підсумок явно показує \`Отримано\`, \`Витрати\` і \`До повернення\` або \`До доплати\`.\n- Передоплата та залог не можуть візуально подаватися як складові витрат.\n- Формули, тарифи, persisted data, settlement rules і Supabase не змінюються: v4.3.21 є presentation-only шаром над наявними фінансовими даними.\n- До видачі техніки редизайн не повинен вигадувати факт отримання залогу; для \`pending\` / \`waiting_payment\` / \`confirmed\` зберігається чинний фінансовий рядок.\n\n### ADDED\n\n- Окремий mobile finance card у detail бронювання для виданих/завершених оренд.\n- Групи \`Отримано від клієнта\` та \`Нараховано\`.\n- Підсумкові tiles \`Отримано / Витрати / До повернення|До доплати\`.\n\n### CHANGED\n\n- Фінанси у detail більше не показуються одним плоским списком для \`issued/completed\`.\n- Service Worker кешує v4.3.21 presentation assets.\n\n### FIXED\n\n- Прибрана візуальна неоднозначність, де передоплата та залог стояли поруч із орендою/додатково/доставкою й могли сприйматися як витрати.\n\n### PRESERVED\n\n- Усі фінансові суми та формули.\n- Передоплата, залог, доставка, знижки, RETURN/referral, availability/resources, public booking і VA HOME.\n- Desktop і pre-issue detail states.\n\n### TESTS\n\n- \`scripts/test-v4-3-21-detail-finance.mjs\` — static contract: групування, формули presentation layer, відсутність backend mutation.\n- \`scripts/admin_detail_finance_v4321_qa.py\` — browser regression на 390/430 px: 2200 отримано, 1400 витрати, 800 до повернення, no horizontal overflow; negative control для \`confirmed\`.\n`;
  fs.writeFileSync(specPath,spec,'utf8');
}
for(const path of [workflowPath,helperPath]){
  if(fs.existsSync(path))fs.unlinkSync(path);
}
