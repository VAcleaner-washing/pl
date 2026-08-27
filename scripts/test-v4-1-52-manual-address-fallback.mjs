import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const slots=read('assets/public-booking-slots.js');
const address=read('assets/address-autocomplete.js');
const booking=read('bronuvannia/index.html');
const chunk=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
const workflow=read('.github/workflows/pages.yml');
let checks=0,failed=0;
const ok=(name,condition)=>{checks++;if(condition)console.log('OK  ',name);else{failed++;console.error('FAIL',name)}};

ok('release keeps v4.1.52+ fallback contract',Number(release.build)>=4152&&pkg.version===release.version);
ok('unverified address has a distinct manual quote state',slots.includes("zone:'manual'")&&slots.includes("quote.zone==='manual'"));
ok('delivery card shows both known fallback tariffs',slots.includes('Полтава ${formatMoney(deliveryPricing.local)} · передмістя ${formatMoney(deliveryPricing.baseOutside)}'));
ok('desktop summary shows 250 or 350 instead of bare agreement',slots.includes("manualQuote?`${formatMoney(deliveryPricing.local)} або ${formatMoney(deliveryPricing.baseOutside)}`"));
ok('manual quote explains manager confirmation',slots.includes('Менеджер підтвердить тариф: Полтава')&&slots.includes('передмістя — ${formatMoney(deliveryPricing.baseOutside)}'));
ok('address lookup miss immediately states both tariffs',address.includes('Точного збігу немає. Полтава — 250 грн, передмістя — 350 грн. Менеджер підтвердить тариф до передоплати.'));
ok('provider failure has the same useful fallback',address.includes('Пошук адрес тимчасово недоступний. Полтава — 250 грн, передмістя — 350 грн.'));
ok('initial booking copy is neutral and explicit',booking.includes('<strong>Доставка</strong>')&&booking.includes('до вас і назад · Полтава 250 грн · передмістя 350 грн'));
ok('hydrated booking copy matches initial HTML',chunk.includes('children:"Доставка"')&&chunk.includes('до вас і назад · Полтава 250 грн · передмістя 350 грн'));
ok('CI runs this regression',workflow.includes('test:v4.1.52-manual-address-fallback'));

console.log(`v4.1.52 manual address fallback: ${checks-failed}/${checks} OK`);
if(failed)process.exit(1);
