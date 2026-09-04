import fs from 'node:fs';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const css=fs.readFileSync('assets/admin-v436.css','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');

const checks=[
  ['production shell loads v4.3.6 finance layer',html.includes('/assets/admin-v436.css?v=4360')],
  ['desktop and mobile scopes are explicit',css.includes('@media(min-width:901px)')&&css.includes('@media(max-width:900px)')],
  ['desktop settlement summary is flat',css.includes('.modal-summary .finance-flow-summary')&&css.includes('border:0!important')&&css.includes('background:transparent!important')],
  ['money rows use a stable label/value axis',css.includes('grid-template-columns:minmax(0,1fr) auto!important')&&css.includes('justify-self:end!important')],
  ['received and expenses keep directional semantics',css.includes('.finance-flow-received')&&css.includes('#87ddb0')&&css.includes('.finance-flow-expenses')&&css.includes('#e09a90')],
  ['final result has explicit refund/due/neutral states',css.includes('.finance-flow-final.refund')&&css.includes('.finance-flow-final.due')&&css.includes('.finance-flow-final.neutral')],
  ['mobile booking deposit is flattened into the finance axis',css.includes('.booking-card .booking-finance>.booking-deposit-state')&&css.includes('grid-template-areas:"label value" "state value"')&&css.includes('border-radius:0!important')&&css.includes('background:transparent!important')],
  ['mobile booking settlement result is not a second card',css.includes('.booking-card .booking-finance>em')&&css.includes('border-top:1px solid rgba(255,255,255,.055)!important')&&css.includes('box-shadow:none!important')],
  ['mobile settlement modal removes the table-in-a-card shell',css.includes('.finance-form .modal-summary')&&css.includes('.finance-flow-group+.finance-flow-group')&&css.includes('.finance-flow-title+div')],
  ['deposit helper is rendered below its label instead of inline',css.includes('.finance-flow-group>div>span>small')&&css.includes('display:block!important')],
  ['system spec records v4.3.6 finance flow consistency',spec.includes('Change record — v4.3.6 FINANCE FLOW CONSISTENCY')]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}: ${name}`);
  if(!ok)failed++;
}
console.log(JSON.stringify({passed:checks.length-failed,failed}));
process.exit(failed?1:0);
