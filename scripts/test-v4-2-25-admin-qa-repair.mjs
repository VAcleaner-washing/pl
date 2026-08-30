import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const config=JSON.parse(read('config/vacleaner.json'));
const settings=read('supabase/functions/vacleaner-settings/index.ts');
const has=(source,token,message)=>assert.ok(source.includes(token),message);
const lacks=(source,token,message)=>assert.ok(!source.includes(token),message);

lacks(admin,'<div class="page-head"><div><h1>Пошук</h1>','global search must not render a second page heading');
has(admin,'async function loadAuditLog(bookingId)','booking audit must have a real loader');
has(admin,"action:'audit_log',bookingId,limit:60",'audit loader must call the authenticated booking endpoint');
has(admin,'data-audit-retry','audit failure must be recoverable instead of staying in a loading state');

has(admin,"fuelType:'petrol'",'Vadym car must use petrol');
has(admin,"fuelType:'lpg'",'wife car must use LPG');
has(admin,"car?.fuelType==='lpg'?Number(fuel.lpgPerL)", 'fuel price must be selected per car');
assert.equal(config.deliveryPricing.fuel.cityCars[0].fuelType,'petrol');
assert.equal(config.deliveryPricing.fuel.cityCars[1].fuelType,'lpg');
has(settings,'fuelType: canonical?.fuelType || (car?.fuelType === "lpg" || id === "anna" ? "lpg" : "petrol")','settings backend must preserve canonical car fuel type by stable id');
has(admin,'Середня відстань до клієнта','delivery analytics must name the one-way metric explicitly');
has(admin,'повний пробіг ${avgTrip} · відстань × 4','delivery analytics must expose the full-trip multiplier');

has(admin,'name="customerAddressDetail"','client card must keep entrance/orienting notes separate');
has(admin,"customerAddress:String(form.customerAddress.value||'').trim(),customerAddressDetail:String(form.customerAddressDetail.value||'').trim()",'client save must preserve both address parts separately');
has(admin,"telegram:profile?.telegram||b.customer_telegram||''",'client list must retain saved contact channels');
has(admin,'if(refreshed)requestAnimationFrame(()=>openClientCard(refreshed,options))','successful client save must reopen verified server state and preserve parent context');

has(admin,'class="referral-message-card"','referral message text must be visible by default');
has(admin,'overheadRentalCount:summary.completed.length','booking margin must expose its completed-rental divisor');
has(css,'v4.2.25 — QA repair','release-specific visual repair contract must ship');
has(css,'.campaign-workspace .campaign-summary b{white-space:nowrap','campaign revenue must remain aligned');
has(css,'.booking-form .customer-fields>.referral-code-field{grid-column:2;grid-row:3}','booking client fields must not leave two staggered half-empty rows');

console.log('v4.2.25 ADMIN QA REPAIR contracts: PASS');
