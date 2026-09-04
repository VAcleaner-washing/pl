import fs from 'node:fs';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const css=fs.readFileSync('assets/admin-v436.css','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');

const checks=[
  ['production shell loads v4.3.6 finance layer',html.includes('/assets/admin-v436.css?v=4360')],
  ['desktop-only scope',css.includes('@media(min-width:901px)')],
  ['finance summary is flat',css.includes('.finance-flow-summary')&&css.includes('border:0!important')&&css.includes('background:transparent!important')],
  ['money rows use label/value axis',css.includes('grid-template-columns:minmax(0,1fr) auto!important')&&css.includes('justify-self:end!important')],
  ['received and expenses keep directional semantics',css.includes('.finance-flow-received')&&css.includes('#87ddb0')&&css.includes('.finance-flow-expenses')&&css.includes('#e09a90')],
  ['final result has explicit refund/due/neutral states',css.includes('.finance-flow-final.refund')&&css.includes('.finance-flow-final.due')&&css.includes('.finance-flow-final.neutral')],
  ['mobile PWA presentation is untouched by this layer',!css.includes('@media(max-width:900px)')],
  ['system spec records v4.3.6 desktop finance flow',spec.includes('Change record — v4.3.6 DESKTOP FINANCE FLOW')]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}: ${name}`);
  if(!ok)failed++;
}
console.log(JSON.stringify({passed:checks.length-failed,failed}));
process.exit(failed?1:0);
