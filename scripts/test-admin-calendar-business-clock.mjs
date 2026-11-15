import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const runtime=fs.readFileSync('assets/admin-v250.js','utf8');
const start=runtime.indexOf('function calendarBusinessClock('),end=runtime.indexOf('function calendarSlotHtml(',start);
assert(start>=0&&end>start,'Actual calendar clock functions are required');
const source=runtime.slice(start,end);
const baseline=fs.readFileSync('scripts/fixtures/calendar-slot-before-business-clock.js','utf8');
const driver=`import vm from 'node:vm';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(0,'utf8'));
class Clock extends Date{constructor(...args){super(...(args.length?args:[data.instant]))}static now(){return Date.parse(data.instant)}}
const context=vm.createContext({Date:Clock,Intl,getSlots:()=>data.slots});
vm.runInContext(data.source,context);
const values=data.queries.map(query=>vm.runInContext('calendarSlotPast('+JSON.stringify(query.date)+','+JSON.stringify(query.period)+')',context));
process.stdout.write(JSON.stringify(values));`;
function run(code,timezone,instant,queries,slots={morningEnd:'10:00',eveningEnd:'20:00'}){
  return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',driver],{
    input:JSON.stringify({source:code,instant,queries,slots}),env:{...process.env,TZ:timezone},encoding:'utf8'}));
}
const checks=[];
function check(name,action){action();checks.push(name);console.log('PASS '+name)}
const query=(date='2026-11-15',period='morning')=>({date,period});
check('the frozen old implementation reproduces different Poltava availability across device zones',()=>{
  assert.deepEqual(run(baseline,'Europe/Kyiv','2026-11-15T08:30:00Z',[query()]),[true]);
  assert.deepEqual(run(baseline,'UTC','2026-11-15T08:30:00Z',[query()]),[false]);
});
for(const timezone of ['Europe/Kyiv','UTC','America/New_York','Asia/Tokyo','Pacific/Kiritimati']){
  check(timezone+': same instant uses the Poltava clock',()=>assert.deepEqual(run(source,timezone,'2026-11-15T08:30:00Z',[query()]),[true]));
  check(timezone+': exact morning end remains available; next minute expires',()=>{
    assert.deepEqual(run(source,timezone,'2026-11-15T08:00:00Z',[query()]),[false]);
    assert.deepEqual(run(source,timezone,'2026-11-15T08:01:00Z',[query()]),[true]);
  });
  check(timezone+': exact evening end and next minute preserve existing boundary rule',()=>{
    assert.deepEqual(run(source,timezone,'2026-11-15T18:00:00Z',[query(undefined,'evening')]),[false]);
    assert.deepEqual(run(source,timezone,'2026-11-15T18:01:00Z',[query(undefined,'evening')]),[true]);
  });
  check(timezone+': Kyiv midnight compares previous, current and next dates',()=>assert.deepEqual(run(source,timezone,'2026-11-14T22:30:00Z',[query('2026-11-14'),query(),query('2026-11-16')]),[true,false,false]));
  check(timezone+': summer/winter transition days use the IANA business zone',()=>{
    assert.deepEqual(run(source,timezone,'2026-03-29T07:01:00Z',[query('2026-03-29')]),[true]);
    assert.deepEqual(run(source,timezone,'2026-10-25T08:01:00Z',[query('2026-10-25')]),[true]);
  });
  check(timezone+': configured slot end remains authoritative',()=>assert.deepEqual(run(source,timezone,'2026-11-15T07:16:00Z',[query()],{morningEnd:'09:15',eveningEnd:'21:00'}),[true]));
}
console.log(JSON.stringify({passed:checks.length,failed:0}));
