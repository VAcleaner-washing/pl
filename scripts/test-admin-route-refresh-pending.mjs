import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped coordinator and provider functions with a controlled clock.
// Every transport is synthetic; this suite never connects to an API or provider.
const admin=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const address=fs.readFileSync(new URL('../assets/address-autocomplete.js',import.meta.url),'utf8');
const coordinator=admin.slice(admin.indexOf('const DELIVERY_ROUTE_REFRESH_STEP_MS='),admin.indexOf('function weeklyOpsMetrics(){'));
const provider=address.slice(address.indexOf('async function historicalRouteRequest('),address.indexOf('function installGlobals(){'));
assert(coordinator.includes('async function backfillRecentDeliveryRoutes(){'));
assert(provider.includes('async function resolveRouteForAddress('));
const finances=admin.slice(admin.indexOf('function renderFinances(){'),admin.indexOf('function openExpenseForm('));
assert(finances.includes('syncDeliveryRouteRefreshButtons();'),'actual finance rerenders synchronize newly created buttons');
const checks=[];
async function check(name,test){try{await test();checks.push({name,passed:true});console.log('PASS:',name)}catch(error){checks.push({name,passed:false,error:error.stack});console.error('FAIL:',name,error.stack)}}
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const clone=value=>JSON.parse(JSON.stringify(value));
function clock(){
 let now=0,sequence=0;const timers=new Map();
 return{Date:{now:()=>now,parse:Date.parse},setTimeout(fn,ms){const id=++sequence;timers.set(id,{fn,at:now+Number(ms)});return id},clearTimeout(id){timers.delete(id)},get now(){return now},get pending(){return timers.size},async advance(ms){const end=now+ms;for(;;){const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush()}now=end;await flush()}};
}
function harness({count=2,form=false}={}){
 const time=clock(),calls=[],toasts=[],renders=[];let buttons=[];
 class Node{
  constructor(text=''){this.textContent=text;this.dataset={};this.disabled=false;this.children=[];this.attributes={}}
  appendChild(node){node.parentElement=this;this.children.push(node)}
  querySelector(){return this.children.find(node=>Object.hasOwn(node.dataset,'deliveryRouteStatus'))||null}
  setAttribute(key,value){this.attributes[key]=value}
  remove(){this.parentElement.children=this.parentElement.children.filter(node=>node!==this)}
 }
 const bookings=Array.from({length:count},(_,index)=>({id:`synthetic-${index+1}`,fulfillment:'delivery',fulfillment_address:`Тестова, ${index+1}`,status:'completed',total_amount:1100,delivery_amount:250,deposit_amount:1000,extras:{financial_snapshot:{rental:850},delivery:{pricing_distance_km:0}}}));
 const state={view:'finances',bookings,expenses:[]};
 const context={console,AbortController,Date:time.Date,state,window:{setTimeout:time.setTimeout,clearTimeout:time.clearTimeout},document:{createElement:()=>new Node()},
  $:selector=>selector==='#layer'?{querySelector:()=>form?{}:null}:null,$$:selector=>selector==='#refreshDeliveryRoutes,#recalcDeliveryRoutes'?buttons:[],
  deliveryAddressParts:value=>({address:value}),recentDeliverySample:()=>state.bookings.map(booking=>({booking,routeKm:Number(booking.extras?.delivery?.route_km)||null,routeNeedsRefresh:false})),
  toast:(message,tone)=>toasts.push({message,tone}),renderFinances:()=>{renders.push(time.now);rebuild();context.syncDeliveryRouteRefreshButtons()},
  invokeData:async payload=>{calls.push(clone(payload));return api(payload)},
 };
 function rebuild(){buttons=['Оновити маршрути','Дорахувати маршрути','Дорахувати маршрути'].map(text=>{const button=new Node(text);new Node().appendChild(button);return button})}
 let api=payload=>payload.action==='list'?{bookings:clone(state.bookings),expenses:[]}:{ok:true,bookingId:payload.bookingId,delivery:{route_km:payload.routeKm,pricing_distance_km:payload.pricingDistanceKm,distance_source:payload.distanceSource}};
 context.window.__VAC_ROUTE_FOR_ADDRESS__=async()=>({routeKm:6.5,pricingDistanceKm:0,distanceSource:'road_city'});
 rebuild();vm.createContext(context);vm.runInContext(coordinator,context);
 return{context,state,time,calls,toasts,renders,run:()=>context.backfillRecentDeliveryRoutes(),get buttons(){return buttons},setApi:fn=>{api=fn},setResolver:fn=>{context.window.__VAC_ROUTE_FOR_ADDRESS__=fn},snapshot:()=>vm.runInContext('({busy:deliveryRouteRefreshBusy,review:deliveryRouteRefreshReview,message:deliveryRouteRefreshMessage})',context),rerender:()=>context.renderFinances(),writes:()=>calls.filter(call=>call.action==='save_delivery_route'),reads:()=>calls.filter(call=>call.action==='list')};
}
function assertIdle(h){assert.equal(h.snapshot().busy,false);assert(h.buttons.every(button=>!button.disabled));assert.equal(h.time.pending,0,'bounded wait timers are cleared')}
function assertReview(h){assertIdle(h);assert(h.snapshot().review);assert(h.buttons.every(button=>button.textContent==='Перевірити збереження'))}
function apiAck(payload){return{ok:true,bookingId:payload.bookingId,delivery:{route_km:payload.routeKm,pricing_distance_km:payload.pricingDistanceKm,distance_source:payload.distanceSource}}}

await check('hanging route resolver restores every button, aborts and never writes',async()=>{
 const h=harness();let signal;h.setResolver((value,options)=>{signal=options.signal;return new Promise(()=>{})});
 const running=h.run();await flush();assert(h.buttons.every(button=>button.disabled));assert.match(h.buttons[0].textContent,/1\/2/);await h.run();
 h.rerender();assert(h.buttons.every(button=>button.disabled),'finance rerender keeps the shared busy state');
 await h.time.advance(15000);await running;assertIdle(h);assert.equal(signal.aborted,true);assert.equal(h.writes().length,0);assert.match(h.snapshot().message,/надто довго/);
});
await check('late route result after timeout never starts a mutation; explicit retry can succeed',async()=>{
 const h=harness({count:1}),late=deferred();h.setResolver(()=>late.promise);const running=h.run();await flush();await h.time.advance(15000);await running;
 late.resolve({routeKm:7,distanceSource:'road_city'});await flush();assert.equal(h.writes().length,0);
 h.setResolver(async()=>({routeKm:7,pricingDistanceKm:0,distanceSource:'road_city'}));await h.run();assertIdle(h);assert.equal(h.writes().length,1);
});
await check('successful sequential saves preserve canonical payload and all financial/status fields',async()=>{
 const h=harness(),before=h.state.bookings.map(row=>({status:row.status,total:row.total_amount,delivery:row.delivery_amount,deposit:row.deposit_amount,snapshot:row.extras.financial_snapshot}));
 await h.run();assertIdle(h);assert.equal(h.writes().length,2);assert.equal(h.reads().length,1);
 assert.deepEqual(h.writes()[0],{action:'save_delivery_route',bookingId:'synthetic-1',routeKm:6.5,pricingDistanceKm:0,distanceSource:'road_city'});
 assert.deepEqual(h.state.bookings.map(row=>({status:row.status,total:row.total_amount,delivery:row.delivery_amount,deposit:row.deposit_amount,snapshot:row.extras.financial_snapshot})),before);
 assert(h.state.bookings.every(row=>row.extras.delivery.route_km===6.5));
});
await check('hanging save enters read-only reconciliation and restores all button instances',async()=>{
 const h=harness({count:1});h.setApi(payload=>payload.action==='list'?{bookings:clone(h.state.bookings)}:new Promise(()=>{}));
 const running=h.run();await flush();await h.time.advance(15000);await running;assertReview(h);assert.equal(h.writes().length,1);
 await h.run();assertReview(h);assert.equal(h.reads().length,1);assert.equal(h.writes().length,1,'checking never resubmits');
 h.rerender();assert(h.buttons.every(button=>button.textContent==='Перевірити збереження'));
});
await check('ambiguous network rejection remains guarded after unsuccessful reconciliation',async()=>{
 const h=harness({count:1});h.setApi(payload=>{if(payload.action==='list')return{bookings:clone(h.state.bookings)};throw Object.assign(new Error('synthetic network failure'),{status:0})});
 await h.run();assertReview(h);await h.run();await h.run();assertReview(h);assert.equal(h.writes().length,1);assert.equal(h.reads().length,2);
});
await check('network rejection during a stale review read cannot clear duplicate protection',async()=>{
 const h=harness({count:1}),save=deferred(),read=deferred();h.setApi(payload=>payload.action==='list'?read.promise:save.promise);
 const running=h.run();await flush();await h.time.advance(15000);await running;const reviewing=h.run();await flush();
 save.reject(Object.assign(new Error('connection lost after send'),{status:0}));await flush();read.resolve({bookings:clone(h.state.bookings)});await reviewing;
 assertReview(h);await h.run();assert.equal(h.writes().length,1);
});
await check('authoritative reconciliation confirms an ambiguous save without another POST',async()=>{
 const h=harness({count:1});h.setApi(payload=>payload.action==='list'?{bookings:h.state.bookings.map(row=>({...clone(row),extras:{...clone(row.extras),delivery:{route_km:6.5,distance_source:'road_city'}}}))}:new Promise(()=>{}));
 const running=h.run();await flush();await h.time.advance(15000);await running;await h.run();assertIdle(h);assert.equal(h.snapshot().review,null);assert.equal(h.writes().length,1);assert.match(h.snapshot().message,/підтверджено/);
});
await check('valid late acknowledgement survives a stale final review read',async()=>{
 const h=harness({count:1}),save=deferred(),read=deferred();let payload;
 h.setApi(body=>{if(body.action==='list')return read.promise;payload=body;return save.promise});
 const running=h.run();await flush();await h.time.advance(15000);await running;const reviewing=h.run();await flush();
 save.resolve(apiAck(payload));await flush();read.resolve({bookings:clone(h.state.bookings)});await reviewing;
 assertIdle(h);assert.equal(h.snapshot().review,null);assert.equal(h.state.bookings[0].extras.delivery.route_km,6.5);assert.equal(h.writes().length,1);
});
await check('hanging review read preserves guard and always releases buttons',async()=>{
 const h=harness({count:1});h.setApi(()=>new Promise(()=>{}));const running=h.run();await flush();await h.time.advance(15000);await running;
 const reviewing=h.run();await flush();await h.time.advance(15000);await reviewing;assertReview(h);assert.equal(h.writes().length,1);assert.match(h.snapshot().message,/перевірити/);
});
await check('definitive rejection restores normal retry without automatic duplicate writes',async()=>{
 const h=harness({count:1});h.setApi(()=>{throw Object.assign(new Error('synthetic invalid route'),{status:422})});await h.run();assertIdle(h);assert.equal(h.snapshot().review,null);assert.equal(h.writes().length,1);
 h.setApi(payload=>payload.action==='list'?{bookings:clone(h.state.bookings)}:apiAck(payload));await h.run();assertIdle(h);assert.equal(h.writes().length,2);
});
await check('late definitive rejection must precede a fresh review read before unlocking retry',async()=>{
 const h=harness({count:1}),save=deferred(),read=deferred();h.setApi(payload=>payload.action==='list'?read.promise:save.promise);
 const running=h.run();await flush();await h.time.advance(15000);await running;const reviewing=h.run();await flush();
 save.reject(Object.assign(new Error('synthetic forbidden'),{status:403}));await flush();read.resolve({bookings:clone(h.state.bookings)});await reviewing;assertReview(h);
 await h.run();assertIdle(h);assert.equal(h.snapshot().review,null);assert.equal(h.writes().length,1);
});
await check('partial acknowledged progress is retained and rendered when a later resolver fails',async()=>{
 const h=harness();let resolved=0;h.setResolver(async()=>{if(++resolved===2)throw new Error('synthetic provider unavailable');return{routeKm:6.5,pricingDistanceKm:0,distanceSource:'road_city'}});
 await h.run();assertIdle(h);assert.equal(h.writes().length,1);assert.equal(h.state.bookings[0].extras.delivery.route_km,6.5);assert.equal(h.state.bookings[1].extras.delivery.route_km,undefined);assert(h.renders.length);assert.match(h.snapshot().message,/Підтверджено 1/);
});
await check('hanging final read releases busy state and keeps acknowledged progress',async()=>{
 const h=harness({count:1});h.setApi(payload=>payload.action==='list'?new Promise(()=>{}):apiAck(payload));const running=h.run();await flush();await h.time.advance(15000);await running;
 assertIdle(h);assert.equal(h.snapshot().review,null);assert.equal(h.state.bookings[0].extras.delivery.route_km,6.5);assert.match(h.snapshot().message,/Підтверджено 1/);assert(h.renders.length);
});
await check('late final read after timeout cannot replace current state',async()=>{
 const h=harness({count:1}),read=deferred();h.setApi(payload=>payload.action==='list'?read.promise:apiAck(payload));const running=h.run();await flush();await h.time.advance(15000);await running;
 const current=h.state.bookings;read.resolve({bookings:[],expenses:[{amount:999}]});await flush();assert.equal(h.state.bookings,current);assert.equal(h.state.expenses.length,0);
});
await check('stale successful read cannot erase acknowledged delivery data or peer financial updates',async()=>{
 const h=harness({count:1}),stale=clone(h.state.bookings);stale[0].total_amount=1234;stale[0].status='issued';h.setApi(payload=>payload.action==='list'?{bookings:stale}:apiAck(payload));
 await h.run();assertIdle(h);assert.equal(h.state.bookings[0].extras.delivery.route_km,6.5);assert.equal(h.state.bookings[0].total_amount,1234);assert.equal(h.state.bookings[0].status,'issued');
});
await check('route acknowledgement never rolls back peer delivery pricing or trip settings',async()=>{
 const h=harness({count:1}),fresh=clone(h.state.bookings);fresh[0].extras.delivery={amount:400,legs:6,trip_multiplier:1.5,zone:'peer-zone',pricing_distance_km:3};
 h.setApi(payload=>payload.action==='list'?{bookings:fresh}:{...apiAck(payload),delivery:{...apiAck(payload).delivery,amount:250,legs:4,trip_multiplier:1,zone:'old-zone'}});
 await h.run();assertIdle(h);const delivery=h.state.bookings[0].extras.delivery;assert.equal(delivery.route_km,6.5);assert.equal(delivery.amount,400);assert.equal(delivery.legs,6);assert.equal(delivery.trip_multiplier,1.5);assert.equal(delivery.zone,'peer-zone');
});
for(const [name,peerAt,ackAt,expected] of [
 ['newer peer route','2026-11-15T12:02:00Z','2026-11-15T12:01:00Z',8],
 ['equal route timestamps','2026-11-15T12:01:00Z','2026-11-15T12:01:00Z',8],
 ['peer route without timestamp','', '2026-11-15T12:01:00Z',8],
 ['acknowledgement without timestamp','2026-11-15T12:02:00Z','',8],
 ['both timestamps unavailable','','',8],
 ['provably older canonical route','2026-11-15T12:00:00Z','2026-11-15T12:01:00Z',6.5],
])await check(`final read respects ${name} and preserves financial fields`,async()=>{
 const h=harness({count:1}),fresh=clone(h.state.bookings);fresh[0].total_amount=1400;fresh[0].status='issued';fresh[0].extras.delivery={route_km:8,distance_source:'road_city',route_backfilled_at:peerAt,pricing_distance_km:3,amount:450,legs:6,trip_multiplier:1.5,zone:'peer-zone'};
 h.setApi(payload=>payload.action==='list'?{bookings:fresh}:{...apiAck(payload),delivery:{...apiAck(payload).delivery,route_backfilled_at:ackAt}});
 await h.run();assertIdle(h);const current=h.state.bookings[0],delivery=current.extras.delivery;assert.equal(delivery.route_km,expected);assert.equal(delivery.pricing_distance_km,expected===8?3:0);assert.equal(current.total_amount,1400);assert.equal(current.status,'issued');assert.equal(current.deposit_amount,1000);assert.equal(delivery.amount,450);assert.equal(delivery.legs,6);assert.equal(delivery.trip_multiplier,1.5);assert.equal(delivery.zone,'peer-zone');assert.equal(current.extras.financial_snapshot.rental,850);
});
for(const peerAt of ['2026-11-15T12:02:00Z',''])await check(`late acknowledgement retains canonical peer route with ${peerAt?'newer':'unordered'} timestamp`,async()=>{
 const h=harness({count:1}),save=deferred();let payload;const fresh=clone(h.state.bookings);fresh[0].total_amount=1500;fresh[0].extras.delivery={route_km:8,distance_source:'road_city',route_backfilled_at:peerAt,pricing_distance_km:3,amount:450,legs:6};
 h.setApi(body=>{if(body.action==='list')return{bookings:fresh};payload=body;return save.promise});const running=h.run();await flush();await h.time.advance(15000);await running;
 save.resolve({...apiAck(payload),delivery:{...apiAck(payload).delivery,route_backfilled_at:'2026-11-15T12:01:00Z'}});await flush();await h.run();assertIdle(h);assert.equal(h.snapshot().review,null);assert.equal(h.writes().length,1);assert.equal(h.state.bookings[0].extras.delivery.route_km,8);assert.equal(h.state.bookings[0].extras.delivery.pricing_distance_km,3);assert.equal(h.state.bookings[0].extras.delivery.amount,450);assert.equal(h.state.bookings[0].extras.delivery.legs,6);assert.equal(h.state.bookings[0].total_amount,1500);
});
await check('acknowledged route updates current booking when a background snapshot replaced its object',async()=>{
 const h=harness({count:1}),save=deferred();let payload;h.setApi(body=>{if(body.action==='list')return{bookings:clone(h.state.bookings)};payload=body;return save.promise});
 const running=h.run();await flush();h.state.bookings=clone(h.state.bookings);h.state.bookings[0].total_amount=1300;save.resolve(apiAck(payload));await running;
 assertIdle(h);assert.equal(h.state.bookings[0].extras.delivery.route_km,6.5);assert.equal(h.state.bookings[0].total_amount,1300);
});
for(const [name,peerAt,expected] of [['newer','2026-11-15T12:02:00Z',8],['unordered','',8],['provably older','2026-11-15T12:00:00Z',6.5]])await check(`normal acknowledgement preserves ${name} live route precedence when final read hangs`,async()=>{
 const h=harness({count:1}),save=deferred();let payload;h.setApi(body=>{if(body.action==='list')return new Promise(()=>{});payload=body;return save.promise});
 const running=h.run();await flush();h.state.bookings=clone(h.state.bookings);const peer=h.state.bookings[0];peer.total_amount=1550;peer.status='issued';peer.extras.delivery={route_km:8,distance_source:'road_city',route_backfilled_at:peerAt,pricing_distance_km:3,amount:450,legs:6,trip_multiplier:1.5,zone:'peer-zone'};
 save.resolve({...apiAck(payload),delivery:{...apiAck(payload).delivery,route_backfilled_at:'2026-11-15T12:01:00Z',amount:250,legs:4}});await flush();assert.equal(h.reads().length,1);assert.equal(peer.extras.delivery.route_km,expected,'normal ACK preserves live route precedence before final read');
 await h.time.advance(15000);await running;assertIdle(h);const current=h.state.bookings[0],delivery=current.extras.delivery;assert.equal(delivery.route_km,expected);assert.equal(delivery.pricing_distance_km,expected===8?3:0);assert.equal(delivery.route_backfilled_at,expected===8?peerAt:'2026-11-15T12:01:00Z');assert.equal(current.total_amount,1550);assert.equal(current.status,'issued');assert.equal(current.deposit_amount,1000);assert.equal(delivery.amount,450);assert.equal(delivery.legs,6);assert.equal(delivery.trip_multiplier,1.5);assert.equal(delivery.zone,'peer-zone');assert.equal(current.extras.financial_snapshot.rental,850);assert.equal(h.writes().length,1);
});
await check('acknowledged partial route survives a later stale live snapshot and provider error',async()=>{
 const h=harness(),later=deferred();let resolved=0;h.setResolver(()=>++resolved===1?Promise.resolve({routeKm:6.5,pricingDistanceKm:0,distanceSource:'road_city'}):later.promise);
 const running=h.run();await flush();assert.equal(h.writes().length,1);h.state.bookings=clone(h.state.bookings);delete h.state.bookings[0].extras.delivery.route_km;h.state.bookings[0].total_amount=1400;h.state.bookings[0].status='issued';h.state.bookings[0].extras.delivery.amount=450;
 later.reject(new Error('synthetic provider unavailable'));await running;assertIdle(h);assert.equal(h.state.bookings[0].extras.delivery.route_km,6.5);assert.equal(h.state.bookings[0].total_amount,1400);assert.equal(h.state.bookings[0].status,'issued');assert.equal(h.state.bookings[0].extras.delivery.amount,450);assert.match(h.snapshot().message,/Підтверджено 1/);
});
await check('batch including its final read remains bounded by sixty seconds',async()=>{
 const h=harness({count:8});h.setResolver(()=>new Promise(resolve=>h.time.setTimeout(()=>resolve({routeKm:6.5,pricingDistanceKm:0,distanceSource:'road_city'}),10000)));
 h.setApi(payload=>payload.action==='list'?new Promise(()=>{}):apiAck(payload));const running=h.run();await flush();await h.time.advance(60000);await running;
 assertIdle(h);assert.equal(h.time.now,60000);assert.equal(h.writes().length,5);assert.equal(h.reads().length,0);assert.match(h.snapshot().message,/Підтверджено 5/);
});
await check('final read gets only the remaining five seconds of the batch budget',async()=>{
 const h=harness({count:5});h.setResolver(()=>new Promise(resolve=>h.time.setTimeout(()=>resolve({routeKm:6.5,pricingDistanceKm:0,distanceSource:'road_city'}),11000)));
 h.setApi(payload=>payload.action==='list'?new Promise(()=>{}):apiAck(payload));const running=h.run();await flush();await h.time.advance(55000);assert.equal(h.reads().length,1);assert.equal(h.snapshot().busy,true);
 await h.time.advance(5000);await running;assertIdle(h);assert.equal(h.time.now,60000);assert.equal(h.writes().length,5);assert(h.state.bookings.every(row=>row.extras.delivery.route_km===6.5));assert.match(h.snapshot().message,/Підтверджено 5/);
});
await check('missing addresses and unavailable resolver finish without a stuck state',async()=>{
 const h=harness({count:1});h.context.window.__VAC_ROUTE_FOR_ADDRESS__=null;await h.run();assertIdle(h);assert.equal(h.writes().length,0);assert.match(h.snapshot().message,/ще не готовий/);
 const empty=harness({count:0});await empty.run();assertIdle(empty);assert.equal(empty.calls.length,0);
});
await check('unmatched address is skipped and open form is preserved on completion',async()=>{
 const h=harness({count:1,form:true});h.setResolver(async()=>null);await h.run();assertIdle(h);assert.equal(h.writes().length,0);assert.equal(h.renders.length,0);assert.match(h.snapshot().message,/1 адрес/);
});
await check('incomplete save acknowledgement enters guarded review',async()=>{
 const h=harness({count:1});h.setApi(payload=>payload.action==='list'?{bookings:clone(h.state.bookings)}:{ok:true});await h.run();assertReview(h);await h.run();assertReview(h);assert.equal(h.writes().length,1);
});

function providerHarness(fetch){
 const time=clock(),calls=[],context={console,AbortController,setTimeout:time.setTimeout,clearTimeout:time.clearTimeout,ENDPOINT:'https://synthetic.invalid/address',APIKEY:'synthetic-key',normalizeHistoricalRouteAddress:value=>value,hasHouseNumber:()=>true,historicalRouteVariants:value=>[value,'synthetic second candidate'],fetch:(url,options)=>{calls.push({url,options});return fetch(url,options,calls.length)}};
 vm.createContext(context);vm.runInContext(provider,context);return{context,time,calls};
}
await check('provider network hang is bounded at twelve seconds and aborts request',async()=>{
 const h=providerHarness(()=>new Promise(()=>{})),running=h.context.resolveRouteForAddress('Тестова 1',{reportErrors:true});const failure=assert.rejects(running,error=>error.code==='delivery_route_timeout');await flush();await h.time.advance(12000);await failure;
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.signal.aborted,true);assert.equal(h.time.pending,0);
});
await check('provider response-body hang is also bounded and aborted',async()=>{
 const h=providerHarness(async()=>({ok:true,json:()=>new Promise(()=>{})})),running=h.context.resolveRouteForAddress('Тестова 1',{reportErrors:true});const failure=assert.rejects(running,error=>error.code==='delivery_route_timeout');await flush();await h.time.advance(12000);await failure;assert.equal(h.calls[0].options.signal.aborted,true);assert.equal(h.time.pending,0);
});
await check('external abort stops an uncooperative provider immediately with no later variants',async()=>{
 const late=deferred(),h=providerHarness(()=>late.promise),controller=new AbortController(),running=h.context.resolveRouteForAddress('Тестова 1',{signal:controller.signal,reportErrors:true});const failure=assert.rejects(running,error=>error.name==='AbortError');await flush();controller.abort();await failure;
 late.resolve({ok:true,json:async()=>({suggestions:[]})});await flush();assert.equal(h.calls.length,1);assert.equal(h.time.pending,0);
});
await check('already aborted provider request never reaches fetch',async()=>{
 const h=providerHarness(()=>{throw new Error('fetch must not run')}),controller=new AbortController();controller.abort();await assert.rejects(h.context.resolveRouteForAddress('Тестова 1',{signal:controller.signal,reportErrors:true}),error=>error.name==='AbortError');assert.equal(h.calls.length,0);assert.equal(h.time.pending,0);
});
await check('provider quote body is bounded after a successful address lookup',async()=>{
 const h=providerHarness(async(url,options,index)=>index===1?{ok:true,json:async()=>({suggestions:[{houseNumber:'1',lat:49,lon:34,address:'Тестова 1'}]})}:{ok:true,json:()=>new Promise(()=>{})});
 const running=h.context.resolveRouteForAddress('Тестова 1',{reportErrors:true}),failure=assert.rejects(running,error=>error.code==='delivery_route_timeout');await flush();assert.equal(h.calls.length,2);assert.deepEqual(JSON.parse(h.calls[1].options.body),{action:'quote',lat:49,lon:34});await h.time.advance(12000);await failure;assert.equal(h.calls[1].options.signal.aborted,true);assert.equal(h.time.pending,0);
});
await check('ordinary address consumers retain null-on-error compatibility',async()=>{
 const h=providerHarness(async()=>{throw new Error('synthetic unavailable')});assert.equal(await h.context.resolveRouteForAddress('Тестова 1'),null);assert.equal(h.time.pending,0);
});

const report={scope:'Actual shipped route refresh and provider functions, controlled clock and synthetic transports; no live requests',passed:checks.filter(row=>row.passed).length,failed:checks.filter(row=>!row.passed).length,checks};
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice('--output='.length);if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
