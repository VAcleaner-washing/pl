import fs from 'node:fs';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const css=fs.readFileSync('assets/admin-v4320.css','utf8');
const sw=fs.readFileSync('admin/sw.js','utf8');

const ok=(cond,label)=>{if(!cond)throw new Error(label);console.log('PASS:',label)};
const asset=/\/assets\/admin-v4320\.css\?v=(?:4320|4300)/;

ok(/\bv4320\b/.test(html),'admin enables v4.3.20 UI layer');
ok(asset.test(html),'admin loads v4.3.20 CSS from source or stamped build');
ok(html.indexOf('admin-v4320.css')>html.indexOf('admin-v4319.css'),'v4.3.20 CSS loads after v4.3.19');
ok(css.includes('grid-template-columns:minmax(0,1fr) max-content!important'),'long title uses a dedicated status column');
ok(css.includes('grid-column:2!important')&&css.includes('grid-row:1!important'),'status stays in the top-right grid cell');
ok(css.includes('width:auto!important')&&css.includes('min-width:0!important'),'equipment title may shrink/wrap without pushing status down');
ok(asset.test(sw),'service worker preloads the new CSS layer from source or stamped build');
ok(/vacleaner-manager-(?:4320|4300)/.test(sw),'service worker cache follows source or stamped namespace');

console.log('v4.3.20 upcoming status static QA passed');
