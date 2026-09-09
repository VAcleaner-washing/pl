import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const ok=(condition,label)=>{if(!condition)throw new Error(`FAIL: ${label}`);console.log(`✓ ${label}`)};

const html=read('admin/bronuvannia/index.html');
const source=read('assets/admin-v4319-triple-kit.js');
const admin=read('assets/admin-v250.js');
const sw=read('admin/sw.js');
const migration=read('supabase/migrations/20260909113000_vacleaner_admin_puzzi_jimmy_abir_bundle.sql');
const guards=read('supabase/migrations/20260909114000_vacleaner_admin_bundle_guards.sql');
const publicBooking=read('bronuvannia/index.html');
const publicBookingApi=read('supabase/functions/vacleaner-booking-v5/index.ts');

const coreIndex=html.indexOf('/assets/vacleaner-core.js');
const kitIndex=html.indexOf('/assets/admin-v4319-triple-kit.js');
const adminIndex=html.indexOf('/assets/admin-v250.js');
ok(coreIndex>=0&&kitIndex>coreIndex&&adminIndex>kitIndex,'triple-kit layer loads after core and before admin runtime');
ok(admin.includes('Object.entries(CORE.products).map'),'admin product picker is sourced from CORE.products');
ok(sw.includes('/assets/admin-v4319-triple-kit.js'),'PWA service worker preloads triple-kit layer');
ok(!publicBooking.includes('puzzi_jimmy_abir'),'admin-only bundle is not exposed as a public booking button');

const products={
  puzzi_jimmy:{weekday:1050,weekend:1150},
  abir:{weekday:800,weekend:900}
};
const core={products,catalog:{products},productAliases:{}};
vm.runInNewContext(source,{window:{VACLEANER_CORE:core}});
const kit=core.products.puzzi_jimmy_abir;
ok(Boolean(kit),'triple-kit product is registered');
ok(kit.weekday===1850&&kit.weekend===2050,'price equals Puzzi + Jimmy plus robot');
ok(JSON.stringify(kit.resources)===JSON.stringify({puzzi:1,jimmy:1,abir:1}),'all three inventory resources are reserved');
ok(kit.depositGroup==='general','three-unit bundle uses the general deposit tier');
ok(kit.adminOnly===true,'bundle is explicitly marked admin-only');

for(const token of ["'{products,puzzi_jimmy_abir}'","'weekday', 1850","'weekend', 2050","jsonb_build_object('puzzi', 1, 'jimmy', 1, 'abir', 1)","'depositGroup', 'general'","'adminOnly', true"]){
  ok(migration.includes(token),`migration keeps contract: ${token}`);
}

ok(guards.includes("new.product_code = 'puzzi_jimmy_abir' and new.source = 'vacleaner_website'"),'database blocks website-created admin bundle');
ok(guards.includes("'{products,puzzi_jimmy_abir}'"),'catalog update guard restores internal bundle');
ok(guards.includes("puzzi_jimmy_weekday + abir_weekday")&&guards.includes("puzzi_jimmy_weekend + abir_weekend"),'catalog guard keeps bundle price equal to its two tariff parts');
ok(publicBookingApi.includes('source: "vacleaner_website"'),'public booking API keeps the source marker used by the database guard');

console.log('v4.3.19 admin triple-kit regression: PASS');
