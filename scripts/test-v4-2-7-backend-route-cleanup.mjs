import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const inventory=JSON.parse(read('supabase/production-inventory/edge-functions.json'));
const adminJs=read('assets/admin-v250.js');
const v4=read('supabase/functions/vacleaner-admin-bookings-v4/index.ts');
const data=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const activeEntries=Object.values(inventory.frontendEntrypoints||{});
const bySlug=new Map((inventory.functions||[]).map(x=>[x.slug,x]));
let pass=0;const fail=[];const ok=(name,cond)=>{if(cond){pass++;console.log('OK  ',name)}else{fail.push(name);console.error('FAIL',name)}};
ok('admin frontend points to direct v4',inventory.frontendEntrypoints?.adminBookings==='vacleaner-admin-bookings-v4'&&adminJs.includes('/functions/v1/vacleaner-admin-bookings-v4'));
ok('active frontend does not point to legacy admin routes',!activeEntries.some(x=>['vacleaner-admin-bookings','vacleaner-admin-bookings-v2','vacleaner-admin-bookings-v3'].includes(x)));
ok('v4 does not proxy v3',!v4.includes('/functions/v1/vacleaner-admin-bookings-v3')&&!v4.includes('AbortSignal.timeout(15000)'));
ok('v4 performs internal user authentication',v4.includes('auth.getUser(token)')&&v4.includes('admin_users'));
ok('admin-data performs internal user authentication',data.includes('auth.getUser(token)')&&(data.includes('admin_users')||data.includes('vacleaner_admin_users')));
const activeAdmin=['vacleaner-admin-bookings-v4','vacleaner-admin-data-v1','vacleaner-campaigns-v1','vacleaner-sms-v2','vacleaner-sms-audit-v1','vacleaner-booking-promo-v1','vacleaner-status-correction-v1','vacleaner-customer-documents-v1','vacleaner-extend-rental-v1','vacleaner-push'];
ok('active manager functions use custom-auth gateway policy',activeAdmin.every(slug=>bySlug.get(slug)?.verifyJwt===false));
for(const slug of activeAdmin){const path=`supabase/functions/${slug}/index.ts`;const code=read(path);ok(`${slug} keeps internal auth`,code.includes('auth.getUser(')&&(code.includes('admin_users')||code.includes('vacleaner_admin_users')))}
const deps=inventory.dependencyGraph||{};
ok('no active admin compatibility proxy remains',Object.entries(deps).every(([caller,targets])=>!String(caller).startsWith('vacleaner-admin-bookings')||!(targets||[]).some(x=>String(x).startsWith('vacleaner-admin-bookings'))));
ok('campaign to SMS dependency is explicit and isolated',JSON.stringify(deps['vacleaner-campaigns-v1'])===JSON.stringify(['vacleaner-sms-v2']));
ok('legacy admin functions are rollback-only', ['vacleaner-admin-bookings','vacleaner-admin-bookings-v2','vacleaner-admin-bookings-v3'].every(slug=>bySlug.get(slug)?.runtime==='legacy'));
console.log(`v4.2.7 backend route cleanup: ${pass}/${pass+fail.length} OK`);if(fail.length){console.error(JSON.stringify({fail},null,2));process.exit(1)}
