import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('admin/bronuvannia/index.html','utf8');
const ui=fs.readFileSync('assets/admin-v4319-prepayment-waiver.js','utf8');
const edge=fs.readFileSync('supabase/functions/vacleaner-prepayment-waiver-v1/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260909104500_vacleaner_prepayment_waiver.sql','utf8');
const settlement=fs.readFileSync('supabase/functions/vacleaner-admin-bookings-v4/settlement.mjs','utf8');

assert.match(html,/admin-v4319-prepayment-waiver\.js\?v=\d+/,'admin loads the v4.3.19 waiver layer with source or stamped release namespace');
assert.match(ui,/Без передоплати · день у день \/ за домовленістю/,'manager sees an explicit waiver choice');
assert.match(ui,/paid\.checked\|\|waiver\.checked/,'confirmation accepts either paid prepayment or an explicit waiver');
assert.match(ui,/if\(!waiver\.checked\)return legacySubmit/,'normal paid confirmation keeps the existing workflow');
assert.match(ui,/paid\.checked=false/,'waiver never fakes the 200 UAH paid checkbox');
assert.match(ui,/confirm_without_prepayment/,'waiver uses the dedicated backend action');
assert.doesNotMatch(ui,/prepaymentPaid\s*:\s*true/,'waiver UI never submits a fake paid prepayment');

assert.match(edge,/auth\.getUser\(token\)/,'waiver endpoint authenticates the manager token');
assert.match(edge,/from\("admin_users"\)/,'waiver endpoint verifies admin allowlist');
assert.match(edge,/contact_required/,'waiver still requires client contact');
assert.match(edge,/confirmation_required/,'waiver still requires client terms confirmation');
assert.match(edge,/documentsRequired && !identityVerified/,'new-client document guard remains active');
assert.match(edge,/prepayment_waiver: waiver/,'waiver is explicitly stored in booking metadata');
assert.match(edge,/same_day_or_agreement/,'waiver reason is auditable');
assert.match(edge,/vacleaner_confirm_without_prepayment_v1/,'endpoint uses the atomic reservation RPC');

assert.match(migration,/vacleaner_apply_reservation\(/,'waiver path reuses canonical inventory authority');
assert.match(migration,/'waiting_payment'/,'inventory is checked without marking prepayment paid');
assert.match(migration,/status = 'confirmed'/,'waiver ends as a confirmed booking');
assert.match(migration,/prepayment_paid = false/,'confirmed waiver remains unpaid');
assert.match(migration,/prepayment_amount = 0/,'waived prepayment contributes zero to finance');
assert.match(migration,/prepayment_paid_at = null/,'waiver does not fabricate a payment timestamp');
assert.match(migration,/grant execute .* to service_role/i,'waiver RPC remains service-role only');

assert.match(settlement,/current\?\.prepayment_paid === true \? Math\.max\(0, Number\(current\?\.prepayment_amount \|\| 200\)\) : 0/,'settlement counts 0 when prepayment_paid is false');

console.log('v4.3.19 prepayment waiver regression guard passed');
