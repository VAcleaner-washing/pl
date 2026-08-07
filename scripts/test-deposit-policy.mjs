import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const code=fs.readFileSync(path.join(root,'assets','vacleaner-core.js'),'utf8');
const sandbox={window:{},structuredClone:globalThis.structuredClone};
vm.runInNewContext(code,sandbox,{filename:'vacleaner-core.js'});
const core=sandbox.window.VACLEANER_CORE;
if(!core)throw new Error('VACLEANER_CORE missing');

const cases=[
  ['Saturday morning → Sunday morning','2026-08-08','2026-08-09','morning','morning',1,false],
  ['Saturday evening → Sunday evening','2026-08-08','2026-08-09','evening','evening',1,false],
  ['Friday evening → Sunday morning','2026-08-07','2026-08-09','evening','morning',2,true],
  ['Friday evening → Sunday evening','2026-08-07','2026-08-09','evening','evening',2,true],
  ['Saturday morning → Monday morning','2026-08-08','2026-08-10','morning','morning',2,true],
  ['Monday morning → Wednesday morning','2026-08-10','2026-08-12','morning','morning',2,false],
];
let passed=0;
for(const [label,start,finish,pickup,returned,expectedDays,expectedWeekend] of cases){
  const days=core.rentalDays(start,finish,pickup,returned);
  const weekend=core.isWeekendDeposit(start,finish,pickup,returned);
  if(days!==expectedDays)throw new Error(`${label}: expected ${expectedDays} paid day(s), got ${days}`);
  if(weekend!==expectedWeekend)throw new Error(`${label}: weekend deposit expected ${expectedWeekend}, got ${weekend}`);
  passed+=2;
}
const groups={oneUnit:[1000,2000],twoUnits:[1500,3000],general:[2000,3000],elite:[3000,4000]};
for(const [group,[dayAmount,weekendAmount]] of Object.entries(groups)){
  const rule=core.depositRules[group];
  if(Number(rule.day)!==dayAmount||Number(rule.weekend)!==weekendAmount)throw new Error(`${group}: deposit rule mismatch`);
  const oneDay=core.isWeekendDeposit('2026-08-08','2026-08-09','morning','morning')?rule.weekend:rule.day;
  const weekend=core.isWeekendDeposit('2026-08-07','2026-08-09','evening','morning')?rule.weekend:rule.day;
  if(Number(oneDay)!==dayAmount)throw new Error(`${group}: one-day weekend must use ${dayAmount}`);
  if(Number(weekend)!==weekendAmount)throw new Error(`${group}: two-day weekend must use ${weekendAmount}`);
  passed+=3;
}
console.log(`Deposit policy passed ${passed} assertions.`);
