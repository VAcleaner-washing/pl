import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const html=read('admin/bronuvannia/index.html');
const css=read('assets/admin-v4311.css');
const js=read('assets/admin-v4311.js');

const checks=[];
const check=(ok,label)=>{checks.push([Boolean(ok),label]); console.log(`${ok?'PASS':'FAIL'}: ${label}`)};

check(html.includes('/assets/admin-v4311.css?'),'admin shell loads v4.3.11 CSS with stamp-safe asset query');
check(html.includes('/assets/admin-v4311.js?'),'admin shell loads v4.3.11 JS with stamp-safe asset query');
check(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),'process contact actions use a balanced two-column grid');
check(css.includes('min-height:54px!important'),'all process contact actions share one touch height');
check(css.includes('border-radius:16px!important'),'all process contact actions share one radius');
check(css.includes('font-size:16px!important'),'process contact labels remain comfortably readable on iPhone');
check(css.includes('text-decoration:none!important'),'process link-backed buttons suppress link underline');
check(css.includes('.process-actions > .btn.primary')&&css.includes('background:rgba(226,176,87,.10)!important'),'preferred channel uses restrained gold tint instead of a solid gold slab');
check(css.includes('#sendInstagram::before')&&css.includes('#sendTelegram::before'),'messenger actions have consistent channel icons');
check(css.includes('button.btn::before')&&css.includes('a.btn[href^="tel:"]::before'),'copy and call actions have matching functional icons');
check(js.includes("current==='Подзвонити'"),'legacy process call label is explicitly recognized');
check(js.includes("call.textContent='Зателефонувати'"),'manager-facing process call label is Зателефонувати');
check(js.includes('a.btn[href^="tel:"]'),'copy change is scoped to the existing tel action');
check(js.includes("call.setAttribute('aria-label','Зателефонувати клієнту')"),'call action has matching accessible label');

const failed=checks.filter(([ok])=>!ok);
if(failed.length){
  console.error(`v4.3.11 process contact regression: ${failed.length} failed`);
  for(const [,label] of failed) console.error(` - ${label}`);
  process.exit(1);
}
console.log(`v4.3.11 process contact regression: ${checks.length}/${checks.length} PASS`);
