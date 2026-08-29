import fs from 'node:fs';
import pkg from '../package.json' with {type:'json'};
import rel from '../release.json' with {type:'json'};
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const e2e=fs.readFileSync('scripts/e2e_smoke.py','utf8');
const pwa=fs.readFileSync('scripts/pwa_visual_qa.py','utf8');
const desktop=fs.readFileSync('scripts/final_desktop_visual_qa.py','utf8');
const checks=[
 ['release coherent',pkg.version===rel.version&&rel.version==='4.2.15'&&Number(rel.build)===4215],
 ['settings uses existing push device helper',js.includes('${h(pushDeviceName())}')&&!js.includes('getPushDeviceName()')],
 ['production health keeps stable browser selector',js.includes('health-card operational-health-card')],
 ['delivery settings own full desktop width',css.includes('.delivery-settings-card{grid-column:1/-1}')],
 ['e2e understands global booking search hub',e2e.includes('Global search returns the matching booking')&&e2e.includes('[data-search-booking]')],
 ['pwa understands global search in analytics and clients',pwa.includes('analytics keeps the global admin search available')&&pwa.includes('client query opens the global search hub')],
 ['desktop search audit understands global search groups',desktop.includes('global search hub renders all four result groups')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}
if(bad)process.exit(1);console.log(`Browser contract guard: ${checks.length}/${checks.length}`);
