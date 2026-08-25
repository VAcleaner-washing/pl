import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/admin-v250.css',import.meta.url),'utf8');

const checks=[
  [css.includes('.booking-card .status{font-weight:620'), 'issued status badge uses readable medium weight'],
  [css.includes('.booking-card .booking-identity-extras{font-weight:520'), 'selected extras are no longer overly bold'],
  [admin.includes("function bookingOriginMeta(b){if(promoCampaignType(b)!=='quiz')return''"), 'quiz-origin metadata is derived from the booking promo'],
  [admin.includes("if(type==='quiz')return'за проходження підбору'"), 'quiz promo has an explicit discount reason'],
  [admin.includes('class="booking-origin-row"'), 'booking card visibly marks Smart Guide origin'],
  [admin.includes('class="booking-discount-reason"'), 'booking card shows discount reason separately from payment copy'],
  [admin.includes('Оренда до знижки') && admin.includes('Оренда після знижки'), 'booking finance detail separates rental before and after discount'],
  [admin.includes('discount-money-row') && admin.includes('discountReasonText(b)'), 'booking finance detail explains why the discount exists'],
];
for(const [ok,label] of checks){assert.ok(ok,label);console.log('PASS:',label)}
console.log(JSON.stringify({passed:checks.length,failed:0}));
