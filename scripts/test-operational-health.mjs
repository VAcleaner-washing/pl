import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const migration=read('supabase/migrations/20260807133000_vacleaner_operational_health.sql');
const reservation=read('supabase/migrations/20260807110000_vacleaner_slot_reservation_authority.sql');
const adminData=read('supabase/functions/vacleaner-admin-data-v1/index.ts');
const publicBooking=read('supabase/functions/vacleaner-booking-v5/index.ts');
const admin=read('assets/admin-v250.js');

for(const token of ['pg_advisory_xact_lock','v_reserved + v_resource.quantity > v_capacity','inventory_conflict','vacleaner_slot_index(b.return_date,b.return_window) > v_slot'])assert.ok(reservation.includes(token),`reservation hard-block invariant missing: ${token}`);
for(const token of ['vacleaner_operational_health','pg_get_functiondef','capacityHardBlock','halfOpenSlots','transactionLock'])assert.ok(migration.includes(token),`runtime health proof missing: ${token}`);
for(const token of ['if(action==="health")','db.rpc("vacleaner_operational_health")','vacleaner_push_subscriptions','lastSuccessAt','lastSuccess>=lastFailure'])assert.ok(adminData.includes(token),`admin health endpoint missing: ${token}`);
for(const token of ['notifyWebPush','vacleaner_push_subscriptions','if (!av.available) return json({ error: "not_available"'])assert.ok(publicBooking.includes(token),`public booking operational guard missing: ${token}`);
for(const token of ['Стан production','Hard-block дабл-букінгу','Push VAcleaner','refreshOperationalHealth'])assert.ok(admin.includes(token),`production health UI missing: ${token}`);
console.log('Operational health contract passed.');
