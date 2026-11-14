import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const runtimeArg=process.argv.find(value=>value.startsWith('--runtime='));
const runtime=fs.readFileSync(runtimeArg?.slice(10)||'assets/admin-v250.js','utf8');
function extract(name){const start=runtime.indexOf(`function ${name}(`);if(start<0)return'';const ends=['\nfunction ','\nasync function '].map(token=>runtime.indexOf(token,start+1)).filter(n=>n>=0);return runtime.slice(start,Math.min(...ends));}
const state={bookings:[],expenses:[]};
const c=vm.createContext({state,bookingResourceQuantities:b=>b.resources||{puzzi:1},equipmentRevenueWeightsForBooking:()=>({puzzi:700,sc2:500,jimmy:350,abir:800}),getEquipmentBaselines:()=>({puzzi:{qty:1,unitCost:1000,total:1000}}),equipmentExpenseTotals:()=>({additionalInvestment:0,repairs:0,upgrades:0}),money:n=>`${n} грн`,h:x=>String(x),console});
for(const name of ['bookingRentalRevenue','bookingEquipmentAllocationState','bookingEquipmentRevenueAllocation','equipmentPaybackRows','equipmentAllocationWarningsMarkup','equipmentPaybackMarkup','equipmentPaybackCompactMarkup']){const source=extract(name);if(source)vm.runInContext(source,c);}
const snapshot=(revenue,amounts,extra={})=>({status:'completed',booking_code:'R4-ALLOCATION-QA',base_amount:revenue,total_amount:revenue,resources:{puzzi:1},extras:{equipment_revenue_allocation:{amounts,...extra}}});
const plain=value=>JSON.parse(JSON.stringify(value));
const checks=[];
function check(name,run){try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}}
check('zero rental pool cannot accept a positive stored allocation',()=>assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(snapshot(0,{puzzi:700}))),{}));
check('valid stored snapshot remains authoritative despite current tariff weights',()=>assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(snapshot(700,{puzzi:700},{model:'historical_v1',rental_amount:700}))),{puzzi:700}));
check('valid zero snapshot stays zero and is not reported as corrupt',()=>{
  state.bookings=[snapshot(0,{},{rental_amount:0})];
  assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(state.bookings[0])),{});
  assert.equal(c.equipmentPaybackRows()[0].invalidAllocationCount,0);
});
check('over-allocation by one is rejected rather than accepted by tolerance',()=>assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(snapshot(700,{puzzi:701}))),{}));
check('under-allocation is flagged instead of repriced using current catalog',()=>assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(snapshot(700,{puzzi:500}))),{}));
check('stored positive allocation to a resource absent from booking is rejected',()=>assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(snapshot(700,{sc2:700}))),{}));
check('malformed and nonfinite stored snapshots do not silently use legacy fallback',()=>{
  for(const value of [{},{amounts:[]},{amounts:{puzzi:'NaN'}},{amounts:{puzzi:-1}},{amounts:{puzzi:0.4}},{amounts:{puzzi:' '}},{amounts:{puzzi:[]}},{amounts:{puzzi:false}},{amounts:{unknown:700}},null]){
    const b=snapshot(700,{});b.extras.equipment_revenue_allocation=value;
    assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(b)),{},JSON.stringify(value));
  }
});
check('missing legacy allocation remains a disclosed estimate and conserves rental pool',()=>{
  const b={status:'completed',base_amount:1050,total_amount:1050,resources:{puzzi:1,jimmy:1},extras:{}};
  assert.deepEqual(plain(c.bookingEquipmentRevenueAllocation(b)),{puzzi:700,jimmy:350});
  state.bookings=[b];assert.equal(c.equipmentPaybackRows()[0].estimatedAllocationCount,1);
});
check('small discounted legacy rental never creates extra allocation by rounding',()=>{
  for(let revenue=0;revenue<=20;revenue++){
    const b={base_amount:revenue,total_amount:revenue,resources:{puzzi:1,sc2:1,jimmy:1,abir:1},extras:{}};
    assert.equal(Object.values(c.bookingEquipmentRevenueAllocation(b)).reduce((sum,n)=>sum+n,0),revenue);
    const uneven={...b,resources:{puzzi:2,sc2:3,jimmy:4,abir:1}};
    assert.equal(Object.values(c.bookingEquipmentRevenueAllocation(uneven)).reduce((sum,n)=>sum+n,0),revenue);
  }
});
check('rendering never rewrites a stored historical snapshot',()=>{
  const b=snapshot(0,{puzzi:700});const before=JSON.stringify(b);state.bookings=[b];
  c.equipmentPaybackMarkup();c.equipmentPaybackCompactMarkup();assert.equal(JSON.stringify(b),before);
});
check('payback excludes invalid snapshot and both surfaces disclose its booking code',()=>{
  state.bookings=[snapshot(0,{puzzi:700}),snapshot(300,{puzzi:300})];
  const row=c.equipmentPaybackRows()[0];
  assert.equal(row.revenue,300);assert.equal(row.payback,30);assert.equal(row.invalidAllocationCount,1);
  for(const html of [c.equipmentPaybackMarkup(),c.equipmentPaybackCompactMarkup()]){
    assert.match(html,/data-allocation-discrepancy/);assert.match(html,/R4-ALLOCATION-QA/);assert.match(html,/не включені/);
  }
});
const failed=checks.filter(row=>!row.passed);
console.log(JSON.stringify({passed:checks.length-failed.length,failed:failed.length,checks}));
if(failed.length)process.exitCode=1;
