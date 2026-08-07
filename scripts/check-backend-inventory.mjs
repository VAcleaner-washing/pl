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
  const required=['vacleaner-booking-v5','vacleaner-booking-v4','vacleaner-admin-bookings-v3','vacleaner-admin-bookings-v2','vacleaner-admin-bookings','vacleaner-settings','vacleaner-push','vacleaner-admin-data-v1'];
  for(const slug of required){const row=bySlug.get(slug);if(!row||row.status!=='ACTIVE'||!/^[a-f0-9]{64}$/.test(row.sha256||''))errors.push(`invalid production function inventory: ${slug}`)}
  const bookingV5=bySlug.get('vacleaner-booking-v5'),adminData=bySlug.get('vacleaner-admin-data-v1');
  if(bookingV5?.version!==7)errors.push('production vacleaner-booking-v5 must be v7 for retention/promo support');
  if(adminData?.version!==4)errors.push('production vacleaner-admin-data-v1 must be v4 for campaign management');
  for(const [caller,deps] of Object.entries(inventory.dependencyGraph||{}))for(const dep of deps)if(!bySlug.has(dep))errors.push(`untracked dependency ${caller} -> ${dep}`);

  const db=JSON.parse(fs.readFileSync(dbFile,'utf8'));
  const expectedTables=['vacleaner_admin_users','vacleaner_booking_audit','vacleaner_booking_resources','vacleaner_bookings','vacleaner_campaigns','vacleaner_customers','vacleaner_inventory','vacleaner_promo_codes','vacleaner_promo_redemptions','vacleaner_push_config','vacleaner_push_subscriptions','vacleaner_settings'];
  const actualTables=[...(db.tables||[])].sort();
  if(JSON.stringify(actualTables)!==JSON.stringify([...expectedTables].sort()))errors.push('database table inventory does not match the 12 authoritative vacleaner_* tables');
  if(db.rlsEnabledOnAllTables!==true)errors.push('RLS is not recorded as enabled on every VAcleaner table');
  if(db.directGrants?.anon!==0||db.directGrants?.authenticated!==0||db.directGrants?.serviceRoleOnly!==true)errors.push('database direct-grant inventory is unsafe or incomplete');
  if(Number(db.explicitRestrictivePolicies)!==12)errors.push('expected one restrictive client-deny policy on each of 12 VAcleaner tables');
  const fn=new Set(db.productionFunctions||[]);
  for(const token of ['vacleaner_apply_reservation','vacleaner_operational_health','vacleaner_redeem_promo','vacleaner_preserve_best_promo_discount','vacleaner_slot_index'])if(![...fn].some(name=>name.startsWith(token+'(')))errors.push(`production database function missing from inventory: ${token}`);
  const triggers=new Set(db.bookingTriggers||[]);
  for(const trigger of ['vacleaner_booking_audit_trigger','vacleaner_preserve_best_promo_discount_trg'])if(!triggers.has(trigger))errors.push(`production booking trigger missing from inventory: ${trigger}`);
  if(db.retentionVerification?.sleepingDays!==180)errors.push('retention inventory does not record the 180-day sleeping threshold');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Production backend inventory is complete and internally consistent.');
