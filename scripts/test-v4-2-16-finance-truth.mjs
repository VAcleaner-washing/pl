import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const rel=JSON.parse(fs.readFileSync('release.json','utf8'));
const checks=[
 ['release coherent',pkg.version===rel.version&&rel.version==='4.2.16'&&Number(rel.build)===4216],
 ['sidebar renders finances once',!js.includes("return id==='analytics'?`<button data-view=\"finances\"" )],
 ['payback uses purchase equipment only',js.includes("x.cost_type==='investment'&&x.category==='equipment'")],
 ['payback excludes improvement as purchase price',js.includes('ремонт і модернізації')],
 ['delivery never renders dash distance tier',!js.includes("`До ${meta.quote.maxKm||'—'} км`")],
 ['unknown delivery distance does not fabricate profit',js.includes('прибуток не вигадуємо')&&js.includes('unknownCount')],
 ['city delivery uses both cars average consumption',js.includes('cityConsumption')&&js.includes('10,5 л/100')],
 ['finance truth styles exist',css.includes('v4.2.16 — finance truth UX')&&css.includes('.ops-footnote')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}if(bad)process.exit(1);console.log(`Finance truth: ${checks.length}/${checks.length}`);
