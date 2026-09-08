import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const css=read('assets/admin-v4319.css');
const html=read('admin/bronuvannia/index.html');
const sw=read('admin/sw.js');
const nativeJs=read('assets/admin-v430.js');
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');

const checks=[];
const ck=(name,cond)=>{checks.push([name,Boolean(cond)]);console.log(`${cond?'PASS':'FAIL'}: ${name}`)};

const media='@media (min-width:901px) and (max-width:1024px) and (max-height:500px) and (orientation:landscape)';
ck('landscape repair uses the narrow phone-landscape media contract',css.includes(media));
ck('repair is scoped to production booking detail',css.includes('html.v43-prod .detail{')&&css.includes('html.v43-prod .detail-shell{')&&css.includes('html.v43-prod .detail-grid'));
ck('landscape detail becomes the vertical scroll owner',css.includes('overflow-y:auto!important')&&css.includes('overflow-x:hidden!important'));
ck('desktop hero photography is removed only inside the bridge',css.includes('html.v43-prod .detail-hero .hero-images')&&css.includes('display:none!important'));
ck('stretched desktop detail rows are neutralized',css.includes('grid-auto-rows:auto!important')&&css.includes('align-items:start!important')&&css.includes('min-height:0!important'));
ck('detail actions stay in content flow and keep touch targets',css.includes('html.v43-prod .detail-actions')&&css.includes('position:static!important')&&css.includes('min-height:44px!important'));
ck('bridge does not globally restyle navigation or admin views',!css.includes('.mobile-nav')&&!css.includes('.sidebar')&&!css.includes('[data-admin-view'));
ck('production shell loads v4.3.19 after the previous detail styles',html.includes('/assets/admin-v4319.css?v=4319')&&html.indexOf('/assets/admin-v4319.css?v=4319')>html.indexOf('/assets/admin-v4315.css?v=4315'));
ck('production shell carries v4319 marker',html.includes('v4315 v4316 v4319'));
ck('service worker cache is bumped for v4.3.19',sw.includes("const CACHE='vacleaner-manager-4319'"));
ck('service worker precaches the landscape stylesheet',sw.includes("'/assets/admin-v4319.css?v=4319'"));
ck('canonical Native mobile breakpoint remains 900px',nativeJs.includes("matchMedia('(max-width: 900px)')")&&!nativeJs.includes("matchMedia('(max-width: 1024px)')"));
ck('System Spec records the phone-landscape contract',spec.includes('PWA-LANDSCAPE-001')&&spec.includes('932×430'));

const failed=checks.filter(([,ok])=>!ok);
console.log(`TOTAL ${checks.length} · PASS ${checks.length-failed.length} · FAIL ${failed.length}`);
if(failed.length)process.exit(1);
