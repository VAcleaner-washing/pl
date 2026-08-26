import fs from 'node:fs';
const read=file=>fs.readFileSync(file,'utf8');
const checks=[];const ok=(condition,label)=>{if(!condition)throw new Error(label);checks.push(label)};
const config=JSON.parse(read('config/vacleaner.json'));
const settings=read('supabase/functions/vacleaner-settings/index.ts');
const settingsDeploy=read('supabase/functions/vacleaner-settings/index.deploy.js');
const publicBooking=read('supabase/functions/vacleaner-booking-v5/index.ts');
const adminEdge=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const admin=read('assets/admin-v250.js');
const address=read('assets/address-autocomplete.js');
const bookingRuntime=read('assets/public-booking-slots.js');
ok(config.deliveryFee===250,'legacy local delivery fallback stays 250');
ok(config.deliveryPricing?.local===250&&config.deliveryPricing?.baseOutside===350&&config.deliveryPricing?.includedKm===10&&config.deliveryPricing?.perKm===15&&config.deliveryPricing?.maxOutsideKm===30,'config has local + distance delivery pricing');
ok(['Полтава','Розсошенці','Щербані','Горбанівка'].every(x=>config.deliveryPricing.localSettlements.includes(x)),'local 250 settlements are explicit');
ok(settings.includes('deliveryPricing')&&settings.includes('normDeliveryPricing'),'settings API reads and saves tiered pricing');
ok(settingsDeploy.includes('deliveryPricing')&&settingsDeploy.includes('normDeliveryPricing'),'deployable settings API reads and saves tiered pricing');
ok(publicBooking.includes('deliveryQuote(')&&publicBooking.includes('deliveryQuoteRequired')&&publicBooking.includes('deliveryDistanceKm'),'public booking quotes local/distance/agreement server-side');
ok(adminEdge.includes('deliveryAmountOverride')&&adminEdge.includes('deliveryAddressVerified'),'admin backend accepts verified quote and manager override');
ok(adminEdge.includes('existing.delivery_amount'),'editing keeps historical delivery snapshot');
ok(admin.includes('deliveryLocal')&&admin.includes('deliveryBaseOutside')&&admin.includes('deliveryPerKm')&&admin.includes('deliveryMaxKm')&&admin.includes('saveGlobalDeliveryPricing'),'admin exposes distance delivery editors');
ok(admin.includes('deliveryAmountOverride')&&admin.includes('syncAdminDeliveryQuote'),'admin booking can resolve or override delivery tariff');
ok(address.includes('__VAC_DELIVERY_META__')&&address.includes('__VAC_ADMIN_DELIVERY_META__'),'address helper exposes verified settlement metadata');
ok(bookingRuntime.includes('currentDeliveryQuote()')&&bookingRuntime.includes('deliveryPricing.perKm')&&bookingRuntime.includes('тариф підтвердить менеджер'),'public booking shows local/distance/agreement state');
for(const name of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
  const deployConfig=read(`supabase/functions/${name}/config.deploy.js`);
  ok(deployConfig.includes(`VACLEANER_RELEASE_VERSION=${JSON.stringify(String(JSON.parse(read('release.json')).version))}`),`${name} deploy config matches release`);
}
console.log(`Delivery settings checks passed: ${checks.length}`);
