import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {discountInfo} from '../supabase/functions/vacleaner-admin-bookings-v3/pricing.mjs';

let passed=0;
const check=(name,fn)=>{fn();passed++;};
const promo=(type,value)=>({discount:{source:'promo'},promo:{discount_type:type,discount_value:value}});
check('fixed promo beats Regular loyalty',()=>{const r=discountInfo({loyaltyPercent:5},700,promo('fixed',100));assert.equal(r.source,'promo');assert.equal(r.amount,100);assert.equal(r.baseAmount,600)});
check('VIP loyalty beats smaller fixed promo',()=>{const r=discountInfo({loyaltyPercent:10},700,promo('fixed',50));assert.equal(r.source,'loyalty');assert.equal(r.amount,70);assert.equal(r.baseAmount,630)});
check('15 percent promo beats VIP',()=>{const r=discountInfo({loyaltyPercent:10},700,promo('percent',15));assert.equal(r.source,'promo');assert.equal(r.amount,105);assert.equal(r.baseAmount,595)});
check('equal promo and loyalty keeps loyalty',()=>{const r=discountInfo({loyaltyPercent:10},700,promo('percent',10));assert.equal(r.source,'loyalty');assert.equal(r.amount,70)});
check('better promo still beats manual 10 percent',()=>{const r=discountInfo({manualDiscountType:'percent',manualDiscountValue:10,manualDiscountReason:'Домовленість',loyaltyPercent:10},700,promo('percent',20));assert.equal(r.source,'promo');assert.equal(r.amount,140);assert.equal(r.manualAmount,70)});
check('manual fixed amount beats VIP when larger',()=>{const r=discountInfo({manualDiscountType:'fixed',manualDiscountValue:100,manualDiscountReason:'Компенсація',loyaltyPercent:10},700,{});assert.equal(r.source,'manual');assert.equal(r.amount,100);assert.equal(r.baseAmount,600)});
check('manual 5 percent ties Regular and keeps automatic loyalty',()=>{const r=discountInfo({manualDiscountType:'percent',manualDiscountValue:5,manualDiscountReason:'Лояльність',loyaltyPercent:5},700,{});assert.equal(r.source,'loyalty');assert.equal(r.amount,35);assert.equal(r.manualAmount,35)});
check('unsupported manual percent is rejected',()=>{const r=discountInfo({manualDiscountType:'percent',manualDiscountValue:7,manualDiscountReason:'Інше'},700,{});assert.equal(r.source,'none');assert.equal(r.manualType,'none');assert.equal(r.amount,0)});

const root=new URL('..',import.meta.url).pathname;
const read=rel=>fs.readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const admin=read('assets/admin-v250.js'), campaignApi=read('supabase/functions/vacleaner-campaigns-v1/index.ts'), editGuard=read('supabase/migrations/20260807135500_vacleaner_promo_edit_guard.sql'), booking=read('supabase/functions/vacleaner-booking-v5/index.ts'), data=read('supabase/functions/vacleaner-admin-data-v1/index.ts'), migration=read('supabase/migrations/20260807132500_vacleaner_retention_campaigns.sql'), bundle=read('_next/static/chunks/146ntlcv_t6~w-v4041.js'), publicBooking=read('assets/public-booking-slots.js');
check('sleeping segment uses 180 days',()=>{assert.match(admin,/SLEEPING_CUSTOMER_DAYS=180/);assert.match(admin,/Сплячі 180\+ днів/)});
check('all four campaign types exist',()=>{for(const token of ['return','weekday','product','personal'])assert.ok(data.includes(`"${token}"`)||admin.includes(token.toUpperCase()))});
check('RETURN eligibility uses true latest completed rental before cutoff',()=>{assert.ok(data.includes('.eq("status","completed").order("return_date",{ascending:false})'));assert.ok(data.includes('row.last<=cutoff'));assert.ok(!data.includes('.eq("status","completed").lte("return_date",cutoff)'))});
check('public promo chooses greater discount rather than stacking',()=>{assert.ok(booking.includes('promoDiscount > loyaltyDiscount'));assert.ok(booking.includes('baseAmount = Math.max(0, rawBase - discount)'));assert.ok(!booking.includes('loyaltyDiscount + promoDiscount'))});
check('promo redemption is transaction locked',()=>{assert.ok(migration.includes("pg_advisory_xact_lock"));assert.ok(migration.includes('vacleaner_redeem_promo'));assert.ok(migration.includes('unique (booking_id)'))});
check('ordinary admin edits cannot silently erase a better applied promo',()=>{assert.ok(editGuard.includes('vacleaner_preserve_best_promo_discount'));assert.ok(editGuard.includes("<> 'promo'"));assert.ok(editGuard.includes("= 'manual'"));assert.ok(editGuard.includes('v_promo_amount > v_loyalty_amount'))});
check('public form ships promo input runtime',()=>{assert.ok((bundle.match(/promoCode/g)||[]).length>=6);assert.ok(bundle.includes('Промокод'))});
check('public loyalty is personal and progress based',()=>{assert.ok(publicBooking.includes('Ваш рівень лояльності'));assert.ok(publicBooking.includes('завершених оренд'));assert.ok(publicBooking.includes('До VIP залишилось'));assert.ok(publicBooking.includes('До знижки −5% залишилось'))});
check('campaign data never directly exposes client tables',()=>{assert.ok(migration.includes('enable row level security'));assert.ok(migration.includes('to anon,authenticated using (false)'))});

check('campaign management has a dedicated admin view',()=>{assert.ok(admin.includes("nav('campaigns','Кампанії'"));assert.ok(admin.includes("v==='campaigns'"));const clients=admin.slice(admin.indexOf('function renderClients()'),admin.indexOf('function openClientCard'));assert.ok(!clients.includes('campaignPanel()'))});
check('campaign lifecycle supports archive and guarded deletion',()=>{assert.ok(campaignApi.includes('action==="archive_campaign"'));assert.ok(campaignApi.includes('action==="delete_campaign"'));assert.ok(campaignApi.includes('campaign_has_history'));assert.ok(admin.includes('data-campaign-archive'));assert.ok(admin.includes('data-campaign-delete'))});

const lifecycleSource=admin.slice(admin.indexOf('const COMPLETED_VISIBLE_DAYS'),admin.indexOf('function scheduleMeta'));
const lifecycleContext={Date,result:null};
vm.runInNewContext(`${lifecycleSource};result={isRecentCompleted,isFinishedCompleted,completionMoment,days:COMPLETED_VISIBLE_DAYS}`,lifecycleContext);
const lifecycle=lifecycleContext.result,now=Date.parse('2026-08-12T12:00:00.000Z');
check('returned rentals stay recent for exactly 14 days',()=>{assert.equal(lifecycle.days,14);assert.equal(lifecycle.isRecentCompleted({status:'completed',completed_at:'2026-07-30T12:00:01.000Z'},now),true);assert.equal(lifecycle.isFinishedCompleted({status:'completed',completed_at:'2026-07-29T12:00:00.000Z'},now),true)});
check('active bookings never enter completed-rental groups',()=>{const booking={status:'issued',completed_at:'2026-07-01T12:00:00.000Z'};assert.equal(lifecycle.isRecentCompleted(booking,now),false);assert.equal(lifecycle.isFinishedCompleted(booking,now),false)});
check('actual completed_at wins over planned return date',()=>{const booking={status:'completed',return_date:'2026-07-01',completed_at:'2026-08-11T12:00:00.000Z'};assert.equal(lifecycle.isRecentCompleted(booking,now),true);assert.equal(lifecycle.completionMoment(booking),Date.parse(booking.completed_at))});
check('booking filters separate returned and finished rentals',()=>{assert.ok(admin.includes("state.filter==='completed')x=x.filter(b=>isRecentCompleted(b)"));assert.ok(admin.includes("state.filter==='finished')x=x.filter(b=>isFinishedCompleted(b)"));assert.ok(admin.includes("['finished','Завершені оренди']"));assert.ok(admin.includes("if(state.filter==='all')x=x.filter(b=>!['completed','cancelled'].includes(b.status))"))});
console.log(`Retention/campaign rules PASS: ${passed} checks.`);
