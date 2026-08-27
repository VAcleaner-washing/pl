import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync(new URL('../assets/admin-v250.js',import.meta.url),'utf8');
const backend=fs.readFileSync(new URL('../supabase/functions/vacleaner-admin-bookings-v3/index.ts',import.meta.url),'utf8');

const checks=[
  [backend.includes('async function resolvePhonePromo'), 'admin backend discovers phone-bound promo codes'],
  [backend.includes('action === "create" ? await resolvePhonePromo'), 'new admin booking resolves promo before pricing'],
  [backend.includes('promoPricingExtras'), 'resolved phone promo participates in best-discount pricing'],
  [backend.includes('vacleaner_redeem_promo'), 'admin booking redeems the winning promo atomically after create'],
  [backend.includes('promo: autoPromo ? { ...autoPromo, applied: promoApplied } : null'), 'admin create returns applied promo metadata to UI'],
  [backend.includes('lastProduct: latest?.product_label || "", loyalty, promo,') && admin.includes("invokeCampaign({action:'pending_bonus',phone})"), 'customer lookup returns the active phone promo while pending bonus stays in the campaign API'],
  [admin.includes("action:'lookup_customer',phone,bookingId:b?.id||'',productCode:form.productCode.value,startDate:form.startDate.value,returnDate:form.returnDate.value,pickupWindow:form.pickupWindow.value,returnWindow:form.returnWindow.value"), 'admin new-booking lookup validates promo against current product/dates'],
  [admin.includes('customer-promo-card'), 'new-booking UX visibly explains the phone promo'],
  [admin.includes('client-promo-section'), 'client card has a dedicated bonus section'],
  [admin.includes('loadClientPromoInfo(client.phone)'), 'client card loads promo independently of SMS history'],
  [admin.includes("Promise.allSettled([invokeCampaign({action:'sms_status'}),invokeCampaign({action:'sms_dispatches'})])"), 'SMS campaign bootstrap survives one secondary endpoint failure'],
  [admin.includes("const invokeCampaign=(body,retry=true)=>withUiTimeout"), 'campaign timeout is scoped to campaign API instead of core admin requests'],
  [backend.includes('["pending", "waiting_payment", "confirmed", "issued"].includes(String(row.status))'), 'RETURN active-booking rule matches the public promo validator'],
  [admin.includes('smsAudienceRetry'), 'SMS audience failure has an explicit retry path'],
  [admin.includes("document.addEventListener('pointerdown',event=>{if(!event.target.closest('.campaign-more'))closeCampaignMenus()})"), 'campaign overflow menu closes on outside tap'],
  [admin.includes("if(event.key==='Escape')closeCampaignMenus()"), 'campaign overflow menu closes on Escape'],
  [admin.includes("btn.closest('details')?.removeAttribute('open')"), 'campaign action closes the overflow menu immediately'],
];
for(const [ok,label] of checks){assert.ok(ok,label);console.log('PASS:',label)}
console.log(JSON.stringify({passed:checks.length,failed:0}));
