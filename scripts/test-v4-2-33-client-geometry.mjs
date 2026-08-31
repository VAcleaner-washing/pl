import fs from 'node:fs';

const js=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const release=JSON.parse(fs.readFileSync(new URL('../release.json',import.meta.url),'utf8'));
const spec=fs.readFileSync(new URL('../docs/VAcleaner-SYSTEM-SPEC.md',import.meta.url),'utf8');

const checks=[
  ['package version is v4.2.33 or newer',(()=>{const a=pkg.version.split('.').map(Number),b=[4,2,33];for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false}return true})()],
  ['release version matches package',release.version===pkg.version],
  ['release build is 4233 or newer',Number(release.build)>=4233],
  ['client grid preserves a deliberate desktop structure',js.includes('client-card-grid-v245')&&css.includes("grid-template-areas:'contact history' 'benefits benefits' 'document document' 'sms sms'")],
  ['referral section remains present',js.includes('client-referral-section')],
  ['permanent next-action card is removed from the client profile',!js.slice(js.indexOf('function openClientCard('),js.indexOf('function localDateIso',js.indexOf('function openClientCard('))).includes('clientNextBestActionMarkup')],
  ['history is primary while benefits/document/SMS are secondary disclosures',js.includes('client-history-section-v245')&&js.includes('client-benefits-section')&&js.includes('client-secondary-section client-document-section')&&js.includes('client-secondary-section client-sms-section')],
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
