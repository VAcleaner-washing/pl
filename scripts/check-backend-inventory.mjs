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
  const required=['vacleaner-booking-v5','vacleaner-booking-v4','vacleaner-admin-bookings-v3','vacleaner-admin-bookings-v2','vacleaner-admin-bookings','vacleaner-settings','vacleaner-push'];
  for(const slug of required){const row=bySlug.get(slug);if(!row||row.status!=='ACTIVE'||!/^[a-f0-9]{64}$/.test(row.sha256||''))errors.push(`invalid production function inventory: ${slug}`)}
  for(const [caller,deps] of Object.entries(inventory.dependencyGraph||{}))for(const dep of deps)if(!bySlug.has(dep))errors.push(`untracked dependency ${caller} -> ${dep}`);
  const db=JSON.parse(fs.readFileSync(dbFile,'utf8'));
  if(db.tables?.length!==9||db.rlsEnabledOnAllTables!==true||db.directGrants?.anon!==0||db.directGrants?.authenticated!==0)errors.push('database access inventory is incomplete');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Production backend inventory is complete and internally consistent.');
