import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../assets/public-experience.js',import.meta.url),'utf8');
assert.match(source,/function addCalendarDays\(value,days\)/,'missing calendar-day helper');
assert.match(source,/function defaultReturnAfterStart\(startInput\)/,'missing +1 day booking default');
assert.match(source,/addCalendarDays\(startInput\.value,1\)/,'return date must default to +1 calendar day');
assert.match(source,/dateRole\(input\)==='отримання'\)scheduleDefaultReturnAfterStart\(input\)/,'pickup-date change must schedule default return');
assert.match(source,/setNativeValue\(returnInput,next\)/,'default must update the React-controlled return input through native events');

function parseDate(value){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12):null}
function isoDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addCalendarDays(value,days){const date=parseDate(value);if(!date)return '';date.setDate(date.getDate()+days);return isoDate(date)}
assert.equal(addCalendarDays('2026-08-12',1),'2026-08-13');
assert.equal(addCalendarDays('2026-08-31',1),'2026-09-01');
assert.equal(addCalendarDays('2026-12-31',1),'2027-01-01');
assert.equal(addCalendarDays('2028-02-28',1),'2028-02-29');
console.log('Public booking +1 day default passed 9 assertions.');
