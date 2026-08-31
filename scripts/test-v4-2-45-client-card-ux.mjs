import fs from 'node:fs';
const js=fs.readFileSync('assets/admin-v250.js','utf8'),css=fs.readFileSync('assets/admin-v250.css','utf8'),spec=fs.readFileSync('docs/VAcleaner-SYSTEM-SPEC.md','utf8');
const checks=[
 ['client card v245 renderer',js.includes('client-card-v245')],
 ['two-column hierarchy',css.includes("grid-template-areas:'contact history' 'benefits benefits' 'document document' 'sms sms'")],
 ['read-first contacts',js.includes('client-contact-read')&&js.includes('clientContactEdit')],
 ['no referral quick action',!js.slice(js.indexOf('function openClientCard('),js.indexOf('function localDateIso',js.indexOf('function openClientCard('))).includes('client-referral-quick')],
 ['referral program stays accessible inside benefits',js.includes('clientOpenReferralDetails')&&js.includes('Переглянути програму')],
 ['benefits referral disclosure',js.includes('Бонуси й referral')&&js.includes('clientPromoInfo')&&js.includes('clientReferralInfo')],
 ['document disclosure',js.includes('details class="modal-section client-secondary-section client-document-section"')],
 ['sms disclosure',js.includes('details class="modal-section client-secondary-section client-sms-section"')],
 ['history limited',js.includes('rentals.slice(0,3)')&&js.includes('clientHistoryMore')],
 ['received breakdown',js.includes('Передоплата ${money(f.pre)} + залоговий платіж ${money(f.depositPaid?f.securityDeposit:0)}')],
 ['settlement hint deposit',js.includes('з них залоговий платіж ${money(result.depositPaid?result.securityDeposit:0)}')],
 ['spec guard',spec.includes('Change record — v4.2.45 CLIENT CARD UX')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}console.log(`TOTAL ${checks.length} · PASS ${checks.length-fail} · FAIL ${fail}`);process.exit(fail?1:0);
