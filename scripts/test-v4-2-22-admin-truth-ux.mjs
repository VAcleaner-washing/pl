import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const glass=fs.readFileSync('assets/admin-glass-test.js','utf8');
const glassCss=fs.readFileSync('assets/admin-glass-test.css','utf8');
const settings=fs.readFileSync('supabase/functions/vacleaner-settings/index.ts','utf8');
const adminData=fs.readFileSync('supabase/functions/vacleaner-admin-data-v1/index.ts','utf8');
const adminGateway=fs.readFileSync('supabase/functions/vacleaner-admin-bookings-v4/index.ts','utf8');
const generator=fs.readFileSync('scripts/generate-config.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');

const has=(source,needle,label)=>assert.ok(source.includes(needle),label);
const lacks=(source,needle,label)=>assert.ok(!source.includes(needle),label);

// Delivery: no invented fallback distance, last 15 real completed deliveries, two-car economics.
lacks(admin,'meta.routeKm||8','delivery cannot silently fall back to 8 km');
lacks(admin,"Math.max(0,Number(zone?.maxKm||0)-7)",'settings cannot manufacture a city distance from zone max');
has(admin,'recentDeliverySample(15','delivery analytics must use the last 15 completed deliveries');
has(admin,"b.status==='completed'&&b.fulfillment==='delivery'&&credible(b)",'historical delivery rows with neither real price nor route must not become fake zero-cost deliveries');
has(admin,"row?.isLocal?Number(car?.consumptionL100)||0:Number(fuel.consumptionL100)||0",'city car consumption and route/suburb consumption must be applied to the right delivery type');
has(admin,'Середня між двома авто','delivery analytics must expose the average between the two cars');
has(admin,"if(!routeKm)return[]",'booking fuel estimate must refuse missing route distance');
has(admin,'Маршрут для цієї адреси ще не збережений','missing route distance must be explicit and actionable');

// Equipment payback: rental-only revenue + actual resource allocation, never whole booking total.
has(admin,'function bookingRentalRevenue','payback needs a rental-only revenue source');
has(admin,'function bookingEquipmentRevenueAllocation','bundle revenue must be allocated across equipment resources');
has(admin,'equipmentRevenueWeightsForBooking','bundle allocation must use tariff weights for the actual rental period, not one weekday constant');
has(admin,'equipment_revenue_allocation','client must prefer a frozen allocation snapshot when it exists');
has(adminGateway,'equipmentRevenueAllocationSnapshot','production booking gateway must freeze allocation when an order is completed');
has(adminGateway,'proportional_standalone_tariffs_v1','frozen allocation model must be explicit and versioned');
has(admin,'bookingResourceQuantities(b)','allocation must use actual catalog resources');
has(admin,'розподілена виручка','UI must disclose that bundle revenue is allocated');
lacks(admin,"relatedBookings.reduce((sum,b)=>sum+Math.max(0,Number(b.total_amount)||0),0)",'payback cannot assign full booking total to one equipment item');
has(admin,'function equipmentExpenseTotals','equipment costs need explicit per-equipment breakdown');
has(admin,"additionalInvestment:sum('equipment')",'additional equipment investments are separate');
has(admin,"repairs:sum('repair')",'repairs are separate');
has(admin,"upgrades:sum('improvement')",'upgrades are separate');

// Global source of truth for initial equipment cost.
has(settings,'equipment_baselines','equipment baselines must be persisted globally');
has(settings,'equipmentBaselines','settings API must expose equipment baselines');
has(settings,'map.equipment_baselines ? normEquipmentBaselines(map.equipment_baselines) : null','missing global baseline must not overwrite an existing browser baseline with zeroes');
has(generator,"'vacleaner-admin-bookings-v4'",'build stamping must keep the actual production v4 admin gateway config coherent');
has(admin,'saveGlobalEquipmentBaselines','admin must persist baseline edits through settings API');

// Expense linkage must be explicit while historical text inference remains only as fallback.
has(admin,'[[VAC_EQUIPMENT:','expense records must carry an explicit equipment marker');
has(admin,'expenseEquipmentKey','equipment linkage helper must exist');

// Client CRM truth and navigation.
has(admin,'let detailReturnClient=null','booking details need client return context');
has(admin,'returnClient:client','client-origin booking details must preserve return context');
has(admin,'До картки','detail UI must offer a way back to the client card');
has(admin,"referralCode:profile?.referral_code",'client directory must carry current referral code');
has(adminData,'vacleaner_referral_codes','client API must load referral codes from source of truth');
has(admin,'referralCode','global search must include referral codes');
has(admin,'telegramContactLink','Telegram routing must use current profile helper');
has(admin,"/^[a-zA-Z0-9_]{5,32}$/",'valid Telegram username must take priority before phone fallback');

// No duplicated production action injection.
lacks(glass,'MutationObserver','glass compatibility layer must not inject duplicate runtime actions');
lacks(glass,'glass-client-actions','glass compatibility layer must not create a second action bar');
has(glass,'clientActions','glass compatibility marker must declare native action ownership');

// PWA and CI architecture.
has(glassCss,'.pwa-standalone .main','standalone PWA must reserve content space above bottom nav');
has(glassCss,'.keyboard-open .mobile-nav','mobile nav must get out of the way when keyboard is open');
has(glassCss,'.client-editor-summary{grid-template-columns:repeat(2,minmax(0,1fr))','mobile client KPI summary must stay compact 2x2');
has(glassCss,'.client-card-form>footer:has(.client-save:disabled){display:none}','unchanged mobile client card must not waste a full footer on a disabled save action');
has(workflow,"- 'qa/**'",'QA branches must run CI');
has(workflow,"github.ref == 'refs/heads/main'",'Pages deploy must remain main-only');

// Allocation arithmetic invariant: split never creates more revenue than the booking rental pool.
const split=(revenue,weights)=>{
  const entries=Object.entries(weights).filter(([,w])=>w>0);let used=0;const out={};
  entries.forEach(([key,w],i)=>{const amount=i===entries.length-1?revenue-used:Math.round(revenue*w/entries.reduce((s,[,x])=>s+x,0));out[key]=amount;used+=amount});
  return out;
};
for(const [revenue,weights] of [[2300,{puzzi:700,sc2:500,jimmy:350,abir:800}],[1500,{puzzi:700,sc2:500}],[1050,{puzzi:700,jimmy:350}]]){
  const out=split(revenue,weights);
  assert.equal(Object.values(out).reduce((s,x)=>s+x,0),revenue,'allocated equipment revenue must equal rental revenue exactly');
  assert.ok(Object.values(out).every(x=>x>=0),'equipment allocation cannot be negative');
}

console.log('v4.2.22 ADMIN TRUTH & UX regression contracts: PASS');


// RETURN SMS activation must stay explicit: sent != active, manager confirms the client's SMS.
const campaigns=fs.readFileSync('supabase/functions/vacleaner-campaigns-v1/index.ts','utf8');
has(campaigns,'action==="pending_bonus"','admin must be able to see an issued but inactive SMS bonus');
has(campaigns,'action==="activate_bonus"','admin must explicitly activate a pending SMS bonus');
has(campaigns,'sentAt:issuedAt','pending bonus must expose when the SMS was issued');
has(admin,'Клієнт підтвердив SMS','booking UX must require an explicit manager confirmation');
has(admin,'data-activate-pending-promo','booking UX must not auto-activate an SMS merely because it was sent');

// Address truth: route address stays clean; entrance/access details belong to the comment.
has(admin,'function deliveryAddressParts','delivery address must have a route-safe parser');
has(admin,'function mergeDeliveryComment','legacy entrance notes must be preserved as booking comments');
has(admin,"customerAddress:[deliveryParts.address,deliveryParts.note].filter(Boolean).join(' · ')",'customer profile must preserve the route-safe address and its separate access detail');
has(admin,"deliveryAddress:deliveryParts.address",'booking delivery address must store route-safe address only');
has(admin,'customerComment=mergeDeliveryComment(fd.get(\'customerComment\'),deliveryParts.note)','entrance/orientation detail must move into the booking comment at save time');

// RETURN state machine: SMS issuance is pending, activation is explicit, only active codes can auto-apply.
has(campaigns,'.eq("customer_phone",phone).eq("active",false)','pending RETURN lookup must only read inactive issued codes');
has(adminGateway,'.eq("customer_phone", phone).eq("active", true)','booking pricing must only auto-apply already activated promo codes');
has(campaigns,'activation_source:"admin"','manual SMS confirmation must leave an explicit activation source');

// Booking address is customer data for every booking; delivery consumes the same route-safe address.
has(admin,'class="field delivery-address-field wide"','every booking must expose one editable customer address row');
has(admin,'Зберігаємо в картці клієнта','booking address copy must explain customer-profile persistence');
has(admin,"addressInput.disabled=false",'pickup must keep the customer address editable');
has(admin,'deliveryPricingField.hidden=!delivery','only delivery pricing is contextual to fulfillment');
has(admin,"detail=chunks.join(' · ').trim()",'address parser must preserve the site-style entrance/orientation detail');
has(admin,"note:[legacyNote,detail].filter(Boolean).join(' · ')",'legacy entrance and site-style detail must move to comments, never Google Maps address');
has(admin,"savedDeliveryValue=[savedDelivery.address,savedDelivery.note].filter(Boolean).join(' · ')",'repeat client must preserve route-safe address plus separate access detail for the address helper');
has(admin,"__VAC_SET_ADMIN_DELIVERY_ADDRESS__?.(savedDeliveryValue)",'repeat client must restore legacy access detail through the separate address-detail control, not the map address');
has(admin,'Для Google Maps використовуємо тільки адресу будинку','admin address copy must keep map address and access note conceptually separate');
has(fs.readFileSync('assets/address-autocomplete.js','utf8'),"if(mode==='public'||mode==='admin'){",'public and admin booking must share the separate entrance/orientation field contract');
