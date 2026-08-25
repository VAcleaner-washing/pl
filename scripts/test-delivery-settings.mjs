import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const checks=[];
const ok=(condition,label)=>{if(!condition)throw new Error(label);checks.push(label)};
const config=JSON.parse(read('config/vacleaner.json'));
const settings=read('supabase/functions/vacleaner-settings/index.ts');
const settingsDeploy=read('supabase/functions/vacleaner-settings/index.deploy.js');
const publicBooking=read('supabase/functions/vacleaner-booking-v5/index.ts');
const adminEdge=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const admin=read('assets/admin-v250.js');
const publicExperience=read('assets/public-experience.js');
const bookingRuntime=read('assets/public-booking-slots.js');

ok(config.deliveryFee===250,'config has delivery fallback');
ok(settings.includes('delivery_fee')&&settings.includes('body.deliveryFee'),'settings API reads and saves delivery fee');
ok(settingsDeploy.includes('delivery_fee')&&settingsDeploy.includes('body.deliveryFee'),'deployable settings API reads and saves delivery fee');
ok(publicBooking.includes('body.fulfillment === "delivery" ? deliveryFee : 0'),'public booking prices delivery from settings');
ok(adminEdge.includes('existing?.fulfillment === "delivery"')&&adminEdge.includes('existing.delivery_amount'),'editing keeps the historical delivery snapshot');
ok(admin.includes('id="deliveryFeeForm"')&&admin.includes('saveGlobalDeliveryFee'),'admin exposes one delivery price editor');
ok(publicExperience.includes('syncDeliveryFee()')&&publicExperience.includes('application/ld+json'),'public pages and structured data sync delivery copy');
ok(bookingRuntime.includes('renderDeliveryFee()'),'booking choice syncs delivery fee');
for(const name of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
  const deployConfig=read(`supabase/functions/${name}/config.deploy.js`);
  ok(deployConfig.includes(`VACLEANER_RELEASE_VERSION=${JSON.stringify(String(JSON.parse(read('release.json')).version))}`),`${name} deploy config matches the release`);
  ok(deployConfig.includes(JSON.stringify(config.catalog.products.combo.label)),`${name} deploy config keeps canonical package labels`);
}
console.log(`Delivery settings checks passed: ${checks.length}`);
