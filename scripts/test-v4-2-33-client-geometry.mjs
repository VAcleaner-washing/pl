import fs from 'node:fs';

const js=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const release=JSON.parse(fs.readFileSync(new URL('../release.json',import.meta.url),'utf8'));
const spec=fs.readFileSync(new URL('../docs/VAcleaner-SYSTEM-SPEC.md',import.meta.url),'utf8');

const checks=[
  ['package version 4.2.33',pkg.version==='4.2.33'],
  ['release version 4.2.33',release.version==='4.2.33'],
  ['release build 4233',release.build===4233],
  ['client grid uses independent desktop columns',js.includes('client-card-column client-card-column-contact')&&js.includes('client-card-column client-card-column-document')&&js.includes('client-card-column client-card-column-history')],
  ['referral section remains present',js.includes('client-referral-section')],
  ['next action stays conditional',js.includes("editable?clientNextBestActionMarkup(client,rentals):''")],
  ['history column also carries promo and sms',js.includes('client-card-column-history')&&js.indexOf('client-history-section')<js.indexOf('client-promo-section')&&js.indexOf('client-promo-section')<js.indexOf('client-sms-section')],
  ['desktop modal explicitly centered',css.includes('.modal-card:has(.client-card-form){justify-self:center;margin-inline:auto}')],
  ['hidden scrollbar does not reserve one-sided gutter',css.includes('.client-editor-scroll{scrollbar-gutter:auto;padding-inline:20px}')],
  ['client content has centered max width',css.includes('max-width:1296px;margin-inline:auto')],
  ['desktop client columns render as independent grids',css.includes('.client-card-column{display:grid;gap:12px;align-content:start;min-width:0}')],
  ['smaller breakpoints flatten wrappers',css.includes('@media (max-width:1220px)')&&css.includes('.client-card-column{display:contents}')],
  ['mobile booking card body is compacted',css.includes('.booking-card .booking-row-body>div{padding-top:8px;padding-bottom:8px}')],
  ['mobile booking finance pills are compacted',css.includes('.booking-card .booking-finance>.booking-deposit-state{min-height:44px}')],
  ['mobile flags are compacted',css.includes('.booking-mobile-flags span{min-height:22px}')],
  ['spec has CLIENT-007 centering contract',spec.includes('CLIENT-007')&&spec.includes('незалежні вертикальні колонки')],
  ['spec has v4.2.33 record',spec.includes('Change record — v4.2.33')],
];

let fail=0;
for(const [name,ok] of checks){
  if(ok) console.log('PASS',name);
  else {console.error('FAIL',name); fail++;}
}
console.log(`v4.2.33 client geometry: ${checks.length-fail}/${checks.length} PASS`);
if(fail) process.exit(1);
