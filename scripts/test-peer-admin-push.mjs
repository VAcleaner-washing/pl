import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const push=read('supabase/functions/vacleaner-push/index.ts');
const edge=read('supabase/functions/vacleaner-admin-bookings-v3/index.ts');
const deploy=read('supabase/functions/vacleaner-admin-bookings-v3/index.deploy.js');
const migration=read('supabase/migrations/20260810205500_vacleaner_push_admin_alias.sql');

const checks=[];
const check=(condition,label)=>{if(!condition)throw new Error(`FAIL: ${label}`);checks.push(label)};

check(admin.includes("function currentAdminAlias()"),'admin alias is recovered from the actual login alias');
check(admin.includes("adminAlias:currentAdminAlias(),actorDeviceId:pushDeviceId()"),'booking mutations identify the initiating admin and device');
check(admin.includes("const payload={...body,adminAlias:currentAdminAlias(),actorDeviceId:pushDeviceId()}"),'push subscription sync stores the same admin identity');
check(migration.includes('add column if not exists admin_alias text'),'push subscriptions gain a manager alias');
check(migration.includes("admin_alias in ('vacleaner', 'annanevidoma')"),'database accepts only the two known admin aliases');

check(push.includes('if (action === "notify_admin_event")'),'push API has a dedicated peer-admin event action');
check(push.includes('["new", "issued", "completed"].includes(eventType)'),'only requested booking events are accepted');
check(push.includes('recipientAlias !== actorAlias'),'initiating admin alias is excluded');
check(push.includes('row.device_id !== actorDeviceId'),'device identity is the fallback exclusion for existing subscriptions');
check(push.includes('.eq("user_id", userId).eq("active", true)'),'only active subscriptions for the authenticated admin account are queried');
check(push.includes('event_state_mismatch'),'status pushes are checked against authoritative booking state');
check(push.includes('tag: `vacleaner-admin-${booking.id}-${eventType}`'),'event tag is stable for browser-level deduplication');
check(push.includes('bookingId: booking.id'),'peer push deep-links to the changed booking');

for(const [name,source] of [['edge source',edge],['edge deploy',deploy]]){
  check(source.includes('async function notifyPeerAdmin'),`${name} has a best-effort peer notification helper`);
  check(source.includes('if (action === "create")')&&source.includes('"new", body'),`${name} notifies after an admin-created booking`);
  check(source.includes('nextStatus === "issued" || nextStatus === "completed"'),`${name} notifies on issued/completed transitions`);
  check(source.includes('current.status !== "completed"'),`${name} prevents a duplicate return push`);
  check(source.includes('AbortSignal.timeout(5000)'),`${name} bounds peer push latency`);
}

check(css.includes('.reactivation-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),'sleeping-customer segments have two equal safe columns');
check(css.includes('.reactivation-summary>div{grid-column:1/-1;'),'sleeping-customer total owns a full row and cannot overlap segment cards');
check(css.includes('.reactivation-summary>div strong{flex:0 0 auto;'),'sleeping-customer count cannot crush its label');

console.log(`Peer admin push / analytics layout PASS: ${checks.length} checks.`);
