// Release-gate retrigger after normalizing the v4.3.21 branch history.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const js=fs.readFileSync('assets/admin-v4321.js','utf8');
const css=fs.readFileSync('assets/admin-v4321.css','utf8');
const sw=fs.readFileSync('admin/sw.js','utf8');

const checks=[
  [html.includes('v4321')&&html.includes('/assets/admin-v4321.css?')&&html.includes('/assets/admin-v4321.js?'),'admin shell loads v4.3.21 detail layer'],
  [js.includes('Отримано від клієнта')&&js.includes('Нараховано'),'finance detail separates received money from charges'],
  [js.includes("const received=factualPrepayment+factualDeposit")&&js.includes('const expenses=rental+extras+delivery'),'summary math has explicit received and expense totals'],
  [js.includes("['issued','completed'].includes(status)?deposit:0"),'deposit is factual received money only after issue'],
  [js.includes("balance>=0?'До повернення':'До доплати'"),'final result supports refund and due states'],
  [css.includes('.v4321-finance-group.received')&&css.includes('.v4321-finance-group.charged'),'finance groups keep directional color semantics'],
  [css.includes('.v4321-summary-card.received')&&css.includes('.v4321-summary-card.expenses')&&css.includes('.v4321-summary-result'),'finance summary has received expenses and final result'],
  [/vacleaner-manager-(?:4321|4300)/.test(sw)&&sw.includes('/assets/admin-v4321.css?')&&sw.includes('/assets/admin-v4321.js?'),'service worker preloads the new detail layer before and after build stamping'],
];
for(const [ok,label] of checks){assert.ok(ok,label);console.log('PASS:',label)}
console.log(JSON.stringify({passed:checks.length,failed:0}));
