import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const html=read('admin/bronuvannia/index.html');
const css=read('assets/admin-v4323.css');
const sw=read('admin/sw.js');
const pkg=JSON.parse(read('package.json'));
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const ok=(condition,label)=>{if(!condition)throw new Error(label);console.log('PASS:',label)};

ok(pkg.version==='4.3.0','canonical package baseline remains 4.3.0');
ok(/class="[^"]*\bv4323\b/.test(html),'admin enables v4.3.23 presentation layer');
const prev=html.indexOf('/assets/admin-v4322.css');
const next=html.indexOf('/assets/admin-v4323.css');
ok(prev>=0&&next>prev,'v4.3.23 CSS loads after v4.3.22');
ok(sw.includes('vacleaner-manager-4323'),'service worker cache namespace advances to 4323');
ok(sw.includes('/assets/admin-v4323.css'),'service worker precaches v4.3.23 CSS');
ok(css.includes('@media(max-width:900px)'),'polish remains mobile/PWA scoped');
ok(css.includes('html.v4323[data-admin-view="bookings"] .booking-toolbar'),'polish is scoped to booking status rail');
ok(css.includes('border-left:0!important'),'legacy internal divider is removed');
ok(css.includes('position:static!important'),'count badges participate inline instead of floating');
ok(css.includes('background:transparent!important'),'inactive count treatment stays quiet');
ok(css.includes('rgba(232,180,91,.105)'),'active segment uses restrained gold tint');
ok(!css.includes('[data-filter='),'presentation layer does not alter filter semantics');
ok(pkg.scripts['test:pwa-static'].includes('test-v4-3-23-booking-filter-polish.mjs'),'static aggregate includes v4.3.23 gate');
ok(pkg.scripts['test:admin-booking-flex'].includes('admin_booking_v4323_filter_polish_qa.py'),'browser aggregate includes v4.3.23 visual gate');
ok(spec.includes('Change record — v4.3.23 BOOKING STATUS FILTER POLISH'),'System Spec records v4.3.23 filter polish');
console.log('v4.3.23 booking filter polish static gate: PASS');
