import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');

function functionSource(name){
  const marker=`function ${name}(`,start=runtime.indexOf(marker);
  assert.ok(start>=0,`missing analytics helper: ${name}`);
  const brace=runtime.indexOf('{',start);let depth=0,quote='',escaped=false;
  for(let i=brace;i<runtime.length;i+=1){
    const char=runtime[i];
    if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue}
    if(char==='"'||char==="'"||char==='`'){quote=char;continue}
    if(char==='{')depth+=1;if(char==='}')depth-=1;
    if(depth===0)return runtime.slice(start,i+1)
  }
  throw new Error(`unterminated helper: ${name}`)
}

const context={
  rawRentalBase:booking=>Number(booking?.rawBase??booking?.base_amount??0),
  console,
};
vm.createContext(context);
for(const name of ['recordedChemistryRevenue','revenueBreakdown','analyticsSourceKey','analyticsSourceLabel','sourcePerformance','weekdayDemand','analyticsNiceStep','analyticsAxisScale','analyticsAxisLabel','analyticsFunnel'])vm.runInContext(functionSource(name),context);

const monday={status:'completed',source:'vacleaner_website',start_date:'2026-08-10',total_amount:1200,base_amount:800,delivery_amount:200,extras_amount:200,rawBase:900,extras:{chemistry:{amount:100}}};
const saturday={status:'completed',source:'phone',start_date:'2026-08-08',total_amount:700,base_amount:700,delivery_amount:0,extras_amount:0,rawBase:700,extras:{}};
const cancelled={status:'cancelled',source:'instagram',start_date:'2026-08-09',total_amount:0};

assert.deepEqual({...context.revenueBreakdown([monday,saturday])},{rental:1500,delivery:200,chemistry:100,extras:100,discount:100,total:1900},'revenue components must reconcile to recorded total and keep discounts separate');
const sourceRows=JSON.parse(JSON.stringify(context.sourcePerformance([monday,saturday,cancelled]))).map(row=>({key:row.key,created:row.created,completed:row.completed,cancelled:row.cancelled}));
assert.deepEqual(sourceRows,[
  {key:'website',created:1,completed:1,cancelled:0},
  {key:'phone',created:1,completed:1,cancelled:0},
  {key:'instagram',created:1,completed:0,cancelled:1},
],'source cohort must count created bookings and their current outcome');
const demand=context.weekdayDemand([monday,saturday]);
assert.equal(demand.rows[0].count,1,'Monday issue demand missing');
assert.equal(demand.rows[5].count,1,'Saturday issue demand missing');
assert.equal(demand.weekday,1,'weekday summary mismatch');
assert.equal(demand.weekend,1,'weekend summary mismatch');


const funnelBookings=[
  {status:'pending'},
  {status:'waiting_payment'},
  {status:'confirmed',prepayment_paid:true},
  {status:'issued',prepayment_paid:true,confirmed_at:'2026-08-10T08:00:00Z',issued_at:'2026-08-11T08:00:00Z'},
  {status:'completed',prepayment_paid:true,confirmed_at:'2026-08-08T08:00:00Z',issued_at:'2026-08-09T08:00:00Z'},
  {status:'cancelled'},
];
const funnel=JSON.parse(JSON.stringify(context.analyticsFunnel(funnelBookings)));
assert.deepEqual(funnel.stages.map(row=>row.label),['Заявка','Передоплата','Підтверджено','Видано','Завершено'],'funnel stages must describe cumulative workflow');
assert.deepEqual(funnel.stages.map(row=>row.count),[6,3,3,2,1],'funnel must count reached stages cumulatively, not current status buckets');
assert.equal(funnel.cancelled,1,'cancelled applications must remain visible outside cumulative stages');
assert.equal(funnel.conversion,17,'funnel completion conversion must use created cohort denominator');

const revenueAxis=JSON.parse(JSON.stringify(context.analyticsAxisScale(2900,true)));
assert.deepEqual(revenueAxis.ticks,[0,1000,2000,3000],'revenue axis must use readable full-money ticks for a 2 900 грн peak');
assert.equal(context.analyticsAxisLabel(2900,true),'2 900','revenue labels must use Ukrainian thousands grouping instead of 2.9k shorthand');
const rentalAxis=JSON.parse(JSON.stringify(context.analyticsAxisScale(3,false)));
assert.deepEqual(rentalAxis.ticks,[0,1,2,3],'rental axis must expose unique integer ticks only');
assert.equal(new Set(rentalAxis.ticks).size,rentalAxis.ticks.length,'rental axis must never duplicate rounded labels');
assert.ok(!runtime.includes('Math.round(value/100)/10}k'),'analytics trend must not abbreviate money as 2.9k-style labels');

assert.ok(runtime.includes('<strong>${created.length}</strong>'),'source panel headline must show application count, not number of channels');
assert.ok(!runtime.includes('<strong>${sources.length}</strong>'),'source panel must not expose channel count as primary KPI');
assert.ok(runtime.includes('data-trend-metric="revenue"')&&runtime.includes('data-trend-metric="rentals"'),'business trend must switch between revenue and rentals');
assert.ok(runtime.includes('<svg viewBox="0 0 ${w} ${hgt}"'),'business trend must render a real SVG chart rather than another progress bar');
assert.ok(runtime.includes('analytics-trend-mobile-scale')&&runtime.includes("matchMedia('(max-width:700px)')"),'business trend must use a dedicated mobile composition instead of squeezing the desktop axis');

for(const token of ['Динаміка бізнесу','З чого складається виручка','Звідки приходять заявки','Попит за днями видачі','Воронка заявок','Виручка не означає прибуток','історію кількості техніки не підмінюємо сьогоднішнім парком'])assert.ok(runtime.includes(token),`decision analytics copy missing: ${token}`);

console.log('Decision analytics formulas and UX contract passed.');
