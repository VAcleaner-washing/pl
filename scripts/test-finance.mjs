import assert from 'node:assert/strict';
import {settlementConfirmation, settlementFromBooking, selectedExtrasAmount} from '../supabase/functions/vacleaner-admin-bookings-v3/settlement.mjs';
import {settlementFromBooking as settlementV4} from '../supabase/functions/vacleaner-admin-bookings-v4/settlement.mjs';
import {settlementFromBooking as settlementExtend} from '../supabase/functions/vacleaner-extend-rental-v1/settlement.mjs';
import fs from 'node:fs';
import {discountInfo} from '../supabase/functions/vacleaner-admin-bookings-v3/pricing.mjs';

const catalog={puzziPacketPrice:50,products:{
  puzzi:{resources:{puzzi:1}},
  combo:{resources:{puzzi:1,sc2:1}},
  sc2:{resources:{sc2:1}},
  elite:{resources:{puzzi:1,sc2:1,jimmy:1,abir:1}},
}};
const base=(overrides={})=>({
  product_code:'puzzi',base_amount:700,delivery_amount:250,
  prepayment_paid:true,prepayment_amount:200,
  deposit_paid:true,deposit_amount:1000,
  extras:{chemistry:{used_packets:1,story_mention:false}},
  ...overrides,
});

const example=settlementFromBooking(base(),catalog,catalog);
assert.deepEqual({total:example.totalAmount,refund:example.refundAmount,due:example.dueAmount,chem:example.chemistryAmount},{total:1000,refund:200,due:0,chem:50});

const story=settlementFromBooking(base({extras:{chemistry:{used_packets:3,story_mention:true}}}),catalog,catalog);
assert.equal(story.freePackets,2); assert.equal(story.paidPackets,1); assert.equal(story.chemistryAmount,50);

const noStory=settlementFromBooking(base({extras:{chemistry:{used_packets:3,story_mention:false}}}),catalog,catalog);
assert.equal(noStory.chemistryAmount,150);

const extraChemistry=settlementFromBooking(base({extras:{chemistry:{used_packets:10,story_mention:true}}}),catalog,catalog);
assert.equal(extraChemistry.usedPackets,10); assert.equal(extraChemistry.freePackets,2); assert.equal(extraChemistry.paidPackets,8); assert.equal(extraChemistry.chemistryAmount,400);
for(const fn of [settlementV4,settlementExtend]){
  const row=fn(base({extras:{chemistry:{used_packets:10,story_mention:true}}}),catalog,catalog);
  assert.equal(row.usedPackets,10); assert.equal(row.chemistryAmount,400);
}

const nonPuzzi=settlementFromBooking(base({product_code:'sc2',base_amount:500,extras:{chemistry:{used_packets:8,story_mention:false}}}),catalog,catalog);
assert.equal(nonPuzzi.usedPackets,0); assert.equal(nonPuzzi.chemistryAmount,0);

const publicExtras={items:[
  {code:'neutralix',unitPrice:250,quantity:1,amount:250},
  {code:'carpet_chemistry_kit',quantity:8,amount:0},
  {code:'story_mention_bonus',quantity:1,amount:0},
],chemistry:{used_packets:3,story_mention:true}};
assert.equal(selectedExtrasAmount(publicExtras),250);
const publicBooking=settlementFromBooking(base({extras:publicExtras}),catalog,catalog);
assert.equal(publicBooking.totalExtras,300); assert.equal(publicBooking.totalAmount,1250); assert.equal(publicBooking.dueAmount,50);

const adminExtras={selected_items:[{code:'glass',price:150},{code:'neutralix',price:250}],chemistry:{used_packets:0,story_mention:false}};
assert.equal(selectedExtrasAmount(adminExtras),400);

const eliteDue=settlementFromBooking(base({product_code:'elite',base_amount:2300,delivery_amount:0,deposit_amount:3000,extras:{chemistry:{used_packets:0,story_mention:false}}}),catalog,catalog);
assert.equal(eliteDue.refundAmount,900); assert.equal(eliteDue.dueAmount,0);

const unpaidDeposit=settlementFromBooking(base({deposit_paid:false,deposit_amount:1000}),catalog,catalog);
assert.equal(unpaidDeposit.receivedAmount,200); assert.equal(unpaidDeposit.dueAmount,800);

const surchargeBooking=base({base_amount:600,delivery_amount:0,extras:{rental_adjustment:{amount:200,reason:'Додаткові години'},chemistry:{used_packets:0,story_mention:false}}});
for(const fn of [settlementFromBooking,settlementV4,settlementExtend]){
  const row=fn(surchargeBooking,catalog,catalog);
  assert.equal(row.rentalAdjustmentAmount,200);
  assert.equal(row.rentalAdjustmentReason,'Додаткові години');
  assert.equal(row.totalExtras,0);
  assert.equal(row.totalAmount,800);
  assert.equal(row.receivedAmount,1200);
  assert.equal(row.refundAmount,400);
}
const surchargeWithChem=settlementFromBooking(base({base_amount:700,delivery_amount:250,extras:{rental_adjustment:{amount:150,reason:'Продовження'},chemistry:{used_packets:10,story_mention:false}}}),catalog,catalog);
assert.equal(surchargeWithChem.chemistryAmount,500);
assert.equal(surchargeWithChem.rentalAdjustmentAmount,150);
assert.equal(surchargeWithChem.totalExtras,500);
assert.equal(surchargeWithChem.totalAmount,1600);
assert.equal(surchargeWithChem.dueAmount,400);

const adminSource=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
assert.match(adminSource,/Math\.min\(100,digits\(form\.used\)\)/,'admin chemistry counter must accept more than eight portions');
assert.match(adminSource,/name="rentalAdjustmentAmount"/,'admin return finance must expose a positive rental adjustment amount');
assert.match(adminSource,/name="rentalAdjustmentReason"/,'positive rental adjustment must keep an audit reason');
assert.match(adminSource,/rentalAdjustmentAmount:adjustment\.amount,rentalAdjustmentReason:adjustment\.reason/,'save_finance must persist the positive rental adjustment');
const adminEdgeV4=fs.readFileSync(new URL('../supabase/functions/vacleaner-admin-bookings-v4/index.ts',import.meta.url),'utf8');
assert.match(adminEdgeV4,/const rentalAdjustment = Math\.max\(0, Math\.round\(Number\(booking\?\.extras\?\.rental_adjustment\?\.amount\) \|\| 0\)\);\s*const revenue = Math\.max\(0, Math\.round\(Number\(booking\?\.base_amount\) \|\| 0\)\) \+ rentalAdjustment;/,'equipment allocation must include the positive rental adjustment');

const explicitConfirmation=settlementConfirmation({returned:true,settlementConfirmed:true,refundPaid:true,duePaid:false},example);
assert.equal(explicitConfirmation.ok,true); assert.equal(explicitConfirmation.legacy,false);

const missingExplicitPayment=settlementConfirmation({returned:true,settlementConfirmed:true,refundPaid:false,duePaid:false},example);
assert.equal(missingExplicitPayment.ok,false); assert.equal(missingExplicitPayment.error,'refund_not_confirmed');

const legacyMatch=settlementConfirmation({returned:true,refundAmount:200,dueAmount:0},example);
assert.equal(legacyMatch.ok,true); assert.equal(legacyMatch.legacy,true); assert.equal(legacyMatch.refundPaid,true);

const legacyMismatch=settlementConfirmation({returned:true,refundAmount:0,dueAmount:0},example);
assert.equal(legacyMismatch.ok,false); assert.equal(legacyMismatch.error,'settlement_mismatch');

const incompleteLegacy=settlementConfirmation({returned:true,refundAmount:200},example);
assert.equal(incompleteLegacy.ok,false); assert.equal(incompleteLegacy.error,'settlement_not_confirmed');


const existingManual={manual_discount:{type:'percent',value:10,amount:60,reason:'Домовленість'},discount:{source:'manual',type:'percent',percent:10,amount:60,reason:'Домовленість'},loyalty:{percent:0}};
const preserved=discountInfo({},600,existingManual);
assert.equal(preserved.source,'manual'); assert.equal(preserved.amount,60); assert.equal(preserved.baseAmount,540); assert.equal(preserved.manualType,'percent'); assert.equal(preserved.manualValue,10);
const cleared=discountInfo({manualDiscountType:'none',manualDiscountValue:0,manualDiscountReason:''},600,existingManual);
assert.equal(cleared.source,'none'); assert.equal(cleared.amount,0); assert.equal(cleared.baseAmount,600); assert.equal(cleared.manualType,'none');
const regular=discountInfo({loyaltyPercent:5},600,{});
assert.equal(regular.source,'loyalty'); assert.equal(regular.amount,30); assert.equal(regular.baseAmount,570);
const manualFive=discountInfo({manualDiscountType:'percent',manualDiscountValue:5,manualDiscountReason:'Лояльність',loyaltyPercent:0},600,{});
assert.equal(manualFive.source,'manual'); assert.equal(manualFive.amount,30); assert.equal(manualFive.baseAmount,570); assert.equal(manualFive.manualReason,'Лояльність');
const manualFixed=discountInfo({manualDiscountType:'fixed',manualDiscountValue:100,manualDiscountReason:'Компенсація',loyaltyPercent:10},600,{});
assert.equal(manualFixed.source,'manual'); assert.equal(manualFixed.amount,100); assert.equal(manualFixed.baseAmount,500); assert.equal(manualFixed.manualType,'fixed');
const smallerManual=discountInfo({manualDiscountType:'fixed',manualDiscountValue:50,manualDiscountReason:'Компенсація',loyaltyPercent:10},600,{});
assert.equal(smallerManual.source,'loyalty'); assert.equal(smallerManual.amount,60); assert.equal(smallerManual.manualAmount,50);

const returnDiscount=discountInfo({manualDiscountType:'fixed',manualDiscountValue:100,manualDiscountReason:'Компенсація'},700,{});
const discountedReturn=settlementFromBooking(base({base_amount:returnDiscount.baseAmount,delivery_amount:250,extras:{selected_items:[{code:'spot_lifter',price:100,payment_mode:'upfront'}],chemistry:{used_packets:1,story_mention:false}}}),catalog,catalog);
assert.equal(discountedReturn.totalAmount,1000); assert.equal(discountedReturn.refundAmount,200); assert.equal(discountedReturn.dueAmount,0);
const legacyOnOpen=settlementFromBooking(base({base_amount:700,delivery_amount:0,extras:{selected_items:[{code:'spot_lifter',price:100,payment_mode:'on_open',opened:false}],chemistry:{used_packets:0,story_mention:false}}}),catalog,catalog);
assert.equal(legacyOnOpen.selectedExtrasAmount,100); assert.equal(legacyOnOpen.totalAmount,800);
const cappedFixed=discountInfo({manualDiscountType:'fixed',manualDiscountValue:5000,manualDiscountReason:'Компенсація'},700,{});
assert.equal(cappedFixed.amount,700); assert.equal(cappedFixed.baseAmount,0);

console.log('Finance tests passed: extras, >8 chemistry portions and positive rental adjustments are charged correctly.');
