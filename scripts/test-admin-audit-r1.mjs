import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync('assets/admin-v250.js','utf8');
function source(name){
  const start=runtime.indexOf(`function ${name}(`);assert.ok(start>=0,name);
  // The helpers under test are either one line or followed by a named helper.
  const next=runtime.indexOf('\nfunction ',start+1),nextAsync=runtime.indexOf('\nasync function ',start+1);
  const stop=Math.min(...[next,nextAsync].filter(n=>n>=0));
  const text=runtime.slice(start,stop);
  return (runtime.slice(start-6,start)==='async '?'async ':'')+text;
}
function context(values,names){const c=vm.createContext(values);for(const name of names)vm.runInContext(source(name),c);return c}

const stored={delivery:{local:250},equipment:{puzzi:{qty:2,unitCost:26000}}};
let serverOk=false;
const settings=context({getDeliveryPricing:()=>stored.delivery,getEquipmentBaselines:()=>stored.equipment,
  normalizeDeliveryPricingLocal:v=>v,normalizeEquipmentBaselines:v=>v,
  saveDeliveryPricingLocal:v=>(stored.delivery=v),saveEquipmentBaselinesLocal:v=>(stored.equipment=v),
  getSession:()=>({access_token:'fixture'}),SETTINGS_API:'fixture',KEY:'fixture',
  settingsSaveErrorMessage:s=>s,adminFetch:async()=>({ok:serverOk,json:async()=>serverOk?{deliveryPricing:{local:350},equipmentBaselines:{puzzi:{qty:2,unitCost:27000}}}:{error:'server_failure'}})},
  ['saveGlobalDeliveryPricing','saveGlobalEquipmentBaselines']);
await assert.rejects(settings.saveGlobalDeliveryPricing({local:999}),/server_failure/);
await assert.rejects(settings.saveGlobalEquipmentBaselines({puzzi:{qty:2,unitCost:99999}}),/server_failure/);
assert.equal(stored.delivery.local,250);assert.equal(stored.equipment.puzzi.unitCost,26000);
serverOk=true;await settings.saveGlobalDeliveryPricing({local:999});await settings.saveGlobalEquipmentBaselines({puzzi:{qty:2,unitCost:99999}});
assert.equal(stored.delivery.local,350);assert.equal(stored.equipment.puzzi.unitCost,27000);

const analytics=context({state:{referrals:{analytics:{messages:[{kind:'program_invite',customer_phone:'a',sent_at:'2026-11-02T12:00:00Z',channel:'instagram'}],uses:[{status:'completed',created_at:'2026-12-02T12:00:00Z',referrer_phone:'a',booking_id:'one'}],bookings:[{id:'one',total_amount:700}],customers:[],rewards:[]}}},normalizePhone:v=>v},['reportDateIso','reportDateMoment','referralTimestampInBounds','referralAnalyticsMetrics','analyticsSourceKey','analyticsSourceLabel','sourcePerformance']);
const bounds={start:new Date('2026-11-01T00:00:00Z'),end:new Date('2026-12-01T00:00:00Z')};
let metrics=analytics.referralAnalyticsMetrics(bounds);
assert.equal(metrics.bookings,0);assert.equal(metrics.outreachBookings,1);assert.equal(metrics.outsideCohortBookings,0);
analytics.state.referrals.analytics.uses.push({status:'pending',created_at:'2026-11-03T12:00:00Z',referrer_phone:'b',booking_id:'two'});
metrics=analytics.referralAnalyticsMetrics(bounds);assert.equal(metrics.bookings,1);assert.equal(metrics.outsideCohortBookings,1);assert.equal(metrics.revenue,0);
for(const value of [null,undefined,''])assert.equal(analytics.analyticsSourceKey(value),'unknown');
assert.equal(analytics.sourcePerformance([{source:null,status:'completed'}])[0].label,'Не вказано');
assert.equal(analytics.analyticsSourceKey('vacleaner_website'),'website');

let reads=0;
const state={moduleErrors:{},bookings:[],calendar:[]};
const recovery=context({state,renderBadges:()=>{},recalcCalendarSlots:(days)=>days,load:async()=>{reads++;throw new Error('read_failure')}},['optionalAdminRead','applySavedBooking','loadAfterMutation']);
const previous={campaigns:[{id:'one'}]};
assert.equal(await recovery.optionalAdminRead('campaigns',async()=>{throw new Error('failure')},previous),previous);
assert.ok(state.moduleErrors.campaigns);
await recovery.optionalAdminRead('campaigns',async()=>({campaigns:[]}),previous);assert.equal(state.moduleErrors.campaigns,undefined);
assert.equal(await recovery.loadAfterMutation({id:'one',status:'confirmed'}),false);
assert.equal(state.bookings[0].status,'confirmed');assert.equal(reads,1);assert.ok(state.mutationRefreshError);
recovery.load=async()=>{reads++};assert.equal(await recovery.loadAfterMutation(),true);assert.equal(state.mutationRefreshError,null);

// DOM currentTarget is cleared when an async handler yields. A failed retry must
// re-enable the captured button rather than dereferencing the expired event.
let retryButton={disabled:false},retryStarted=false;
const notice={setAttribute(){},querySelector:()=>retryButton};
const retry=context({state:{mutationRefreshError:new Error('old')},document:{querySelector:selector=>selector==='.page-head'?{insertAdjacentElement(){}}:null,createElement:()=>notice},
  load:async()=>{retryStarted=true;throw new Error('still offline')},toast:()=>{},render:()=>{}},['renderMutationRefreshNotice']);
retry.renderMutationRefreshNotice();
await retryButton.onclick({get currentTarget(){return retryStarted?null:retryButton}});
assert.equal(retryButton.disabled,false,'a failed read retry remains usable after async event cleanup');
console.log('PASS: server-confirmed settings, cross-period referrals, unknown sources, optional-read recovery and committed-save reconciliation');
