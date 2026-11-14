import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const runtimeArg=process.argv.find(value=>value.startsWith('--runtime='));
const sourcePath=runtimeArg?.slice(10)||'assets/admin-v250.js';
if(!process.argv.includes('--child')){
  let failed=false;
  for(const timezone of ['Europe/Kyiv','UTC','America/New_York','Asia/Tokyo','Pacific/Kiritimati']){
    const child=spawnSync(process.execPath,[import.meta.filename,'--child',...(runtimeArg?[runtimeArg]:[])],{env:{...process.env,TZ:timezone},encoding:'utf8'});
    process.stdout.write(child.stdout);process.stderr.write(child.stderr);
    if(child.error)process.stderr.write(`${timezone}: child execution failed: ${child.error.message}\n`);
    if(child.status!==0)failed=true;
  }
  if(failed)process.exitCode=1;
}else{
  const runtime=fs.readFileSync(sourcePath,'utf8');
  const names=['reportDateIso','reportDateMoment','analyticsCurrentYear','localDateIso','analyticsCurrentMonth','analyticsMonthLabel','analyticsBounds','bookingMoment','completedBusinessDate','inBounds','analyticsCreatedMoment','createdInBounds','expenseInBounds','financialSummary','inAnalyticsBounds','bookingCompletionDateIso','weeklyOpsMetrics','analyticsTrendData','referralTimestampInBounds'];
  function extract(name){
    const start=runtime.indexOf(`function ${name}(`);if(start<0)return'';
    const stops=['\nfunction ','\nasync function '].map(token=>runtime.indexOf(token,start+1)).filter(n=>n>=0);
    return runtime.slice(start,Math.min(...stops));
  }
  let now='2026-11-01T00:30:00Z';
  class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return Date.parse(now);}}
  const state={analyticsMonth:'2026-11',analyticsYear:'2026',expenses:[{spent_on:'2026-11-01',cost_type:'operating',amount:100}],bookings:[{id:'completed',status:'completed',completed_at:'2026-10-31T22:30:00Z',created_at:'2026-10-31T22:30:00Z',start_date:'2026-10-31',return_date:'2026-11-01',total_amount:700,source:'phone',product_code:'puzzi'}]};
  const c=vm.createContext({Date:ClockDate,Intl,state,sourceLabel:value=>value||'unknown',adminProductLabel:value=>value,console});
  for(const name of names){const source=extract(name);if(source)vm.runInContext(source,c);}
  const checks=[];
  function check(name,run){try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}}
  check('Kyiv completion date agrees across CRM and weekly helper',()=>{
    assert.equal(c.completedBusinessDate(state.bookings[0]),'2026-11-01');
    assert.equal(c.bookingCompletionDateIso(state.bookings[0]),'2026-11-01');
  });
  check('Finance, report, created cohort and trend share the November event',()=>{
    const bounds=c.analyticsBounds('month'),booking=state.bookings[0];
    assert.equal(c.inBounds(booking,bounds),true);
    assert.equal(c.inAnalyticsBounds(c.bookingCompletionDateIso(booking),bounds),true);
    assert.equal(c.createdInBounds(booking,bounds),true);
    assert.equal(c.financialSummary(bounds).revenue,700);
    assert.equal(c.financialSummary(bounds).operating,100);
    assert.equal(c.financialSummary(bounds).profit,600);
    const trend=c.analyticsTrendData(state.bookings,bounds,'month');
    assert.equal(trend.find(row=>row.key==='2026-11-01')?.revenue,700);
    assert.equal(trend.reduce((sum,row)=>sum+row.rentals,0),1);
  });
  check('Reporting today/month/year uses Kyiv when browser remains October',()=>{
    now='2026-10-31T22:30:00Z';
    assert.equal(c.analyticsCurrentMonth(),'2026-11');
    state.analyticsMonth='';
    const bounds=c.analyticsBounds('month');
    assert.equal(c.localDateIso(bounds.start),'2026-11-01');
    assert.equal(c.localDateIso(bounds.end),'2026-11-02');
    now='2026-12-31T22:30:00Z';state.analyticsYear='';
    const year=c.analyticsBounds('year');
    assert.equal(c.localDateIso(year.start),'2027-01-01');
    assert.equal(c.localDateIso(year.end),'2027-01-02');
  });
  check('Weekly report preserves exact seven calendar days over browser DST',()=>{
    now='2026-11-02T00:30:00Z';
    state.bookings=[{id:'edge',status:'completed',completed_at:'2026-10-26T22:30:00Z',created_at:'2026-10-26T22:30:00Z',start_date:'2026-10-26',return_date:'2026-10-27',total_amount:700,source:'phone',product_code:'puzzi'}];
    const report=c.weeklyOpsMetrics();
    assert.equal(c.localDateIso(report.current.start),'2026-10-27');
    assert.equal(c.localDateIso(report.current.end),'2026-11-03');
    assert.equal(c.localDateIso(report.current.previous.start),'2026-10-20');
    assert.equal(report.current.previous.start.getHours(),0);
    assert.equal(report.summaryNow.revenue,700);
    assert.equal(report.summaryNow.completed.length,1);
    assert.equal(report.createdNow,1);
    assert.equal(report.bestProduct[1],1);
    assert.equal(report.topSource[1],1);
  });
  check('Timestamp day boundaries, offsets and Kyiv DST are unambiguous',()=>{
    for(const [value,day] of [
      ['2026-03-28T21:59:00Z','2026-03-28'],['2026-03-28T22:00:00Z','2026-03-29'],
      ['2026-03-29T00:59:00Z','2026-03-29'],['2026-03-29T01:00:00Z','2026-03-29'],
      ['2026-10-24T20:59:00Z','2026-10-24'],['2026-10-24T21:00:00Z','2026-10-25'],
      ['2026-10-25T00:30:00Z','2026-10-25'],['2026-10-25T01:30:00Z','2026-10-25'],
      ['2026-10-31T23:30:00+02:00','2026-10-31'],['2026-10-31T23:30:00-04:00','2026-11-01'],
      ['2026-10-31T23:30:00','2026-10-31'],['2026-10-31 23:30:00','2026-10-31'],
      ['2026-11-01','2026-11-01'],
    ])assert.equal(c.bookingCompletionDateIso({completed_at:value}),day,value);
  });
  check('Referral date cohorts use the same day, preserving half-open bounds',()=>{
    now='2026-11-15T12:00:00Z';state.analyticsMonth='2026-11';
    const bounds=c.analyticsBounds('month');
    assert.equal(c.referralTimestampInBounds('2026-10-31T22:00:00Z',bounds),true);
    assert.equal(c.referralTimestampInBounds('2026-10-31T21:59:59Z',bounds),false);
    assert.equal(c.referralTimestampInBounds('2026-11-30T22:00:00Z',bounds),false);
  });
  check('Date-only expense and legacy rental days remain calendar dates',()=>{
    state.analyticsMonth='2026-11';const bounds=c.analyticsBounds('month');
    assert.equal(c.inBounds({status:'completed',return_date:'2026-11-01'},bounds),true);
    assert.equal(c.expenseInBounds({spent_on:'2026-11-01'},bounds),true);
    assert.equal(c.expenseInBounds({spent_on:'2026-10-31'},bounds),false);
    assert.equal(c.bookingCompletionDateIso({return_date:'2026-11-01'}),'2026-11-01');
    assert.equal(c.inBounds({status:'completed',completed_at:'not-a-date'},bounds),false);
    for(const value of ['2026-02-30','2026-02-30T12:00:00Z','2026-11-01T25:00:00','2026-11-01T12:99:00']){
      assert.equal(c.bookingCompletionDateIso({completed_at:value}),'',value);
    }
  });
  const failed=checks.filter(row=>!row.passed);
  console.log(JSON.stringify({timezone:process.env.TZ,passed:checks.length-failed.length,failed:failed.length,checks}));
  if(failed.length)process.exitCode=1;
}
