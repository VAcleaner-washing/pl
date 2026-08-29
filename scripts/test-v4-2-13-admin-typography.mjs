import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const atLeast=(actual,target)=>{const a=String(actual).split('.').map(Number),b=String(target).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
const checks=[
 ['release metadata is coherent',pkg.version===rel.version&&atLeast(rel.version,'4.2.13')&&Number(rel.build)>=4213],
 ['admin ops UX layer exists',css.includes('v4.2.14 — admin ops UX')],
 ['global search is available',js.includes('renderGlobalSearch')],
 ['weekly report card is available',js.includes('weeklyOpsReportMarkup')],
 ['client next action card is available',js.includes('clientNextBestActionMarkup')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}if(bad)process.exit(1);console.log(`Admin typography: ${checks.length}/${checks.length}`);
