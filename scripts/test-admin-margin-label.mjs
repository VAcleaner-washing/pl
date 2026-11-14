import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const marker='function bookingMarginEstimate(';
const start=runtime.indexOf(marker);
assert.ok(start>=0,'canonical margin helper exists');
const end=runtime.indexOf('\nfunction ',start+marker.length);
assert.ok(end>start,'canonical margin helper is bounded');
const bounds={start:new Date('2026-11-01T00:00:00Z'),end:new Date('2026-12-01T00:00:00Z')};
let summary={established:true,completed:[{}],operating:100};
const context=vm.createContext({
  analyticsBounds:()=>bounds,
  calc:()=>({expenses:0}),
  financialSummary:()=>summary,
  bookingEstimatedFuelProfiles:()=>[],
  bookingRouteNeedsRefresh:()=>false,
  bookingRouteKm:()=>0,
  deliveryTripMultiplierForBooking:()=>4,
  money:value=>`${value} грн`,
});
vm.runInContext(runtime.slice(start,end),context);
const estimate=total=>context.bookingMarginEstimate({fulfillment:'pickup',total_amount:total,base_amount:total},bounds);

const zero=estimate(0);
assert.equal(zero.revenue,0,'zero-revenue fixture must stay zero');
assert.equal(zero.margin,-100,'the existing loss amount must be preserved');
assert.equal(zero.percent,null,'a percentage on zero revenue is undefined');
assert.equal(zero.short,'-100 грн','the short label must preserve the loss without rendering null%');
assert.ok(!zero.short.includes('null%'),'technical null must never be shown as a percentage');

const positive=estimate(700);
assert.equal(positive.margin,600);
assert.equal(positive.percent,86);
assert.equal(positive.short,'600 грн · 86%','positive-revenue formatting must remain unchanged');

summary={established:true,completed:[{}],operating:300};
const loss=estimate(100);
assert.equal(loss.margin,-200);
assert.equal(loss.percent,-200);
assert.equal(loss.short,'-200 грн · -200%','a real negative percentage must not be hidden');

summary={established:false,completed:[],operating:0};
const unknown=estimate(700);
assert.equal(unknown.margin,null);
assert.equal(unknown.percent,null);
assert.equal(unknown.short,'Недостатньо даних','missing cost data must retain the existing unknown state');

summary={established:true,completed:[{}],operating:0};
const zeroCost=estimate(700);
assert.equal(zeroCost.margin,700);
assert.equal(zeroCost.percent,100);
assert.equal(zeroCost.short,'700 грн · 100%','known zero costs must remain distinguishable from unknown costs');
console.log('PASS: canonical margin labels preserve zero-revenue loss, positive/negative percentages, and unknown/known-zero cost states.');
