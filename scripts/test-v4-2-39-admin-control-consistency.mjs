import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const checks=[
 ['version 4.2.39',pkg.version==='4.2.39'&&rel.version==='4.2.39'&&rel.build===4239],
 ['single shared period renderer',js.includes('function adminPeriodControls(period)')&&js.includes('${adminPeriodControls(period)}')&&js.includes('function expensePeriodControls(period){return adminPeriodControls(period)}')],
 ['all five canonical period labels', ['7 днів','30 днів','Місяць','Рік','Увесь час'].every(x=>js.includes(x))],
 ['mobile shared 3-column geometry',css.includes('.admin-periods,.analytics-periods{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))')],
 ['narrow desktop overflow guard',css.includes('@media(min-width:901px) and (max-width:1320px)')&&css.includes('grid-template-columns:repeat(5,minmax(0,1fr))')],
 ['finance no special nowrap override at authority layer',css.includes('.finance-period-row .admin-periods,.finance-period-row .analytics-periods{overflow:visible;flex-wrap:initial}')],
 ['PWA touch target 44px',css.includes('.admin-periods .chip,.analytics-periods .chip{width:100%;min-width:0;min-height:44px')],
];
let fail=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${label}`);if(!ok)fail++}if(fail)process.exit(1);console.log(`v4.2.39 admin control consistency: ${checks.length}/${checks.length} PASS`);
