import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const glass=fs.readFileSync('assets/admin-glass-test.css','utf8');
const checks=[
  ['version 4.2.40',pkg.version==='4.2.40'&&rel.version==='4.2.40'&&rel.build===4240],
  ['finance period row fills mobile width',/\.finance-period-row\{[\s\S]*?display:block;[\s\S]*?width:100%/.test(css)],
  ['shared period grid is three equal columns',/\.finance-period-row \.admin-periods,[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css)],
  ['period buttons fill cells',/\.finance-period-row \.chip,[\s\S]*?width:100%/.test(css)],
  ['client modal owns full viewport width',/\.modal-card:has\(\.client-card-form\)\{[\s\S]*?inset:0;[\s\S]*?width:100%;[\s\S]*?max-width:none/.test(css)],
  ['client form descendants are full width',/\.client-card-form,[\s\S]*?\.client-card-form>footer\{[\s\S]*?width:100%/.test(css)],
  ['deposit is full-width row 3',/\.booking-card \.booking-finance>\.booking-deposit-state\{[\s\S]*?grid-column:1\/-1;[\s\S]*?grid-row:3;[\s\S]*?width:100%/.test(css)],
  ['settlement follows deposit as row 4',/\.booking-card \.booking-finance>em\{[\s\S]*?grid-column:1\/-1;[\s\S]*?grid-row:4;[\s\S]*?width:100%/.test(css)],
  ['glass layer mirrors client full-width contract',/html\.glass-test \.modal-card:has\(\.client-card-form\)[\s\S]*?width:100%;max-width:none/.test(glass)],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`); if(!ok)failed++}
console.log(`v4.2.40 mobile geometry: ${checks.length-failed}/${checks.length} PASS`); if(failed)process.exit(1);
