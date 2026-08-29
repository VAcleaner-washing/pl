import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const atLeast=(actual,target)=>{const a=String(actual).split('.').map(Number),b=String(target).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
const checks=[
 ['release coherent',pkg.version===rel.version&&atLeast(rel.version,'4.2.16')&&Number(rel.build)>=4216],
 ['sidebar renders finances once', (js.match(/nav\('finances','Фінанси'/g)||[]).length===1],
 ['payback uses explicit start baselines',js.includes('DEFAULT_EQUIPMENT_BASELINES')&&js.includes('getEquipmentBaselines()')&&js.includes('startCost')],
 ['payback separates extra investment from start cost',js.includes('extraInvestment')&&js.includes('totalCapital:startCost+extraInvestment')],
 ['delivery never renders dash distance tier',!js.includes("`До ${meta.quote.maxKm||'—'} км`")],
 ['unknown delivery distance does not fabricate fuel profit',js.includes('unknownCount')&&js.includes('knownCount')&&js.includes("else row.unknownCount++")],
 ['city delivery uses both cars average consumption',js.includes('cityConsumption')&&js.includes("consumptionL100:11")&&js.includes("consumptionL100:10")],
 ['finance truth styles exist',css.includes('v4.2.16 — finance truth UX')&&css.includes('.ops-footnote')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}if(bad)process.exit(1);console.log(`Finance truth: ${checks.length}/${checks.length}`);
