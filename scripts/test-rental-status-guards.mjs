import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,handler,input,variants} from './helpers/backend-admin-harness.mjs';

let checks=0;
for(const file of variants){
  async function fixture(){
    const db=database(),call=handler(file,db);
    const created=await call({...input,action:'create'});
    assert.equal(created.status,201);
    return {db,call,row:db.tables.vacleaner_bookings[0]};
  }
  // All permutations use the real handler and assert the stored row, not a
  // reimplementation of its eligibility predicate. No network is permitted.
  for(const paid of [false,true])for(const waived of [false,true])for(const deposit of [false,true]){
    const {db,call,row}=await fixture();
    Object.assign(row,{status:'confirmed',prepayment_paid:paid,prepayment_amount:paid?200:0,deposit_paid:deposit});
    row.extras.prepayment_waiver={active:waived};
    const before=structuredClone(db.tables);
    const result=await call({action:'update',bookingId:row.id,status:'issued'});
    if(deposit&&(paid||waived)){
      assert.equal(result.status,200);assert.equal(row.status,'issued');
      assert.equal(row.prepayment_paid,paid);assert.equal(row.prepayment_amount,paid?200:0);
    }else{
      assert.equal(result.status,409);assert.equal(result.body.error,'issue_payment_required');
      assert.deepEqual(db.tables,before,'rejected issue cannot write financial/audit/customer data');
    }
    checks++;
  }
  {
    const {db,call,row}=await fixture();row.status='confirmed';row.deposit_paid=true;row.prepayment_paid=false;
    row.extras.prepayment_waiver={active:false};const before=structuredClone(db.tables);
    const r=await call({action:'update',bookingId:row.id,status:'issued',prepaymentPaid:true,depositPaid:true,prepaymentWaiver:true});
    assert.equal(r.status,409);assert.deepEqual(db.tables,before,'request fields cannot fabricate payment or waiver');checks++;
  }
  {
    const {db,call,row}=await fixture();row.status='issued';row.deposit_paid=false;row.prepayment_paid=false;
    const before=structuredClone(db.tables),r=await call({action:'update',bookingId:row.id,status:'issued'});
    assert.equal(r.status,200);assert.equal(r.body.alreadyApplied,true);assert.deepEqual(db.tables,before,'stale retry must not rewrite historical issued data');checks++;
  }
  for(const status of ['pending','waiting_payment','confirmed','issued','completed','cancelled']){
    const {db,call,row}=await fixture();Object.assign(row,{status,deposit_paid:true,deposit_amount:1000,prepayment_paid:true,prepayment_amount:200});
    const before=structuredClone(db.tables),r=await call({action:'update',bookingId:row.id,status:'completed',returned:true,settlementConfirmed:true,refundPaid:true,duePaid:true});
    assert.equal(r.status,409);assert.equal(r.body.error,'settlement_required');assert.deepEqual(db.tables,before,'general update must never bypass final settlement');checks++;
  }
  for(const waived of [false,true]){
    const {db,call,row}=await fixture();Object.assign(row,{status:'confirmed',prepayment_paid:!waived,prepayment_amount:waived?0:200,deposit_paid:true,deposit_amount:1000});
    row.extras.prepayment_waiver={active:waived};
    assert.equal((await call({action:'update',bookingId:row.id,status:'issued'})).status,200);
    const before=structuredClone(db.tables);
    let r=await call({action:'save_deposit_return',bookingId:row.id,returned:true,settlementConfirmed:true});
    assert.equal(r.status,409);assert.equal(r.body.error,'refund_not_confirmed');assert.deepEqual(db.tables,before);
    r=await call({action:'save_deposit_return',bookingId:row.id,returned:true,settlementConfirmed:true,refundPaid:true});
    assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(row.status,'completed');assert.equal(row.deposit_returned,true);
    assert.equal(row.extras.settlement.completed,true);assert.equal(row.extras.settlement.refund_amount,waived?50:250);
    assert.equal(row.prepayment_paid,!waived);assert.equal(row.prepayment_amount,waived?0:200);
    const total=row.total_amount;
    r=await call({action:'save_deposit_return',bookingId:row.id,returned:true,settlementConfirmed:true,refundPaid:true});
    assert.equal(r.status,200);assert.equal(row.total_amount,total);assert.equal(db.tables.vacleaner_referral_codes.length,1,'completion retry does not create a second referral code');checks+=3;
  }
  {
    const {db,call,row}=await fixture();Object.assign(row,{status:'issued',prepayment_paid:true,prepayment_amount:200,deposit_paid:true,deposit_amount:1000});
    let r=await call({action:'save_finance',bookingId:row.id,usedPackets:10,manualChargeAmount:150,manualChargeReason:'Додаткові години'});
    assert.equal(r.status,200);assert.equal(row.total_amount,1600);
    const before=structuredClone(db.tables);
    r=await call({action:'save_deposit_return',bookingId:row.id,returned:true,settlementConfirmed:true});
    assert.equal(r.status,409);assert.equal(r.body.error,'due_not_confirmed');assert.deepEqual(db.tables,before);
    r=await call({action:'save_deposit_return',bookingId:row.id,returned:true,settlementConfirmed:true,duePaid:true});
    assert.equal(r.status,200);assert.equal(row.return_payment_amount,400);assert.equal(row.return_payment_paid,true);
    assert.equal(row.total_amount,1600);assert.equal(row.extras.manual_charge.amount,150);assert.equal(row.extras.chemistry.used_packets,10);checks+=2;
  }
}
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
assert.match(admin,/issue_payment_required:'Для видачі/);
assert.match(admin,/settlement_required:'Завершіть оренду через/);
console.log(`Rental status guards: ${checks} real-handler/persistence checks PASS (TS + deployment JS)`);
