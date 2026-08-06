import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const checks=[
 ['operations dashboard',js.includes('operationsBar()')&&css.includes('.operations-bar')],
 ['urgent schedule labels',js.includes('scheduleMeta(b)')&&css.includes('.schedule-badge.danger')],
 ['search clear and shortcut',js.includes('id=\"clearSearch\"')&&js.includes("e.key==='/'")],
 ['offline state keeps session',js.includes('renderLoadError(e)')&&!js.includes("catch(e){clearSession();auth()}" )],
 ['retry state',js.includes('id=\"retryLoad\"')&&css.includes('.load-state')],
 ['loading skeleton',js.includes('renderLoading()')&&css.includes('@keyframes vac-skeleton')],
 ['action hierarchy',js.includes('primary-action')&&css.includes('.booking-actions .primary-action')],
 ['upcoming filters',js.includes('data-upcoming-scope')&&css.includes('.upcoming-scope')],
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error(failed.map(([name])=>name).join('\n'));process.exit(1)}
console.log(`UX tests passed: ${checks.length} scenarios.`);
