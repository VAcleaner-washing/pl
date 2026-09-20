import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const html=read('admin/bronuvannia/index.html');
const css=read('assets/admin-v4324.css');
const sw=read('admin/sw.js');
const pkg=JSON.parse(read('package.json'));
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const ok=(condition,label)=>{if(!condition)throw new Error(label);console.log('PASS:',label)};

ok(pkg.version==='4.3.0','canonical package baseline remains 4.3.0');
ok(/class="[^"]*\bv4324\b/.test(html),'admin enables v4.3.24 presentation layer');
const prev=html.indexOf('/assets/admin-v4323.css');
const next=html.indexOf('/assets/admin-v4324.css');
ok(prev>=0&&next>prev,'v4.3.24 CSS loads after v4.3.23');
ok(/vacleaner-manager-(4324|4300)/.test(sw),'service worker cache follows source or stamped namespace');
ok(sw.includes('/assets/admin-v4324.css'),'service worker precaches v4.3.24 CSS');
ok(css.includes('@media(min-width:901px)'),'desktop polish stays outside mobile/PWA breakpoint');
ok(css.includes('html.v4324[data-admin-view="bookings"] .booking-toolbar'),'desktop polish is scoped to booking status toolbar');
ok(css.includes('top:8px!important'),'sticky toolbar keeps a safe inset inside the desktop scroll pane');
ok(css.includes('background:transparent!important'),'desktop count badges are flattened');
ok(css.includes('rgba(232,180,91,.11)'),'desktop active chip uses a restrained gold tint');
ok(!css.includes('[data-filter='),'presentation layer does not alter filter semantics');
ok(pkg.scripts['test:pwa-static'].includes('test-v4-3-24-desktop-booking-polish.mjs'),'static aggregate includes v4.3.24 gate');
ok(pkg.scripts['test:admin-booking-flex'].includes('admin_booking_v4324_desktop_polish_qa.py'),'browser aggregate includes v4.3.24 desktop gate');
ok(spec.includes('Change record — v4.3.24 DESKTOP BOOKING POLISH'),'System Spec records v4.3.24 desktop polish');
console.log('v4.3.24 desktop booking polish static gate: PASS');
