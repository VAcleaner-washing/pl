import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const selectPositions=[...js.matchAll(/<select\b/g)].map(match=>match.index);
const checkboxPositions=[...js.matchAll(/<input[^>]+type="checkbox"/g)].map(match=>match.index);
const allSelectsCovered=selectPositions.length===6&&selectPositions.every(index=>{const prefix=js.slice(Math.max(0,index-220),index);return prefix.includes('class="field"')||prefix.includes('clients-toolbar')});
const allCheckboxesCovered=checkboxPositions.length===14&&checkboxPositions.every(index=>{const prefix=js.slice(Math.max(0,index-180),index);return prefix.includes('class="switch')||prefix.includes('class="extra-check')});
const checks=[
 ['operations dashboard',js.includes('operationsBar()')&&css.includes('.operations-bar')],
 ['urgent schedule labels',js.includes('scheduleMeta(b)')&&css.includes('.schedule-badge.danger')],
 ['search clear and shortcut',js.includes('id=\"clearSearch\"')&&js.includes("e.key==='/'")],
 ['offline state keeps session',js.includes('renderLoadError(e)')&&!js.includes("catch(e){clearSession();auth()}" )],
 ['retry state',js.includes('id=\"retryLoad\"')&&css.includes('.load-state')],
 ['loading skeleton',js.includes('renderLoading()')&&css.includes('@keyframes vac-skeleton')],
 ['action hierarchy',js.includes('primary-action')&&css.includes('.booking-actions .primary-action')],
 ['upcoming filters',js.includes('data-upcoming-scope')&&css.includes('.upcoming-scope')],
 ['premium native selects',css.includes('color-scheme:dark')&&css.includes('appearance:none')&&css.includes('.field select option')],
 ['unified checkbox visual',css.includes('input[type="checkbox"]:checked')&&css.includes('.switch:has(input:checked)')],
 ['all admin selects covered',allSelectsCovered],
 ['all admin checkboxes covered',allCheckboxesCovered],
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error(failed.map(([name])=>name).join('\n'));process.exit(1)}
console.log(`UX tests passed: ${checks.length} scenarios.`);
