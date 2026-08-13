import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtime=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const edge=fs.readFileSync(new URL('../supabase/functions/vacleaner-admin-data-v1/index.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260812193000_vacleaner_financial_control.sql',import.meta.url),'utf8');

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

for(const token of ['save_expense','archive_expense','INVESTMENT_CATEGORIES','spentOn>new Date().toISOString().slice(0,10)','is("archived_at",null)'])assert.ok(edge.includes(token),`Edge expense safety contract missing: ${token}`);
for(const token of ['enable row level security','vacleaner_expenses_client_deny','revoke all on public.vacleaner_expenses','grant select,insert,update on public.vacleaner_expenses to service_role','archived_at','cost_type = \'investment\''])assert.ok(migration.includes(token),`database expense safety contract missing: ${token}`);
for(const token of ['Фінансовий контроль','Операційний прибуток','Інвестиції окремо','прибуток навмисно показується як «—»','Амортизація техніки поки не нараховується'])assert.ok(runtime.includes(token),`financial UX contract missing: ${token}`);

console.log('Financial control formulas, backend validation and RLS contract passed.');
