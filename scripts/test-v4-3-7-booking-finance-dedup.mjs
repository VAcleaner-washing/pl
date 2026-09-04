import fs from 'node:fs';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const js=fs.readFileSync('assets/admin-v437.js','utf8');
const css=fs.readFileSync('assets/admin-v437.css','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');

const checks=[
  ['production shell loads v4.3.7 finance assets',html.includes('/assets/admin-v437.css?v=4370')&&html.includes('/assets/admin-v437.js?v=4370')],
  ['received total owns the compact breakdown',js.includes('booking-finance-received-breakdown')&&css.includes('grid-template-areas:"label value" "helper value"')],
  ['normal paid or returned deposit is collapsed',js.includes("deposit.classList.toggle('booking-deposit-state--redundant',normalDeposit)")&&css.includes('.booking-deposit-state--redundant')&&css.includes('display:none!important')],
  ['pre-issue pending deposit is treated as expected, not an error',js.includes('expectedPending')&&js.includes('при видачі')],
  ['post-issue missing deposit stays visible as an exception',js.includes("'Залог не отримано'")&&js.includes("'· потрібна перевірка'")&&css.includes('.booking-deposit-state--exception')],
  ['legacy received copy is hidden',js.includes('booking-finance-received-legacy')&&css.includes('.booking-finance-received-legacy')],
  ['enhancer survives booking list re-renders',js.includes('new MutationObserver')&&js.includes('VACLEANER_ENHANCE_BOOKING_FINANCE')],
  ['system spec records v4.3.7 booking finance dedup',spec.includes('Change record — v4.3.7 BOOKING FINANCE DEDUP')]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`);if(!ok)failed++}
console.log(JSON.stringify({passed:checks.length-failed,failed}));
process.exit(failed?1:0);
