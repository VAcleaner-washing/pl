import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const admin=read('assets/admin-v250.js');
const api=read('supabase/functions/vacleaner-booking-promo-v1/index.ts');
const sql=read('supabase/migrations/20261109190000_vacleaner_admin_referral_correction_v4346.sql');
const systemSpec=read('docs/VAcleaner-SYSTEM-SPEC.md');

for(const fragment of [
  "const referralEditAllowed=Boolean(b&&['pending','waiting_payment','confirmed']",
  'id="applyBookingReferral"',
  'id="clearBookingReferral"',
  "action:'set_referral',bookingId:b.id,referralCode:code",
  "referralCode:b?'':fd.get('referralCode')",
  "referral_existing_discount:'Спочатку приберіть ручну знижку'",
]) assert.ok(admin.includes(fragment),'UI regression: '+fragment);
assert.ok(api.includes("if(action==='set_referral')"),'authenticated admin action');
assert.ok(api.includes("db.auth.getUser(token)")&&api.includes("vacleaner_admin_users"),'admin access check must remain');
assert.ok(api.includes("db.rpc('vacleaner_admin_set_booking_referral'"),'single-transaction RPC');
assert.ok(api.includes("p_code:code"),'referral code passed explicitly');
assert.ok(!api.includes('db.from(\'vacleaner_referral_uses\').insert('),'no unsafe multi-request mutation');

for(const fragment of [
  "where id=p_booking_id for update",
  "not in ('pending','waiting_payment','confirmed')",
  "b.id<>p_booking_id",
  "u.booking_id<>p_booking_id",
  "v_owner.owner_phone=v_booking.customer_phone",
  "referral_first_rental_only",
  "referral_already_used",
  "referral_existing_discount",
  "referral_existing_promo",
  "status='cancelled'",
  "status='pending'",
  "total_amount=greatest(0,v_raw-v_amount)",
  "vacleaner.allow_promo_detach",
  "revoke all on function public.vacleaner_admin_set_booking_referral(uuid,text)",
  "to service_role;",
]) assert.ok(sql.includes(fragment),'atomic referral SQL guard: '+fragment);

for(const fragment of [
  "actualUses=uses.filter(row=>row.status!=='cancelled'&&referralTimestampInBounds(row.created_at,bounds))",
  "outsideCohortReferrers=new Set(",
  "outreachReferrers:convertedPhones.size",
  "bookings:actualUses.length",
  "completed:actualCompleted.length",
  "${m.outreachReferrers}",
  "${m.organicReferrers}",
  "конверсія підтверджених розсилок",
]) assert.ok(admin.includes(fragment),'analytics regression: '+fragment);

assert.ok(systemSpec.includes('REF-010'),'new contract must be documented');
console.log('PASS: guarded admin referral correction and separated outreach/organic metrics');
