import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const release=JSON.parse(fs.readFileSync('release.json','utf8'));
const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-glass-test.css','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');

const checks=[
  ['release is v4.2.41 build 4241',pkg.version==='4.2.41'&&release.version==='4.2.41'&&release.build===4241],
  ['desktop navigation exposes current page',js.includes('aria-current="${active?\'page\':\'false\'}"')],
  ['all navigation states synchronize semantically',js.includes('function syncControlSemantics(root=document)')&&js.includes("button.setAttribute('aria-current',button.dataset.view===state.view?'page':'false')")],
  ['choice chips expose pressed state',js.includes("button.setAttribute('aria-pressed',button.classList.contains('active')?'true':'false')")],
  ['compact view announces its state and next action',js.includes("compact.setAttribute('aria-pressed',enabled?'true':'false')")&&js.includes('Увімкнено компактний вигляд. Показати звичайний')],
  ['More menu exposes expanded state',js.includes("more.setAttribute('aria-expanded',moreOpen?'true':'false')")],
  ['More dismissal restores keyboard focus',js.includes('restoreFocus&&trigger&&document.contains(trigger)')&&js.includes('trigger.focus({preventScroll:true})')],
  ['active desktop nav has one restrained highlight',css.includes('.nav button[aria-current="page"]')&&css.includes('background:linear-gradient(90deg,rgba(226,177,103,.13)')],
  ['focus state is visible across control types',css.includes(':where(button,a,input,select,textarea,[role="button"]):focus-visible')],
  ['iPhone form controls cannot trigger input zoom',css.includes('html.glass-test :where(input,select,textarea){font-size:16px}')],
  ['reduced-motion contract covers the full admin',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('animation-duration:.01ms!important')],
  ['System Spec records v4.2.41 interaction contract',spec.includes('# 49. Change record — v4.2.41')&&spec.includes('ADMIN-UX-001')]
];

let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${label}`);if(!ok)failed++}
if(failed)process.exit(1);
console.log(`v4.2.41 ADMIN UX SYSTEM: ${checks.length}/${checks.length} PASS`);
