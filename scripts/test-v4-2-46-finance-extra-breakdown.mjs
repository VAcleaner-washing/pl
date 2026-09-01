import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');
const checks=[
 ['breakdown helper',js.includes('function extrasBreakdownText(b)')],
 ['nozzles category',js.includes('Насадки ${money(groups.nozzles)}')],
 ['supplies category',js.includes('Засоби ${money(groups.supplies)}')],
 ['live summary uses breakdown',js.includes('finance-extra-breakdown')&&js.includes('extrasBreakdownText(b)')],
 ['mobile-safe styling',css.includes('.finance-form .finance-extra-breakdown')&&css.includes('max-width:28ch')],
 ['spec guard',spec.includes('Change record — v4.2.46 FINANCE EXTRA BREAKDOWN')]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`);if(!ok)fail++;}
console.log(JSON.stringify({passed:checks.length-fail,failed:fail}));process.exit(fail?1:0);
