import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync('assets/admin-v250.js','utf8');
const css=fs.readFileSync('assets/admin-v250.css','utf8');
const sql=fs.readFileSync('supabase/migrations/20261117090000_vacleaner_equipment_units_v4366.sql','utf8');
const api=fs.readFileSync('supabase/functions/vacleaner-equipment-admin-v1/index.ts','utf8');
const booking=fs.readFileSync('supabase/functions/vacleaner-booking-v5/index.ts','utf8');
const admin=fs.readFileSync('supabase/functions/vacleaner-admin-bookings-v4/index.ts','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');
const checks=[];
const check=(label,test)=>{assert.ok(test,label);checks.push(label);console.log('PASS',label)};
for(const k of [
  'create table if not exists public.vacleaner_equipment_units',
  'create table if not exists public.vacleaner_equipment_unit_events',
  "status in ('ready','repair','retired')",
  'alter table public.vacleaner_equipment_units enable row level security',
  'revoke all on public.vacleaner_equipment_units from public,anon,authenticated',
  'service_role',
  "pg_catalog.hashtext('vacleaner-slot-reservation-v1')",
  'public.vacleaner_booking_resources',
  'equipment_reserved_overlap',
  'v_current_ready<>v_inventory.capacity',
  "status='issued'",
  "capacity >= 0",
])check('migration safety '+k,sql.includes(k));
check('repair state and physical cost never coupled',!sql.includes('equipment_baselines') || sql.includes('NEVER edited'));
check('read uses authenticated admin',api.includes('db.auth.getUser(token)')&&api.includes('db.from("admin_users")'));
check('only admin-only POST endpoint',api.includes('request.method!=="POST"') && !api.includes('SUPABASE_ANON_KEY'));
check('status update via privileged RPC',api.includes('db.rpc("vacleaner_admin_set_equipment_unit_status"'));
check('asset-addition via privileged RPC',api.includes('db.rpc("vacleaner_admin_add_equipment_unit"'));
check('existing booking resource capacity gate preserved',booking.includes('from("vacleaner_inventory").select("resource_code,capacity")')&&admin.includes('from("vacleaner_inventory").select("resource_code,capacity")'));
check('public booking rejects overselling',booking.includes('if (minimum < Number(product.resources?.[code] || 0)) available = false'));
check('all 3 equipment tabs in the same admin view',js.includes('Парк і стан')&&js.includes('Вартість і окупність')&&js.includes('Тарифи'));
check('fleet client uses separate authenticated API',js.includes("EQUIPMENT_API=SUPABASE+'/functions/v1/vacleaner-equipment-admin-v1'")&&js.includes("invokeAt(EQUIPMENT_API,{action:'set_status'"));
check('settings investment route intact',js.includes("localStorage.setItem('vac_admin_settings_tab','equipment')"));
check('no changes to financial baseline when changing unit status',!api.includes('equipment_baselines'));
check('mobile has explicit unit controls',css.includes('.equipment-fleet-unit select')&&css.includes('@media(max-width:900px)'));
check('spec explains inventory/finance separation',spec.includes('FLEET-001'));

function extract(name){
 const start=js.indexOf('function '+name+'(');
 assert.ok(start>=0,'missing function '+name);
 const tail=js.slice(start);
 const end=tail.indexOf('\nfunction ',name.length+10);
 return end<0?tail:tail.slice(0,end);
}
const fakeFleet={
 tab:'fleet',loading:false,error:'',
 data:{inventory:[{resource_code:'jimmy',label:'Jimmy JV35',capacity:1,active:true}],
 units:[
  {id:'00000000-0000-4000-8000-000000000001',resource_code:'jimmy',unit_number:1,status:'ready',note:'В оренді'},
  {id:'00000000-0000-4000-8000-000000000002',resource_code:'jimmy',unit_number:2,status:'repair',note:'Не працює'}
 ],issued:{jimmy:1}}
};
const cx=vm.createContext({
 fleetState:fakeFleet,
 h:s=>String(s).replaceAll('<','&lt;'),
 money:n=>String(n)+' грн',
 getEquipmentBaselines:()=>({puzzi:{qty:2,total:48000},sc2:{qty:2,total:13000},jimmy:{qty:1,total:4500},abir:{qty:2,total:10000}}),
 EQUIPMENT_SECTION_NAMES:{fleet:'Парк і стан',pricing:'Тарифи',finance:'Вартість і окупність'}
});
vm.runInContext(extract('equipmentFleetPanel')+'\n'+extract('equipmentFinancePanel')+'\n'+extract('equipmentSectionTabs'),cx);
const fleet=cx.equipmentFleetPanel(),finance=cx.equipmentFinancePanel(),tabs=cx.equipmentSectionTabs();
check('Jimmy has physical total 2',fleet.includes('Усього <b>2</b>'));
check('Jimmy has repair 1',fleet.includes('Ремонт <b>1</b>'));
check('Jimmy has issued 1',fleet.includes('В оренді <b>1</b>'));
check('Jimmy has safe free 0',fleet.includes('Немає вільних'));
check('unit statuses are editable individually',fleet.includes('data-eq-unit=')&&fleet.includes('value="repair" selected'));
check('three tabs rendered',tabs.includes('data-eq-tab="fleet"')&&tabs.includes('data-eq-tab="pricing"')&&tabs.includes('data-eq-tab="finance"'));
check('financial original fleet investment preserved',finance.includes('75')&&finance.includes('шт'));


// Zero ready units is now a valid state. Calendar must not call 0/0 free.
const calendarContext=vm.createContext({calendarSlotPast:()=>false});
vm.runInContext(extract('availabilityClass')+'\n'+extract('calendarSlotHtml'),calendarContext);
const emptyCalendar=calendarContext.calendarSlotHtml('2035-01-01','jimmy','morning',0,0);
check('zero-capacity calendar slot is disabled and explicitly unavailable',emptyCalendar.includes('disabled')&&emptyCalendar.includes('Недоступно')&&!emptyCalendar.includes('Вільно'));
check('reserved positive capacity keeps its busy label',calendarContext.calendarSlotHtml('2035-01-01','jimmy','morning',0,2).includes('Зайнято'));
check('available positive capacity keeps its free label',calendarContext.calendarSlotHtml('2035-01-01','jimmy','morning',2,2).includes('Вільно'));

console.log(JSON.stringify({passed:checks.length,failed:0}));
