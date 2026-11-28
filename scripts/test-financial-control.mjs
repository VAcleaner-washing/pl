import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const edge=fs.readFileSync(new URL('../supabase/functions/vacleaner-admin-data-v1/index.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260812193000_vacleaner_financial_control.sql',import.meta.url),'utf8');
const adminCss=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');

function functionSource(name){
  const marker=`function ${name}(`,start=runtime.indexOf(marker);assert.ok(start>=0,`missing helper: ${name}`);
  const brace=runtime.indexOf('{',start);let depth=0,quote='',escaped=false;
  for(let i=brace;i<runtime.length;i+=1){const char=runtime[i];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue}if(char==='"'||char==="'"||char==='`'){quote=char;continue}if(char==='{')depth+=1;if(char==='}')depth-=1;if(depth===0)return runtime.slice(start,i+1)}
  throw new Error(`unterminated helper: ${name}`)
}

const state={expenses:[{id:'a',spent_on:'2026-08-10',amount:300,cost_type:'operating',category:'repair'},{id:'b',spent_on:'2026-08-11',amount:2000,cost_type:'investment',category:'equipment'}],bookings:[{status:'completed',return_date:'2026-08-10',total_amount:1500},{status:'cancelled',return_date:'2026-08-10',total_amount:900}]};
const inBounds=(booking,bounds)=>{const t=Date.parse(`${booking.return_date}T12:00:00`);return t>=bounds.start.getTime()&&t<bounds.end.getTime()};
const context={state,inBounds,console};vm.createContext(context);for(const name of ['expenseInBounds','financialSummary'])vm.runInContext(functionSource(name),context);
const bounds={start:new Date('2026-08-01T00:00:00'),end:new Date('2026-09-01T00:00:00')},summary=context.financialSummary(bounds);
assert.equal(summary.revenue,1500,'revenue must only include completed rentals');
assert.equal(summary.operating,300,'operating expenses must affect profit');
assert.equal(summary.investments,2000,'investments must stay separate');
assert.equal(summary.profit,1200,'operating profit formula is wrong');
assert.equal(summary.margin,80,'operating margin formula is wrong');

// Owner-approved UX-01 exception: empty recorded costs permit an explicitly provisional
// report; unavailable data must never be reported as a successful zero-cost period.
const completed=state.bookings[0];
function caseSummary(expenses,bookings=[completed],extra={}){
  Object.assign(state,{expenses,bookings,dataLoaded:true,financialDataAvailable:true},extra);
  return context.financialSummary(bounds);
}
const absent=caseSummary([]);
assert.equal(absent.operating,0,'a successfully read empty ledger has a recorded total of zero');
assert.equal(absent.profit,1500,'provisional profit uses the same canonical revenue-minus-recorded-cost formula');
assert.equal(absent.margin,100);
assert.equal(absent.available,true);
assert.equal(absent.preliminary,true,'zero records must not imply confirmed absence of real costs');
assert.equal(absent.profitClass,'finance-profit');
assert.equal(absent.notice,'Витрати не внесено. Прибуток і маржинальність попередні');
assert.equal(absent.established,false,'do not change the unknown-cost contract of booking estimates');
const knownZero=caseSummary([{spent_on:'2026-08-10',cost_type:'operating',amount:0}]);
assert.equal(knownZero.operating,0);assert.equal(knownZero.profit,1500);assert.equal(knownZero.margin,100);
assert.equal(knownZero.established,true);assert.equal(knownZero.preliminary,false,'explicit zero record differs from an empty ledger');
const positive=caseSummary([{spent_on:'2026-08-10',cost_type:'operating',amount:300}]);
assert.equal(positive.profit,1200);assert.equal(positive.margin,80);
const loss=caseSummary([{spent_on:'2026-08-10',cost_type:'operating',amount:1800}]);
assert.equal(loss.profitClass,'finance-loss');assert.equal(loss.profit,-300);assert.equal(loss.margin,-20,'a genuine loss must not be clamped or hidden');
const noRevenue=caseSummary([{spent_on:'2026-08-10',cost_type:'operating',amount:100}],[]);
assert.equal(noRevenue.profit,-100);assert.equal(noRevenue.margin,null,'zero-revenue percentage is undefined');
const noRevenueNoCosts=caseSummary([],[]);
assert.equal(noRevenueNoCosts.profitClass,'finance-neutral');assert.equal(noRevenueNoCosts.marginClass,'finance-unknown');assert.equal(noRevenueNoCosts.profit,0);assert.equal(noRevenueNoCosts.margin,null);assert.equal(noRevenueNoCosts.preliminary,true);
const investmentOnly=caseSummary([{spent_on:'2026-08-10',cost_type:'investment',amount:2000}]);
assert.equal(investmentOnly.profit,1500);assert.equal(investmentOnly.investments,2000);assert.equal(investmentOnly.preliminary,true,'investment evidence does not confirm operating expenses');
for(const unavailable of [
  caseSummary([], [completed],{financialDataAvailable:false}),
  caseSummary(null),
  caseSummary([],null),
  caseSummary([],[completed],{dataLoaded:false}),
]){
  assert.equal(unavailable.profitClass,'finance-unknown');assert.equal(unavailable.marginClass,'finance-unknown');assert.equal(unavailable.available,false);assert.equal(unavailable.operating,null);
  assert.equal(unavailable.profit,null);assert.equal(unavailable.margin,null);
  assert.equal(unavailable.preliminary,false,'unavailable data cannot authorize a provisional result');
}

for(const token of ['save_expense','archive_expense','INVESTMENT_CATEGORIES','spentOn>new Date().toISOString().slice(0,10)','is("archived_at",null)'])assert.ok(edge.includes(token),`Edge expense safety contract missing: ${token}`);
for(const token of ['enable row level security','vacleaner_expenses_client_deny','revoke all on public.vacleaner_expenses','grant select,insert,update on public.vacleaner_expenses to service_role','archived_at','cost_type = \'investment\''])assert.ok(migration.includes(token),`database expense safety contract missing: ${token}`);
assert.ok(runtime.includes('Витрати не внесено. Прибуток і маржинальність попередні'),'empty ledger must carry the approved compact provisional warning');
assert.ok(!runtime.includes('finance-onboarding'),'the removed oversized onboarding card must not return');
assert.ok(runtime.includes('Попередній операційний прибуток')&&runtime.includes('Попередня маржинальність'),'provisional figures require explicit report labels');
assert.ok(runtime.includes('Фінансові дані недоступні. Результат не розраховано'),'unavailable data needs an honest status');
for(const token of ['Фінансовий контроль','Операційний прибуток','Інвестиції окремо','Амортизація техніки поки не нараховується'])assert.ok(runtime.includes(token),`financial UX contract missing: ${token}`);
for(const token of ['.expense-form .field input[type=\"date\"]','max-inline-size:100%','overflow:hidden','.expense-form .expense-money input:focus','box-shadow:none','.expense-form .expense-money:focus-within'])assert.ok(adminCss.includes(token),`expense mobile containment contract missing: ${token}`);

console.log('Financial control formulas, backend validation and RLS contract passed.');
