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
for(const name of ['recordedChemistryRevenue','revenueBreakdown','analyticsSourceKey','analyticsSourceLabel','sourcePerformance','weekdayDemand'])vm.runInContext(functionSource(name),context);

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

for(const token of ['З чого складається виручка','Звідки приходять заявки','Попит за днями видачі','Воронка заявок','Виручка не означає прибуток','історію кількості техніки не підмінюємо сьогоднішнім парком'])assert.ok(runtime.includes(token),`decision analytics copy missing: ${token}`);

console.log('Decision analytics formulas and UX contract passed.');
