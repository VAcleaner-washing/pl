import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=f=>fs.readFileSync(f,'utf8');
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS:',name)};
const data=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const sms=read('supabase/functions/vacleaner-sms-v2/index.ts');
const smsLib=read('supabase/functions/vacleaner-sms-v2/lib.ts');
const campaigns=read('supabase/functions/vacleaner-campaigns-v1/index.ts');
const admin=read('assets/admin-v250.js');
const returnBranch=data.slice(data.indexOf('if(campaignType==="return")'),data.indexOf('}else if(campaignType==="personal")'));
check('RETURN campaign creation does not pre-issue promo rows',()=>{assert.ok(returnBranch.includes('eligibleAudience=eligible.length'));assert.ok(returnBranch.includes('usage_limit_total:null'));assert.ok(!returnBranch.includes('vacleaner_promo_codes'));assert.ok(!returnBranch.includes('active:true'))});
check('campaign KPI counts only active issued codes',()=>{assert.ok(data.includes('activeAssigned=assigned.filter((c:any)=>c.active===true)'));assert.ok(data.includes('assignedCodes:activeAssigned.length'))});
check('RETURN audience can prepare deterministic promo preview without DB issuance',()=>{assert.ok(campaigns.includes('personalPromoCode'));assert.ok(campaigns.includes('promoReady:Boolean(promoRow)'));assert.ok(campaigns.includes('row.daysDormant||0)>=dormant'))});
check('SMS preflight does not persist promo issuance',()=>{const pre=sms.slice(sms.indexOf('if(action==="sms_preflight")'),sms.indexOf('if(action==="sms_send")'));assert.ok(!pre.includes('preparePromoCodesForSend'))});
check('SMS send creates promo rows inactive before provider acceptance',()=>{assert.ok(smsLib.includes('preparePromoCodesForSend'));assert.ok(smsLib.includes('active:false'));assert.ok(sms.includes('if(v.personalized)await preparePromoCodesForSend'))});
check('accepted personalized SMS activates promo for that customer',()=>{assert.ok(sms.includes('update({active:true})'));assert.ok(sms.includes('sendpulse_campaign_id:x.value'))});
check('failed or not-delivered SMS deactivates promo',()=>{assert.ok(sms.includes('update({active:false})'));assert.ok(sms.includes('["submitted","sent","delivered"].includes(nextStatus)'))});
check('promo active flag is the single issued-bonus source of truth',()=>{assert.ok(data.includes('activeAssigned=assigned.filter((c:any)=>c.active===true)'));assert.ok(sms.includes('update({active:true})'));assert.ok(sms.includes('update({active:false})'))});
check('RETURN rules still gate selected SMS recipients',()=>{assert.ok(sms.includes('r.daysDormant<dormant'));assert.ok(sms.includes('r.completedOrders<minimum'));assert.ok(sms.includes('r.activeBooking'))});

check('PERSONAL campaign reserves inactive phone-bound code until SMS',()=>{const branch=data.slice(data.indexOf('}else if(campaignType==="personal")'),data.indexOf('}else{',data.indexOf('}else if(campaignType==="personal")')));assert.ok(branch.includes('customer_phone:customerPhone'));assert.ok(branch.includes('active:false'))});
check('RETURN and PERSONAL share recipient-issued SMS transport',()=>{assert.ok(smsLib.includes('["return","personal"].includes(String(campaign.campaign_type||""))'));assert.ok(sms.includes('preparePromoCodesForSend'));assert.ok(admin.includes("serverPersonalizedCampaign=['return','personal'].includes(campaignType)"))});
check('WEEKDAY and PRODUCT remain public shared codes active at campaign creation',()=>{const shared=data.slice(data.indexOf('}else{',data.indexOf('}else if(campaignType==="personal")')),data.indexOf('}catch(codeError)'));assert.ok(shared.includes('customer_phone:null'));assert.ok(shared.includes('active:true'))});
check('QUIZ stays independent from SMS issuance',()=>{assert.ok(!data.includes('campaignType==="quiz"'));assert.ok(admin.includes("type==='quiz'"));assert.ok(admin.includes('campaignDirectPromoLink'))});


check('PERSONAL backend cannot mint a code for another selected phone',()=>{assert.ok(smsLib.includes('if(isPersonal&&!existing)continue'));assert.ok(smsLib.includes('if(isPersonal)continue'))});
check('campaign list preserves PERSONAL target phone without exposing inactive code as issued',()=>{assert.ok(data.includes('targetPhone=String(campaign.campaign_type||"")==="personal"'));assert.ok(data.includes('codes:activeAssigned.slice(0,500)'))});


check('only RETURN requires completed-order history',()=>{assert.ok(data.includes('min_completed_orders:campaignType==="return"?Math.max(1,minCompletedOrders):0'));assert.ok(admin.includes("minCompletedOrders:form.campaignType.value==='return'?1:0"))});
check('PERSONAL campaign must point to a known customer',()=>{assert.ok(data.includes('customer_not_found'));assert.ok(data.includes('knownCustomer'));assert.ok(data.includes('knownBookings'))});
check('PERSONAL SMS audience can include a known customer with zero completed rentals',()=>{assert.ok(smsLib.includes('forcedPhones:string[]=[]'));assert.ok(smsLib.includes('if(profile)stats.set(phone,{phone,name:String(profile.name||phone),count:0,last:""})'));assert.ok(sms.includes('personalCampaign?selected:[]'));assert.ok(campaigns.includes('forcedPhones:string[]=[]'))});
check('QUIZ SMS leads to the quiz instead of bypassing it with the shared promo code',()=>{assert.ok(admin.includes("if(type==='quiz')return'vacleaner.pp.ua/pidbir/'"));assert.ok(admin.includes('пройдіть підбір за 30 сек'));assert.ok(!admin.includes("if(type==='quiz')return `VAcleaner: ваш бонус"))});

console.log(`v4.1.29 promo issuance PASS: ${passed} checks.`);
