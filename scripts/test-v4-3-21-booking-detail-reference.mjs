// v4.3.21 release-candidate regression: reference booking detail remains UI-only.
import fs from 'node:fs';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const css=fs.readFileSync('assets/admin-v4321.css','utf8');
const js=fs.readFileSync('assets/admin-v4321.js','utf8');
const sw=fs.readFileSync('admin/sw.js','utf8');
const core=fs.readFileSync('assets/admin-v250.js','utf8');

const ok=(cond,label)=>{if(!cond)throw new Error(label);console.log('PASS:',label)};
const cssAsset=/\/assets\/admin-v4321\.css\?v=(?:4321|43\\d+)/;
const jsAsset=/\/assets\/admin-v4321\.js\?v=(?:4321|43\\d+)/;

ok(/\bv4321\b/.test(html),'admin enables v4.3.21 booking-detail layer');
ok(cssAsset.test(html),'admin loads v4.3.21 CSS from source or stamped build');
ok(jsAsset.test(html),'admin loads v4.3.21 JS from source or stamped build');
ok(html.indexOf('admin-v4321.css')>html.indexOf('admin-v4320.css'),'v4.3.21 CSS loads after v4.3.20');
ok(html.indexOf('admin-v4321.js')>html.indexOf('admin-v430.js'),'v4.3.21 enhancer loads after native detail enhancer');
ok(/vacleaner-manager-(?:4321|43\\d+)/.test(sw),'service worker cache follows source or stamped v4.3.21 namespace');
ok(cssAsset.test(sw)&&jsAsset.test(sw),'service worker caches v4.3.21 assets');

new Function(js);
ok(js.includes("querySelector('.native-detail-card')"),'enhancer builds on the existing native detail card');
ok(js.includes("querySelector('.finance-panel')"),'finance source remains the existing finance panel');
ok(js.includes("classList.contains('received-total')"),'received total comes from existing finance truth');
ok(js.includes("classList.contains('expenses-total')"),'expense total comes from existing finance truth');
ok(js.includes("querySelector(':scope > .balance')"),'settlement comes from existing balance truth');
ok(js.includes("className='v4321-finance-card'"),'reference finance card is rendered');
ok(js.includes("className='v4321-history-row'"),'booking history row is rendered');
ok(js.includes("detail.classList.toggle('v4321-history-open')"),'booking history row opens the live audit panel');
ok(js.includes("button.dataset.action"),'existing action identities are only enhanced, not replaced');
ok(!js.includes('handleAction(')&&!js.includes('updateStatus(')&&!js.includes('calc('),'v4.3.21 layer does not duplicate business/action calculations');

ok(css.includes('@media(max-width:900px)'),'reference layer is mobile-scoped');
ok(css.includes('.native-detail-info-row[data-v4321-row="date"]'),'date row is removed from the card because period stays in the hero');
ok(css.includes('.native-detail-info-row[data-v4321-row="finance"]'),'legacy inline finance row is removed from the info card');
ok(css.includes('.v4321-finance-summaries'),'received/expense summary tiles are styled');
ok(css.includes('.v4321-finance-balance'),'settlement band is styled');
ok(css.includes('.v4321-history-open .audit-panel'),'live booking history can be expanded');
ok(css.includes('.v4321-actions>.v4321-primary-action'),'primary booking action spans the first action row');
ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'secondary booking actions use a two-column reference layout');
ok(css.includes('@media(max-width:350px)'),'narrow-phone fallback exists');

ok(core.includes('function actions(b)'),'core action renderer remains present');
ok(core.includes('function moneyRows(b,f)'),'core finance renderer remains present');
ok(core.includes('data-action="complete">Прийняти повернення'),'issued return action remains owned by core logic');
ok(core.includes('data-action="extend">Продовжити оренду'),'extend-rental action remains owned by core logic');

console.log(JSON.stringify({passed:30,failed:0}));