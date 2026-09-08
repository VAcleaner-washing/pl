import fs from 'node:fs';
import assert from 'node:assert/strict';

const phone=fs.readFileSync('supabase/functions/vacleaner-phone-promo-v1/index.ts','utf8');
const campaigns=fs.readFileSync('supabase/functions/vacleaner-campaigns-v1/index.ts','utf8');
const admin=fs.readFileSync('assets/admin-v250.js','utf8');
const booking=fs.readFileSync('supabase/functions/vacleaner-booking-v5/index.ts','utf8');

const phoneActivate=phone.slice(phone.indexOf('if(action==="activate")'),phone.indexOf('if(action!=="lookup")'));
const adminActivate=campaigns.slice(campaigns.indexOf('if(action==="activate_bonus")'),campaigns.indexOf('if(!validUuid(campaignId))',campaigns.indexOf('if(action==="activate_bonus")')));
const pending=campaigns.slice(campaigns.indexOf('if(action==="pending_bonus")'),campaigns.indexOf('if(action==="activate_bonus")'));

assert.ok(phone.includes('promoExpiryFromIssuedAt')&&phone.includes('BONUS_VALID_DAYS*86400000'),'SMS link derives expiry from SMS issue time');
assert.ok(phoneActivate.includes('expiresAtDate=promoExpiryFromIssuedAt(issued.issuedAt)'),'link activation uses issued-at expiry');
assert.ok(!phoneActivate.includes('activatedAt.getTime()+BONUS_VALID_DAYS'),'link click must not start a fresh 21-day window');
assert.ok(phoneActivate.includes('activation_source:"sms_link"'),'link remains activation path 1');
assert.ok(adminActivate.includes('expiresAtDate=promoExpiryFromIssuedAt(issuedAt)'),'manager confirmation uses the same SMS-issued expiry');
assert.ok(!adminActivate.includes('activatedAt.getTime()+PERSONAL_PROMO_VALID_DAYS'),'manager checkbox must not start a fresh 21-day window');
assert.ok(adminActivate.includes('activation_source:"admin"'),'manager remains activation path 2');
assert.ok(pending.includes('smsExpiresAt=promoExpiryFromIssuedAt(issuedAt)')&&pending.includes('smsExpiresAt.getTime()<=now'),'expired SMS is not surfaced as usable pending RETURN');
assert.ok(admin.includes('Клієнт показав SMS')&&admin.includes('data-activate-pending-promo'),'booking has explicit SMS-proof checkbox');
assert.ok(admin.includes('Діє 21 день від отримання SMS'),'RETURN SMS explains the fixed lifetime');
assert.ok(!admin.includes('активовано · діє 21 день'),'admin must not imply a new 21 days starts on confirmation');
assert.ok(booking.includes('codeEnds && codeEnds <= now')||booking.includes('codeEnds&&codeEnds<=now'),'public booking still rejects an expired promo code');
console.log('PASS v4.3.18 RETURN: 21 days from SMS issuance, activation by link or manager proof, no extension on activation');
