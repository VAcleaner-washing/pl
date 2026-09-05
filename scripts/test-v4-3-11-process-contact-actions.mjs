import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const html=read('admin/bronuvannia/index.html');
const css=read('assets/admin-v4311.css');
const js=read('assets/admin-v4311.js');

const checks=[];
const check=(ok,label)=>{checks.push([Boolean(ok),label]); console.log(`${ok?'PASS':'FAIL'}: ${label}`)};

check(html.includes('/assets/admin-v4311.css?'),'admin shell loads v4.3.11 CSS with stamp-safe asset query');
check(html.includes('/assets/admin-v4311.js?'),'admin shell loads v4.3.11 JS with stamp-safe asset query');
check(css.includes('.process-form .process-actions a.btn'),'process contact links share one scoped button treatment');
check(css.includes('display:inline-flex!important'),'process anchor buttons use flex alignment');
check(css.includes('align-items:center!important')&&css.includes('justify-content:center!important'),'process anchor labels are centered on both axes');
check(css.includes('text-decoration:none!important'),'process anchor buttons suppress link underline');
check(js.includes("current==='Подзвонити'"),'legacy process call label is explicitly recognized');
check(js.includes("call.textContent='Зателефонувати'"),'manager-facing process call label is Зателефонувати');
check(js.includes('a.btn[href^="tel:"]'),'copy change is scoped to the existing tel action');
check(js.includes("call.setAttribute('aria-label','Зателефонувати клієнту')"),'call action has matching accessible label');

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error(`v4.3.11 process contact regression: ${failed.length} failed`);
  process.exit(1);
}
console.log(`v4.3.11 process contact regression: ${checks.length}/${checks.length} PASS`);
