import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('assets/admin-v250.css','utf8');

assert.ok(
  css.includes('.booking-form .customer-fields>.passport-data-group{grid-column:1/-1;grid-row:5;align-self:start}'),
  'passport block must span the complete booking form width',
);
assert.ok(
  css.includes('.booking-form .customer-fields>.customer-lookup{grid-column:1/-1;grid-row:6;align-self:start}'),
  'repeat-client card must span the complete booking form width',
);
assert.ok(
  css.includes('.booking-form .customer-fields>.referral-code-field,.booking-form .customer-fields>.delivery-address-field,.booking-form .customer-fields>.passport-data-group,.booking-form .customer-fields>.customer-lookup{grid-column:auto;grid-row:auto}'),
  'mobile layout must reset explicit desktop grid placement',
);

console.log('v4.2.26 BOOKING GRID regression contracts: PASS');
