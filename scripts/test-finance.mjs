import assert from 'node:assert/strict';
import {settlementConfirmation, settlementFromBooking, selectedExtrasAmount} from '../supabase/functions/vacleaner-admin-bookings-v3/settlement.mjs';
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

const clamped=settlementFromBooking(base({extras:{chemistry:{used_packets:10,story_mention:true}}}),catalog,catalog);
assert.equal(clamped.usedPackets,8); assert.equal(clamped.chemistryAmount,300);

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


const existingManual={discount:{source:'manual',percent:10,amount:60},loyalty:{percent:0}};
assert.deepEqual(discountInfo({},600,existingManual),{percent:10,amount:60,baseAmount:540,source:'manual',loyaltyPercent:0});
assert.deepEqual(discountInfo({discount10:false},600,existingManual),{percent:0,amount:0,baseAmount:600,source:'none',loyaltyPercent:0});
assert.deepEqual(discountInfo({loyaltyPercent:5},600,{}),{percent:5,amount:30,baseAmount:570,source:'loyalty',loyaltyPercent:5});
assert.deepEqual(discountInfo({discount10:true,loyaltyPercent:5},600,{}),{percent:10,amount:60,baseAmount:540,source:'manual',loyaltyPercent:5});

console.log('Finance tests passed: 19 scenarios.');
