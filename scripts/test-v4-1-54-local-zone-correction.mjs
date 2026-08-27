import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const config=JSON.parse(read('config/vacleaner.json'));
const address=read('assets/address-autocomplete.js');
const booking=read('supabase/functions/vacleaner-booking-v5/config.ts');
const admin=read('supabase/functions/vacleaner-admin-bookings-v3/config.ts');
const settings=read('supabase/functions/vacleaner-settings/config.ts');
const delivery=read('dostavka/index.html');
const workflow=read('.github/workflows/pages.yml');
const expected=['Полтава','Розсошенці','Щербані','Горбанівка'];
let checks=0,failed=0;
const ok=(name,condition)=>{checks++;if(condition)console.log('OK  ',name);else{failed++;console.error('FAIL',name)}};

ok('release keeps v4.1.54+ local-zone correction',Number(release.build)>=4154&&pkg.version===release.version);
ok('central config keeps all four 250 UAH settlements',expected.every(name=>config.deliveryPricing.localSettlements.includes(name))&&config.deliveryPricing.localSettlements.length===4);
ok('browser fallback keeps all four local settlements',expected.every(name=>address.includes(name)));
ok('public booking backend has the corrected local zone',expected.every(name=>booking.includes(name)));
ok('admin backend has the corrected local zone',expected.every(name=>admin.includes(name)));
ok('settings backend has the corrected local zone',expected.every(name=>settings.includes(name)));
ok('public copy distinguishes the local zone from other suburbs',delivery.includes('Полтава, Розсошенці, Щербані та Горбанівка — 250 грн')&&delivery.includes('Інше передмістя'));
ok('CI runs this correction regression',workflow.includes('test:v4.1.54-local-zone-correction'));

console.log(`v4.1.54 local zone correction: ${checks-failed}/${checks} OK`);
if(failed)process.exit(1);
