import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const js=fs.readFileSync('assets/admin-v4321.js','utf8');
const css=fs.readFileSync('assets/admin-v4321.css','utf8');

const checks=[
  [html.includes('v4321'),'admin html enables the v4.3.21 detail layer'],
  [/admin-v4321\.css\?v=\d+/.test(html),'admin html loads v4.3.21 css'],
  [/admin-v4321\.js\?v=\d+/.test(html),'admin html loads v4.3.21 js'],
  [js.includes("['issued','completed']"),'finance redesign is scoped to issued/completed bookings'],
  [js.includes('Отримано від клієнта')&&js.includes('Нараховано'),'finance separates received money from charges'],
  [js.includes("const received=(pre?.value||0)+(dep?.value||0)"),'received total is prepayment plus deposit'],
  [js.includes("const expenses=(rental?.value||0)+(extra?.value||0)+(delivery?.value||0)"),'expenses total excludes deposit and prepayment'],
  [js.includes("balance>=0?'До повернення':'До доплати'"),'settlement result distinguishes refund from amount due'],
  [css.includes('.v4321-fin-group.received')&&css.includes('.v4321-fin-group.charged'),'received and charged groups have distinct visual hierarchy'],
  [css.includes('.v4321-fin-tile.received')&&css.includes('.v4321-fin-tile.expenses'),'summary tiles expose received and expenses'],
  [css.includes('.v4321-fin-result'),'final settlement result has dedicated full-width treatment'],
  [!js.includes('fetch(')&&!js.includes('supabase'),'visual layer does not mutate backend or booking data'],
];

for(const [ok,label] of checks){
  assert.ok(ok,label);
  console.log('PASS:',label);
}
console.log(JSON.stringify({passed:checks.length,failed:0}));
