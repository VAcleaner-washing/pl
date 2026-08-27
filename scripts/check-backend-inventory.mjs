import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const file=path.join(root,'supabase','production-inventory','edge-functions.json');
const dbFile=path.join(root,'supabase','production-inventory','database-security.json');
const errors=[];
if(!fs.existsSync(file))errors.push('production Edge Function inventory is missing');
if(!fs.existsSync(dbFile))errors.push('production database security inventory is missing');
if(!errors.length){
  const inventory=JSON.parse(fs.readFileSync(file,'utf8'));
  const bySlug=new Map(inventory.functions.map(item=>[item.slug,item]));
  const required=['vacleaner-booking-v5','vacleaner-booking-v4','vacleaner-admin-bookings-v3','vacleaner-admin-bookings-v2','vacleaner-admin-bookings','vacleaner-settings','vacleaner-push','vacleaner-admin-data-v1','vacleaner-campaigns-v1','vacleaner-reminders-v1'];
  for(const slug of required){const row=bySlug.get(slug);if(!row||row.status!=='ACTIVE'||!/^[a-f0-9]{64}$/.test(row.sha256||''))errors.push(`invalid production function inventory: ${slug}`)}
  const expectedVersions={
    'vacleaner-booking-v5':24,
    'vacleaner-admin-bookings-v3':30,
    'vacleaner-admin-data-v1':15,
    'vacleaner-campaigns-v1':18,
    'vacleaner-reminders-v1':8,
    'vacleaner-push':7,
    'vacleaner-settings':19,
    'vacleaner-address-v1':10,
    'vacleaner-booking-promo-v1':2,
    'vacleaner-admin-bookings-v4':2,
  };
  for(const [slug,version] of Object.entries(expectedVersions)){
    const row=bySlug.get(slug);
    if(!row||row.status!=='ACTIVE'||row.version!==version)errors.push(`production ${slug} must be ACTIVE v${version}`);
  }
  if(bySlug.get('vacleaner-booking-v5')?.verifyJwt!==false)errors.push('public booking v5 must remain public (verifyJwt=false)');
  for(const slug of ['vacleaner-admin-bookings-v3','vacleaner-admin-data-v1','vacleaner-campaigns-v1','vacleaner-push','vacleaner-booking-promo-v1','vacleaner-admin-bookings-v4'])if(bySlug.get(slug)?.verifyJwt!==true)errors.push(`${slug} must remain authenticated`);
  for(const [caller,deps] of Object.entries(inventory.dependencyGraph||{}))for(const dep of deps)if(!bySlug.has(dep))errors.push(`untracked dependency ${caller} -> ${dep}`);

  const db=JSON.parse(fs.readFileSync(dbFile,'utf8'));
  const expectedTables=['vacleaner_address_cache','vacleaner_admin_users','vacleaner_booking_audit','vacleaner_booking_resources','vacleaner_bookings','vacleaner_campaigns','vacleaner_customers','vacleaner_expenses','vacleaner_inventory','vacleaner_promo_codes','vacleaner_promo_redemptions','vacleaner_push_config','vacleaner_push_subscriptions','vacleaner_referral_codes','vacleaner_referral_rewards','vacleaner_referral_uses','vacleaner_settings','vacleaner_sms_dispatch_recipients','vacleaner_sms_dispatches'];
  const actualTables=[...(db.tables||[])].sort();
  if(JSON.stringify(actualTables)!==JSON.stringify([...expectedTables].sort()))errors.push('database table inventory does not match current authoritative vacleaner_* tables');
  if(db.rlsEnabledOnAllTables!==true)errors.push('RLS is not recorded as enabled on every VAcleaner table');
  if(Number(db.directGrants?.anonPrivilegeRows)!==7||Number(db.directGrants?.authenticatedPrivilegeRows)!==7||JSON.stringify(db.directGrants?.tables)!==JSON.stringify(['vacleaner_address_cache']))errors.push('database direct-grant inventory drifted; only RLS-default-denied address cache may retain browser grants');
  if(Number(db.clientDenyPolicies?.total)!==18||Number(db.clientDenyPolicies?.restrictive)!==12)errors.push('database client-deny policy inventory drifted');
  const fn=new Set(db.productionFunctions||[]);
  for(const token of ['vacleaner_apply_reservation','vacleaner_operational_health','vacleaner_redeem_promo','vacleaner_preserve_best_promo_discount','vacleaner_slot_index'])if(![...fn].some(name=>name.startsWith(token+'(')))errors.push(`production database function missing from inventory: ${token}`);
  const triggers=new Set(db.bookingTriggers||[]);
  for(const trigger of ['vacleaner_booking_audit_trigger','vacleaner_preserve_best_promo_discount_trg'])if(!triggers.has(trigger))errors.push(`production booking trigger missing from inventory: ${trigger}`);
  if(db.retentionVerification?.sleepingDays!==180)errors.push('retention inventory does not record the 180-day sleeping threshold');
  if(db.referralVerification?.friendDiscount!==100||db.referralVerification?.earnedReward!==150||db.referralVerification?.rewardLifetimeDays!==150||db.referralVerification?.expiryReminderDays!==30)errors.push('referral production inventory does not match v4.2.1 business rules');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Committed backend inventory snapshot is internally consistent (not a live Supabase verification).');
