import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const admin=read('assets/admin-v250.js');
const address=read('assets/address-autocomplete.js');
const publicSlots=read('assets/public-booking-slots.js');
const publicApi=read('supabase/functions/vacleaner-booking-v5/index.ts');
const adminApi=read('supabase/functions/vacleaner-admin-bookings-v4/index.ts');
const dataApi=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const migration=read('supabase/migrations/20260829214500_vacleaner_separate_delivery_address_details.sql');

assert.ok(address.includes('__VAC_DELIVERY_ADDRESS_PARTS__'), 'public address helper must expose separate values');
assert.ok(address.includes('__VAC_ADMIN_DELIVERY_ADDRESS_PARTS__'), 'admin address helper must expose separate values');
assert.ok(publicSlots.includes('body.deliveryAddressDetail=addressParts.detail'), 'public booking must send detail separately');
assert.ok(admin.includes('customerAddressDetail:deliveryParts.detail'), 'admin booking must save customer detail separately');
assert.ok(admin.includes('deliveryAddressDetail:deliveryParts.detail'), 'admin booking must save booking detail separately');
assert.ok(admin.includes("customerComment:fd.get('customerComment')"), 'customer comment must remain independent');
assert.ok(!admin.includes('customerAddress:[deliveryParts.address,deliveryParts.note]'), 'admin must not compose canonical customer address');
assert.ok(!admin.includes('customerComment=mergeDeliveryComment'), 'entrance must not be merged into customer comment');
assert.ok(admin.includes('cardAddressDetail=client.addressDetail||storedAddress.note')&&admin.includes('value=\"${h(cardAddressDetail)}\"'), 'client card must read the separate profile detail with legacy fallback');

for(const source of [publicApi,adminApi]){
  assert.ok(source.includes('fulfillment_address_detail'), 'booking API must persist booking address detail');
  assert.ok(source.includes('address_detail'), 'booking API must persist customer address detail');
}
assert.ok(dataApi.includes('address,address_detail,document_type'), 'client loader must return both address values');
assert.ok(dataApi.includes('customerAddressDetail'), 'client save must accept separate address detail');

assert.ok(migration.includes('add column if not exists address_detail text'), 'migration must add customer detail column');
assert.ok(migration.includes('add column if not exists fulfillment_address_detail text'), 'migration must add booking detail column');
assert.ok(migration.includes("raw_value = 'Історична доставка · адреса не збережена'"), 'migration must preserve missing-address placeholder');
assert.ok(migration.includes("[0-9]+\\s*(?:-?й\\s*)?під"), 'migration must support legacy numbered entrances');
assert.ok(migration.includes("btrim(matched[1], ' ,;.')"), 'migration must preserve a clean route address');

console.log('v4.2.27 ADDRESS SEPARATION regression contracts: PASS');
