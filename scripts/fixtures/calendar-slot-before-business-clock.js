// Frozen 4.3.61 functions: the device-timezone counterexample must remain reproducible.
const todayIso=()=>{const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
function calendarSlotPast(date,window){const today=todayIso();if(date<today)return true;if(date>today)return false;const slots=getSlots(),end=window==='evening'?slots.eveningEnd:slots.morningEnd,[h,m]=String(end||'00:00').split(':').map(Number),now=new Date(),current=now.getHours()*60+now.getMinutes(),limit=(Number(h)||0)*60+(Number(m)||0);return current>limit}
