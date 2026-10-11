import fs from 'node:fs';
import assert from 'node:assert/strict';
import {settlementFromBooking} from '../supabase/functions/vacleaner-admin-bookings-v4/settlement.mjs';
import {settlementFromBooking as extendSettlement} from '../supabase/functions/vacleaner-extend-rental-v1/settlement.mjs';

const catalog={puzziPacketPrice:50,products:{puzzi:{resources:{puzzi:1}},sc2:{resources:{sc2:1}}}};
const base={product_code:'puzzi',base_amount:700,delivery_amount:250,prepayment_paid:true,prepayment_amount:200,deposit_paid:true,deposit_amount:1000};
const booking={...base,extras:{chemistry:{used_packets:10,story_mention:true},manual_charge:{amount:150,reason:'Продовження на 2 години'}}};
const finance=settlementFromBooking(booking,catalog,catalog);
assert.equal(finance.usedPackets,10);
assert.equal(finance.freePackets,2);
assert.equal(finance.chemistryAmount,400);
assert.equal(finance.manualChargeAmount,150);
assert.equal(finance.totalExtras,550);
assert.equal(finance.totalAmount,1500);
assert.equal(finance.receivedAmount,1200);
assert.equal(finance.dueAmount,300);
assert.deepEqual(extendSettlement(booking,catalog,catalog),finance,'extension settlement must preserve the finance charge');
assert.deepEqual(settlementFromBooking(booking,catalog,catalog),finance,'repeated calculation must not duplicate a fee');
const edited={...booking,extras:{...booking.extras,manual_charge:{amount:200,reason:'Продовження 3 години'}}};
assert.equal(settlementFromBooking(edited,catalog,catalog).totalAmount,1550,'updating a fee must replace, not append');
assert.equal(settlementFromBooking({...booking,extras:{...booking.extras,manual_charge:null}},catalog,catalog).totalAmount,1350,'clearing a fee must remove it entirely');
assert.equal(settlementFromBooking({...booking,base_amount:630},catalog,catalog).totalAmount,1430,'rental discount cannot change chemical or manual-charge subtotal');
assert.equal(settlementFromBooking({...booking,product_code:'sc2'},catalog,catalog).chemistryAmount,0,'non Puzzi equipment cannot incur packet charges');
assert.equal(settlementFromBooking({...booking,extras:{chemistry:{used_packets:1000,story_mention:false}}},catalog,catalog).usedPackets,100,'packet input must have a safe limit');
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const edge=fs.readFileSync('supabase/functions/vacleaner-admin-bookings-v4/index.ts','utf8');
const deploy=fs.readFileSync('supabase/functions/vacleaner-admin-bookings-v4/index.deploy.js','utf8');
assert.match(admin,/manualChargeAmount:chargeValue\(\)/,'frontend submits the finance charge');
assert.match(admin,/manualChargeReason:chargeReason\(\)/,'frontend submits a reason');
assert.match(admin,/Math\.min\(100,packetValue\(\)\+Number/,'packet stepper allows more than eight');
assert.match(admin,/manualCharge:chargeValue\(\)/,'live preview includes positive fee');
for(const [name,code] of [['source',edge],['deploy',deploy]]){
 assert.match(code,/manual_charge\s*:\s*manualChargeAmount\s*\?/,name+' must persist an explicit charge');
 assert.match(code,/manual_charge_reason_required/,name+' must require a reason');
 assert.match(code,/Object\.prototype\.hasOwnProperty\.call\(body, "manualChargeAmount"\)/,name+' must preserve a charge when issue writes omit it');
}
console.log('v4.3.35 finance + / chemistry regression PASS');
