import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const html=read('admin/bronuvannia/index.html');
const sw=read('admin/sw.js');
const js=read('assets/admin-v4322.js');
const css=read('assets/admin-v4322.css');
const previous=read('assets/admin-v4321.js');
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const ok=(condition,label)=>{if(!condition)throw new Error(label);console.log('PASS:',label)};
const cssAsset=/\/assets\/admin-v4322\.css\?v=(?:4322|4300)/;
const jsAsset=/\/assets\/admin-v4322\.js\?v=(?:4322|4300)/;

new Function(js);
ok(/\bv4322\b/.test(html),'admin shell enables v4.3.22 layer');
ok(cssAsset.test(html)&&jsAsset.test(html),'admin shell loads v4.3.22 CSS and JS');
ok(html.indexOf('admin-v4322.css')>html.indexOf('admin-v4321.css'),'v4.3.22 CSS loads after v4.3.21');
ok(html.indexOf('admin-v4322.js')>html.indexOf('admin-v4321.js'),'v4.3.22 JS loads after v4.3.21');
ok(sw.includes("vacleaner-manager-4322"),'service worker cache advances to v4.3.22');
ok(cssAsset.test(sw)&&jsAsset.test(sw),'service worker precaches v4.3.22 assets');

ok(js.includes("querySelector('.v4321-finance-card')"),'polish reads the existing v4.3.21 finance surface');
ok(js.includes("querySelector('.v4321-finance-head > div')?.remove()"),'duplicated finance headline total is removed');
ok(js.includes("heading.textContent='Отримано'"),'received group uses compact “Отримано” label');
ok(js.includes("setLeadingLabel(span,'Застава','повертається після розрахунку')"),'deposit presentation uses “Застава” with return helper');
ok(js.includes("heading.textContent='Нараховано'"),'charges group remains explicit');
ok(js.includes("chargedLabel.textContent='Нараховано'"),'summary replaces duplicate “Витрати” wording with “Нараховано”');
ok(js.includes("setButtonLabel(finance,'Деталі розрахунку')"),'completed finance action is renamed without changing its data-action');
ok(js.includes("correction.click()"),'“Ще” delegates status correction to the canonical existing control');
ok(js.includes("status!=='completed'"),'completed-action hierarchy is scoped to completed bookings');
ok(!js.includes('calc(')&&!js.includes('moneyRows(')&&!js.includes('handleAction(')&&!js.includes('fetch('),'v4.3.22 does not duplicate finance/action/backend logic');

ok(css.includes('border:0!important')&&css.includes('background:transparent!important'),'inner finance groups are flattened into one surface');
ok(css.includes('.v4322-completed-actions>.v4322-details-action'),'completed detail action gets dedicated hierarchy');
ok(css.includes('.v4322-completed-actions>.v4322-hidden-status{display:none!important}'),'direct status correction is visually moved behind “Ще”');
ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'secondary completed actions share a two-column row');
ok(css.includes('@media(max-width:350px)'),'narrow-phone containment remains explicit');

ok(previous.includes("className='v4321-finance-card'"),'v4.3.21 remains the source finance renderer');
ok(previous.includes("querySelector('.finance-panel')"),'canonical finance panel remains the factual source');
ok(spec.includes('Change record — v4.3.22 BOOKING DETAIL FINANCE POLISH'),'System Spec documents the v4.3.22 presentation contract');
ok(spec.includes('Деталі розрахунку')&&spec.includes('Застава'),'System Spec captures the approved manager-facing labels');

console.log(JSON.stringify({passed:25,failed:0}));