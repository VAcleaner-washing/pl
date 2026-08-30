import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const specPath='docs/VAcleaner-SYSTEM-SPEC.md';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const release=JSON.parse(fs.readFileSync('release.json','utf8'));
const errors=[];

if(!fs.existsSync(specPath)){
  console.error('SYSTEM SPEC: missing '+specPath);
  process.exit(1);
}
const spec=fs.readFileSync(specPath,'utf8');
const required=[
  `**Baseline version:** ${pkg.version}`,
  `**Baseline build:** ${release.build}`,
  `Change record — v${pkg.version}`,
  'REL-005 — System Spec є release gate',
  'BOOK-001 — основні статуси',
  'ADDR-001 — адреса є в кожному admin booking',
  'RET-001 — SMS sent ≠ active',
  'REF-001 — персональний код',
  'DEL-005 — останні 30 доставок з чесними знаменниками',
  'DEL-011 — локальний маршрут теж зберігається',
  'FIN-005 — комплекти',
  'CLIENT-001 — дані картки',
  'PWA-001 — edge-to-edge shell + bottom navigation',
  'UI-008 — finance surfaces',
  'ERR-001 — кнопка не може «нічого не робити»',
  'WEB-001 — роль публічного сайту',
  'TECH-002 — products, ціни та resources',
  'QUIZ-008 — product decision matrix',
  'QUIZ-011 — quiz → booking continuity',
  'PUBBOOK-001 — booking має 4 робочі кроки',
  'PUBADDR-003 — manual fallback',
  'PUBVIS-005 — booking responsive',
  'SEO-001 — canonical / sitemap / robots',
  'CROSS-001 — config → cards → booking → backend',
  "AI-ROLE-001 — роль виконавця",
  "AI-RULE-001 — тільки актуальна production-база",
  "AI-RULE-002 — перевірка репозиторію перед змінами",
  "AI-RULE-003 — `main` не використовується для тестування",
  "AI-RULE-004 — усі зміни тільки в `qa/vX.X.X-*`",
  "AI-RULE-005 — scope lock бізнес-логіки",
  "AI-RULE-006 — QA кожної частини продукту окремо",
  "AI-RULE-007 — повний regression QA після кожного fix",
  "AI-RULE-008 — зелений build ≠ готовий реліз",
  "AI-RULE-009 — перевірка Actions, deploy і `release.json`",
  "AI-RULE-010 — ізоляція VA HOME у спільному Supabase",
  "AI-RULE-011 — Source of Truth оновлюється з кожною зміною",
];
for(const token of required) if(!spec.includes(token)) errors.push(`missing spec contract: ${token}`);

// Every release must carry meaningful change documentation, not only a version stamp.
const changeMarker=`Change record — v${pkg.version}`;
const markerPos=spec.indexOf(changeMarker);
const changeStart=markerPos>=0?spec.lastIndexOf('\n# ',markerPos): -1;
const changeBlock=changeStart>=0?spec.slice(changeStart):'';
for(const heading of ['### ADDED','### CHANGED','### FIXED','### PRESERVED','### TESTS']){
  if(!changeBlock.includes(heading)) errors.push(`current change record missing ${heading}`);
}

// In GitHub CI, prevent behavioral changes from landing without touching the normative spec.
// Local ZIPs may not contain .git; in that case static contract checks above are still enforced.
const isGit=fs.existsSync('.git');
if(isGit && process.env.GITHUB_ACTIONS==='true' && process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'){
  let base='';
  try{
    const eventPath=process.env.GITHUB_EVENT_PATH;
    const event=eventPath&&fs.existsSync(eventPath)?JSON.parse(fs.readFileSync(eventPath,'utf8')):{};
    if(process.env.GITHUB_EVENT_NAME==='pull_request') base=event?.pull_request?.base?.sha||'';
    else if(process.env.GITHUB_EVENT_NAME==='push') base=event?.before||'';
    if(!base || /^0+$/.test(base)) base='origin/main';
    const changed=execFileSync('git',['diff','--name-only',`${base}...HEAD`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
    const behaviorPatterns=[
      /^assets\/(admin-|vacleaner-core|public-|site-|booking-|home-).+\.(?:js|css)$/,
      /^admin\//,
      /^bronuvannia\//,
      /^pidbir\//,
      /^rishennia\//,
      /^komplekty\//,
      /^tekhnika\//,
      /^blog\//,
      /^(?:index\.html|faq\/|dostavka\/|umovy\/|yak-tse-pratsiuie\/|vidhuky\/|kontakty\/|pro-nas\/)/,
      /^(?:sitemap\.xml|robots\.txt)$/,
      /^config\/(?:vacleaner|seo-map)\.json$/,
      /^supabase\/functions\/vacleaner-/,
      /^supabase\/migrations\//,
      /^app\//,
      /^src\//,
      /^components\//,
      /^\.github\/workflows\//,
    ];
    const behavioral=changed.filter(file=>behaviorPatterns.some(re=>re.test(file)));
    if(behavioral.length && !changed.includes(specPath)){
      errors.push(`behavior changed without ${specPath}: ${behavioral.slice(0,12).join(', ')}${behavioral.length>12?' …':''}`);
    }
  }catch(error){
    errors.push(`cannot verify System Spec diff gate: ${error.message}`);
  }
}

if(errors.length){
  console.error('SYSTEM SPEC CONTRACT: FAIL');
  for(const error of errors) console.error(' - '+error);
  process.exit(1);
}
console.log(`SYSTEM SPEC CONTRACT: PASS · v${pkg.version} build ${release.build}`);
