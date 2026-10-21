const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

function storedManual(existingExtras={}){
  const saved=existingExtras?.manual_discount;
  if(saved&&typeof saved==='object'){
    const type=saved.type==='fixed'?'fixed':saved.type==='percent'?'percent':'none';
    const savedPercent=Number(saved.value);
    const value=type==='percent'?([5,10].includes(savedPercent)?savedPercent:0):type==='fixed'?Math.max(0,Math.round(Number(saved.value)||0)):0;
    return{type,value,reason:String(saved.reason||'').trim().slice(0,160)};
  }
  const applied=existingExtras?.discount;
  if(applied?.source==='manual'){
    const type=applied.type==='fixed'?'fixed':'percent';
    const appliedPercent=Number(applied.percent||10);
    const value=type==='fixed'?Math.max(0,Math.round(Number(applied.amount)||0)):([5,10].includes(appliedPercent)?appliedPercent:10);
    return{type,value,reason:String(applied.reason||'').trim().slice(0,160)};
  }
  return{type:'none',value:0,reason:''};
}

function manualRequest(body={},existingExtras={}){
  const explicit=own(body,'manualDiscountType')||own(body,'manualDiscountValue')||own(body,'manualDiscountReason')||own(body,'discount10');
  if(!explicit)return storedManual(existingExtras);
  if(own(body,'discount10')&&!own(body,'manualDiscountType')){
    return body.discount10===true?{type:'percent',value:10,reason:String(body.manualDiscountReason||'').trim().slice(0,160)}:{type:'none',value:0,reason:''};
  }
  const type=body.manualDiscountType==='fixed'?'fixed':body.manualDiscountType==='percent'?'percent':'none';
  const requestedPercent=Number(body.manualDiscountValue);
  const value=type==='percent'?([5,10].includes(requestedPercent)?requestedPercent:0):type==='fixed'?Math.max(0,Math.round(Number(body.manualDiscountValue)||0)):0;
  return{type:value>0?type:'none',value:value>0?value:0,reason:value>0?String(body.manualDiscountReason||'').trim().slice(0,160):''};
}

export function discountInfo(body={},rawBase=0,existingExtras={}){
  const base=Math.max(0,Number(rawBase)||0);
  const existingLoyalty=Number(existingExtras?.loyalty?.percent||0);
  const requestedLoyalty=Number(body?.loyaltyPercent);
  const loyaltyPercent=[0,5,10].includes(requestedLoyalty)?requestedLoyalty:([0,5,10].includes(existingLoyalty)?existingLoyalty:0);
  const loyaltyAmount=Math.min(base,Math.round(base*loyaltyPercent/100));

  const promo=existingExtras?.promo&&typeof existingExtras.promo==='object'?existingExtras.promo:null;
  const promoEligible=Boolean(promo&&(promo.applied===true||existingExtras?.discount?.source==='promo'));
  const promoType=promo?.discount_type==='fixed'?'fixed':'percent';
  const promoValue=Math.max(0,Number(promo?.discount_value||0));
  const promoAmount=promoEligible?Math.min(base,promoType==='fixed'?Math.round(promoValue):Math.round(base*Math.min(100,promoValue)/100)):0;

  const manual=manualRequest(body,existingExtras);
  const manualAmount=manual.type==='fixed'?Math.min(base,Math.round(manual.value)):manual.type==='percent'?Math.min(base,Math.round(base*Math.min(100,manual.value)/100)):0;

  const storedReward=Math.max(0,Math.round(Number(existingExtras?.referral_reward?.amount||0)));
  const requestedReward=own(body,'referralRewardAmount')?Math.max(0,Math.round(Number(body.referralRewardAmount)||0)):storedReward;
  const loyaltyReferralAmount=Math.min(150,requestedReward,Math.max(0,base-loyaltyAmount));
  const loyaltyBundleAmount=loyaltyAmount+loyaltyReferralAmount;

  // Compare complete benefits, not just the primary discount. A promo/manual discount
  // must beat loyalty + the earned referral reward before it can displace that reward.
  // On an exact tie we preserve the referral reward for a future rental.
  let source=loyaltyAmount>0?'loyalty':'none',type=loyaltyAmount>0?'percent':'none',percent=loyaltyPercent,primaryAmount=loyaltyAmount,referralRewardAmount=loyaltyReferralAmount,amount=loyaltyBundleAmount;
  if(promoAmount>0&&(promoAmount>amount||(referralRewardAmount>0&&promoAmount===amount))){source='promo';type=promoType;percent=promoType==='percent'?promoValue:0;primaryAmount=promoAmount;referralRewardAmount=0;amount=promoAmount}
  if(manualAmount>0&&(manualAmount>amount||(referralRewardAmount>0&&manualAmount===amount))){source='manual';type=manual.type;percent=manual.type==='percent'?manual.value:0;primaryAmount=manualAmount;referralRewardAmount=0;amount=manualAmount}
  const finalSource=referralRewardAmount?(loyaltyAmount>0?'loyalty_referral':'referral_reward'):source;

  return{
    type,
    percent,
    amount,
    primaryAmount,
    baseAmount:Math.max(0,base-amount),
    source:finalSource,
    primarySource:source,
    loyaltyPercent,
    manualType:manual.type,
    manualValue:manual.value,
    manualAmount,
    manualReason:manual.reason,
    manualApplied:source==='manual',
    promoAmount,
    loyaltyAmount,
    referralRewardAmount,
  };
}
