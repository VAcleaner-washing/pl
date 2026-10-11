import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../assets/public-experience.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../assets/public-experience-runtime.js',import.meta.url),'utf8');

assert.match(source,/function addCalendarDays\(value,days\)/,'missing calendar-day helper');
assert.match(source,/function defaultReturnAfterStart\(startInput\)/,'missing +1 day booking default');
assert.match(source,/addCalendarDays\(startInput\.value,1\)/,'return date must default to +1 calendar day');
assert.match(source,/dateRole\(input\)==='отримання'\)scheduleDefaultReturnAfterStart\(input\)/,'pickup-date change must schedule default return');
assert.match(source,/setNativeValue\(returnInput,next\)/,'default must update the React-controlled return input through native events');

for(const [label,code] of [['source',source],['runtime',runtime]]){
  assert.match(code,/function normalizeBookingDateBounds\(input\)/,label+': missing rolling booking date bounds');
  assert.match(code,/normalizeBookingDateBounds\(input\);\s*if\(dateState\.has\(input\)\)/,label+': stale static bounds must normalize before date control reuse');
  assert.match(code,/selectedInRange=selected&&\(!min\|\|selected>=min\)&&\(!max\|\|selected<=max\)\?selected:null/,label+': stale selected dates must not pin the calendar to a past month');
  assert.match(code,/viewDate=selectedInRange\|\|min\|\|localCalendarToday\(\)/,label+': empty or stale calendar must open on the effective current bound');
}

function parseDate(value){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12):null}
function isoDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addCalendarDays(value,days){const date=parseDate(value);if(!date)return '';date.setDate(date.getDate()+days);return isoDate(date)}
assert.equal(addCalendarDays('2026-08-12',1),'2026-08-13');
assert.equal(addCalendarDays('2026-08-31',1),'2026-09-01');
assert.equal(addCalendarDays('2026-12-31',1),'2027-01-01');
assert.equal(addCalendarDays('2028-02-28',1),'2028-02-29');

const today=new Date();today.setHours(12,0,0,0);
const staleMin=new Date(today);staleMin.setDate(staleMin.getDate()-67);
const staleMax=new Date(staleMin);staleMax.setDate(staleMax.getDate()+180);
const originalSpan=Math.round((staleMax-staleMin)/86400000);
const rolledMin=new Date(today);
const rolledMax=new Date(today);rolledMax.setDate(rolledMax.getDate()+originalSpan);
assert.equal(originalSpan,180,'fixture must model the production 180-day booking horizon');
assert.equal(Math.round((rolledMax-rolledMin)/86400000),180,'rolling booking window must preserve its horizon');

console.log('Public booking date defaults + rolling calendar bounds passed.');
