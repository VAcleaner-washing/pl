import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('assets/admin-v250.js','utf8');
const spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');
function actual(name){
  const needle='function '+name+'(';
  const start=src.indexOf(needle);
  assert.notEqual(start,-1,'Actual admin function exists: '+name);
  const end=src.indexOf('\nfunction ',start+needle.length);
  return src.slice(start,end<0?src.length:end);
}
const ctx={
  state:{bookings:[],filter:'all'},
  $:()=>({value:''}),
  getSlots:()=>({morningStart:'08:00',morningEnd:'09:00',eveningStart:'18:00',eveningEnd:'19:00'}),
  dayDiff:day=>Math.round((Date.parse(day+'T12:00:00Z')-Date.parse('2026-11-17T12:00:00Z'))/86400000),
  isRecentCompleted:b=>b.status==='completed'&&b.recent===true,
  isFinishedCompleted:b=>b.status==='completed'&&b.recent!==true,
  completionMoment:b=>Date.parse(b.completed_at||'1970-01-01'),
  adminProductLabel:(code,label)=>label||code,
};
vm.createContext(ctx);
for(const name of ['tval','scheduleMeta','bookingNextActionKey','filtered'])vm.runInContext(actual(name),ctx);
const results=[];
function test(name,cb){cb();results.push(name);console.log('PASS '+name);}
const booking=(booking_code,status,start_date,pickup_time,return_date,return_time,extras={})=>({
  id:booking_code,booking_code,status,start_date,return_date,
  pickup_window:'morning',return_window:'morning',
  start_at:start_date+'T'+pickup_time+':00',
  created_at:start_date+'T07:00:00Z',customer_name:'QA',customer_phone:'38000000',
  product_label:'Test',product_code:'puzzi',extras:{pickup_time,return_time,...extras}
});
const screenshotIssued=booking('VAC-261117-246AC','issued','2026-11-17','08:30','2026-11-18','08:30');
const screenshotConfirmed=booking('VAC-261117-28D0A','confirmed','2026-11-17','18:00','2026-11-18','18:00');
const ids=()=>Array.from(ctx.filtered(),x=>x.booking_code);
test('Screenshot: today 18:00 pickup must be ABOVE tomorrow 08:30 return',()=>{
  ctx.state.filter='all';ctx.state.bookings=[screenshotIssued,screenshotConfirmed];
  assert.deepEqual(ids(),['VAC-261117-28D0A','VAC-261117-246AC']);
});
test('issued next action uses return datetime, never old rental start',()=>{
  assert.equal(ctx.bookingNextActionKey(screenshotIssued),'2026-11-18T08:30');
  assert.equal(ctx.bookingNextActionKey(screenshotConfirmed),'2026-11-17T18:00');
});
test('same-day pickup and return are interleaved by actual clock time',()=>{
  ctx.state.bookings=[screenshotIssued,
    booking('VAC-TODAY-RETURN','issued','2026-11-16','17:00','2026-11-17','11:00'),
    screenshotConfirmed,booking('VAC-TODAY-PICKUP','confirmed','2026-11-17','09:00','2026-11-18','09:00')];
  assert.deepEqual(ids(),['VAC-TODAY-PICKUP','VAC-TODAY-RETURN','VAC-261117-28D0A','VAC-261117-246AC']);
});
test('old overdue returns stay before today, independent of start date',()=>{
  ctx.state.bookings=[screenshotConfirmed,booking('VAC-OVERDUE','issued','2026-11-14','08:00','2026-11-16','19:00'),screenshotIssued];
  assert.deepEqual(ids(),['VAC-OVERDUE','VAC-261117-28D0A','VAC-261117-246AC']);
});
test('pending requests remain actionable ahead of future deliveries, newest pending first',()=>{
  const a=booking('VAC-PENDING-OLD','pending','2026-11-20','08:00','2026-11-21','08:00');
  const b=booking('VAC-PENDING-NEW','pending','2026-11-20','08:00','2026-11-21','08:00');
  a.created_at='2026-11-17T10:00:00Z';b.created_at='2026-11-17T11:00:00Z';
  ctx.state.bookings=[screenshotIssued,a,screenshotConfirmed,b];
  assert.deepEqual(ids(),['VAC-PENDING-NEW','VAC-PENDING-OLD','VAC-261117-28D0A','VAC-261117-246AC']);
});
test('awaiting-prepayment bookings order by pickup time under their filter',()=>{
  const a=booking('VAC-WAIT-LATE','waiting_payment','2026-11-18','18:00','2026-11-19','18:00');
  const b=booking('VAC-WAIT-EARLY','waiting_payment','2026-11-18','09:00','2026-11-19','09:00');
  ctx.state.filter='waiting_payment';ctx.state.bookings=[a,b];
  assert.deepEqual(ids(),['VAC-WAIT-EARLY','VAC-WAIT-LATE']);
});
test('completed/finished filters preserve existing reverse completion date',()=>{
  const early={...screenshotIssued,status:'completed',booking_code:'VAC-C-OLD',recent:true,completed_at:'2026-11-18T17:00:00Z'};
  const late={...screenshotConfirmed,status:'completed',booking_code:'VAC-C-NEW',recent:true,completed_at:'2026-11-19T17:00:00Z'};
  ctx.state.filter='completed';ctx.state.bookings=[early,late,screenshotConfirmed];
  assert.deepEqual(ids(),['VAC-C-NEW','VAC-C-OLD']);
  ctx.state.filter='all';assert.deepEqual(ids(),['VAC-261117-28D0A']);
});
test('equal action times have stable booking-code order and sorting never mutates state',()=>{
  const a=booking('VAC-Z','issued','2026-11-17','08:00','2026-11-18','08:30');
  const b=booking('VAC-A','issued','2026-11-17','08:00','2026-11-18','08:30');
  ctx.state.bookings=[a,b];const input=[...ctx.state.bookings];
  assert.deepEqual(ids(),['VAC-A','VAC-Z']);
  assert.deepEqual(ctx.state.bookings,input);
});
test('Kyiv calendar string is used, avoiding UTC shifts at 00:00',()=>{
  const b=booking('VAC-EARLY','issued','2026-11-17','23:00','2026-11-18','00:30');
  assert.equal(ctx.bookingNextActionKey(b),'2026-11-18T00:30');
});
test('system spec documents operational ordering contract',()=>{
  assert.ok(spec.includes('BOOK-QUEUE-001'));
});
console.log(JSON.stringify({passed:results.length,failed:0}));
