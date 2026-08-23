import fs from 'node:fs';
const src=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
let passed=0;const check=(ok,msg)=>{if(!ok){console.error('FAIL:',msg);process.exitCode=1}else{passed++;console.log('PASS:',msg)}};
check(src.includes("if(v==='calendar'&&state.calendar.length)state.calendar=recalcCalendarSlots(state.calendar,state.bookings)"),'entering Calendar recalculates its snapshot from current bookings before render');
check(src.includes("if(state.calendar.length)state.calendar=recalcCalendarSlots(state.calendar,state.bookings);renderBadges()"),'live booking sync refreshes cached Calendar even while another view is open');
check(src.includes("past?'Минув'"),'today/past Calendar slots are not labelled as available');
check(src.includes("$$('[data-calendar-slot]:not(:disabled)')"),'past/occupied Calendar slots cannot open a new booking');
const line=src.split('\n').find(x=>x.startsWith('function recalcCalendarSlots(days,bookings)'));
check(Boolean(line),'calendar recalculation function is present');
if(line){
  const recalc=new Function('tval','slotForTime',`${line};return recalcCalendarSlots;`)(()=>'',()=> 'morning');
  const days=[{date:'2026-08-23',resources:{puzzi:{label:'Puzzi',capacity:2,morning:2,evening:2},sc2:{label:'SC2',capacity:2,morning:2,evening:2}}}];
  const bookings=[
    {status:'issued',start_date:'2026-08-22',return_date:'2026-08-23',pickup_window:'morning',return_window:'morning',vacleaner_booking_resources:[{resource_code:'puzzi',quantity:1}]},
    {status:'confirmed',start_date:'2026-08-23',return_date:'2026-08-24',pickup_window:'morning',return_window:'morning',vacleaner_booking_resources:[{resource_code:'puzzi',quantity:1}]},
  ];
  const out=recalc(days,bookings)[0].resources;
  check(out.puzzi.morning===1 && out.puzzi.evening===1,'23.08 Puzzi reflects one remaining unit instead of full availability for the real transition-day pattern');
  check(out.sc2.morning===2 && out.sc2.evening===2,'unrelated equipment remains fully available');
}
if(!process.exitCode)console.log(`Calendar live consistency PASS: ${passed} checks`);
