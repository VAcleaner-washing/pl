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
  const expectedVersions={
    'vacleaner-booking-v5':25,'vacleaner-admin-bookings-v4':4,'vacleaner-settings':20,'vacleaner-push':8,
    'vacleaner-admin-data-v1':16,'vacleaner-campaigns-v1':20,'vacleaner-reminders-v1':8,'vacleaner-booking-promo-v1':3,
    'vacleaner-address-v1':10,'vacleaner-sms-v2':5,'vacleaner-sms-audit-v1':2,'vacleaner-status-correction-v1':7,
    'vacleaner-customer-documents-v1':5,'vacleaner-extend-rental-v1':5,
  };
  for(const [slug,version] of Object.entries(expectedVersions)){const row=bySlug.get(slug);if(!row||row.status!=='ACTIVE'||row.version!==version||!/^[a-f0-9]{64}$/.test(row.sha256||''))errors.push(`production ${slug} inventory mismatch`)}
  if(inventory.frontendEntrypoints?.adminBookings!=='vacleaner-admin-bookings-v4')errors.push('admin frontend entrypoint must be vacleaner-admin-bookings-v4');
  if(inventory.frontendEntrypoints?.publicBooking!=='vacleaner-booking-v5')errors.push('public booking entrypoint must be vacleaner-booking-v5');
  const adminFunctions=['vacleaner-admin-bookings-v4','vacleaner-admin-data-v1','vacleaner-campaigns-v1','vacleaner-sms-v2','vacleaner-sms-audit-v1','vacleaner-booking-promo-v1','vacleaner-status-correction-v1','vacleaner-customer-documents-v1','vacleaner-extend-rental-v1','vacleaner-push'];
  for(const slug of adminFunctions)if(bySlug.get(slug)?.verifyJwt!==false)errors.push(`${slug} must use internal auth with gateway verifyJwt=false`);
  for(const slug of adminFunctions){const p=path.join(root,'supabase','functions',slug,'index.ts');const code=fs.readFileSync(p,'utf8');if(!code.includes('auth.getUser(')||!(code.includes('admin_users')||code.includes('vacleaner_admin_users')))errors.push(`${slug} internal admin authentication missing`)}
  const v4=fs.readFileSync(path.join(root,'supabase','functions','vacleaner-admin-bookings-v4','index.ts'),'utf8');
  if(v4.includes('/functions/v1/vacleaner-admin-bookings-v3'))errors.push('active v4 must not proxy v3');
  if((inventory.dependencyGraph?.['vacleaner-admin-bookings-v4']||[]).some(x=>String(x).startsWith('vacleaner-admin-bookings')))errors.push('active admin route must not depend on another admin-bookings function');
  for(const [caller,deps] of Object.entries(inventory.dependencyGraph||{}))for(const dep of deps)if(!bySlug.has(dep))errors.push(`untracked dependency ${caller} -> ${dep}`);

  const db=JSON.parse(fs.readFileSync(dbFile,'utf8'));
  const expectedTables=['vacleaner_address_cache','vacleaner_admin_users','vacleaner_booking_audit','vacleaner_booking_resources','vacleaner_bookings','vacleaner_campaigns','vacleaner_customers','vacleaner_expenses','vacleaner_inventory','vacleaner_promo_codes','vacleaner_promo_redemptions','vacleaner_push_config','vacleaner_push_subscriptions','vacleaner_referral_codes','vacleaner_referral_messages','vacleaner_referral_rewards','vacleaner_referral_uses','vacleaner_settings','vacleaner_sms_dispatch_recipients','vacleaner_sms_dispatches'];
  const actualTables=[...(db.tables||[])].sort();
  if(JSON.stringify(actualTables)!==JSON.stringify([...expectedTables].sort()))errors.push('database table inventory does not match current authoritative vacleaner_* tables');
  if(db.rlsEnabledOnAllTables!==true)errors.push('RLS is not recorded as enabled on every VAcleaner table');
  if(Number(db.directGrants?.anonPrivilegeRows)!==7||Number(db.directGrants?.authenticatedPrivilegeRows)!==7||JSON.stringify(db.directGrants?.tables)!==JSON.stringify(['vacleaner_address_cache']))errors.push('database direct-grant inventory drifted; only RLS-default-denied address cache may retain browser grants');
  if(Number(db.clientDenyPolicies?.total)!==19||Number(db.clientDenyPolicies?.restrictive)!==13)errors.push('database client-deny policy inventory drifted');
  const fn=new Set(db.productionFunctions||[]);for(const token of ['vacleaner_apply_reservation','vacleaner_operational_health','vacleaner_redeem_promo','vacleaner_preserve_best_promo_discount','vacleaner_slot_index'])if(![...fn].some(name=>name.startsWith(token+'(')))errors.push(`production database function missing from inventory: ${token}`);
  const triggers=new Set(db.bookingTriggers||[]);for(const trigger of ['vacleaner_booking_audit_trigger','vacleaner_preserve_best_promo_discount_trg'])if(!triggers.has(trigger))errors.push(`production booking trigger missing from inventory: ${trigger}`);
  if(db.retentionVerification?.sleepingDays!==180)errors.push('retention inventory does not record the 180-day sleeping threshold');
  if(db.referralVerification?.friendDiscount!==100||db.referralVerification?.earnedReward!==150||db.referralVerification?.rewardLifetimeDays!==150||db.referralVerification?.expiryReminderDays!==30)errors.push('referral production inventory does not match v4.2.1 business rules');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Committed backend inventory snapshot is internally consistent (not a live Supabase verification).');
