import fs from 'node:fs';
import assert from 'node:assert/strict';

const code=fs.readFileSync('supabase/functions/vacleaner-campaigns-v1/index.ts','utf8');
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const pendingStart=code.indexOf('if(action==="pending_bonus")');
const activateStart=code.indexOf('if(action==="activate_bonus")');
const archiveStart=code.indexOf('if(!validUuid(campaignId))',activateStart);
assert.ok(pendingStart>=0&&activateStart>pendingStart&&archiveStart>activateStart,'RETURN action blocks must exist');
const pending=code.slice(pendingStart,activateStart);
const activate=code.slice(activateStart,archiveStart);
const issueContext=code.slice(code.indexOf('async function campaignPromoContext'),code.indexOf('async function proxySms'));

assert.ok(issueContext.includes('issueEnd=campaign.issuance_ends_at'),'new SMS issuance must still respect issuance_ends_at');
assert.ok(issueContext.includes('issueEnd&&issueEnd<=now'),'closed issuance window must still stop new campaign issuance');

assert.ok(pending.includes('campaignEndsAt=campaign.ends_at'),'pending RETURN visibility must use campaign lifetime');
assert.ok(!pending.includes('issueEnd=campaign.issuance_ends_at'),'already-issued pending RETURN must not disappear when issuance_ends_at passes');
assert.ok(pending.includes('.in("status",["submitted","sent","delivered"])'),'accepted SMS issuance states must remain valid evidence');
assert.ok(pending.includes('.eq("active",false)'),'pending endpoint must only surface inactive issued bonuses');

assert.ok(activate.includes('campaignEndsAt=campaign.ends_at'),'manager activation must use campaign lifetime');
assert.ok(!activate.includes('issueEnd=campaign.issuance_ends_at'),'already-issued RETURN must remain activatable after issuance_ends_at');
assert.ok(activate.includes('activation_source:"admin"'),'manager-confirmed activation source must remain admin');
assert.ok(activate.includes('PERSONAL_PROMO_VALID_DAYS*86400000'),'activation must still start the 21-day validity window');
assert.ok(activate.includes('bonus_not_issued'),'activation must still require matching SMS issuance');

assert.ok(admin.includes('data-activate-pending-promo')&&admin.includes('Клієнт підтвердив SMS'),'admin must keep explicit confirmation instead of auto-activation');
console.log('PASS v4.3.17 issued RETURN stays visible/activatable after issuance close without changing SMS→active semantics');
