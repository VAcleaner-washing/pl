import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const slots=read('assets/public-booking-slots.js');
const address=read('assets/address-autocomplete.js');
const booking=read('bronuvannia/index.html');
const chunk=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
const workflow=read('.github/workflows/pages.yml');
const qaRunner=read('scripts/qa-full.mjs');
let checks=0,failed=0;
const ok=(name,condition)=>{checks++;if(condition)console.log('OK  ',name);else{failed++;console.error('FAIL',name)}};

ok('release keeps v4.1.52+ fallback contract',Number(release.build)>=4152&&pkg.version===release.version);
ok('unverified address has a distinct manual quote state',slots.includes("zone:'manual'")&&slots.includes("quote.zone==='manual'"));
ok('delivery card leads with the main Poltava tariff',slots.includes('const fallbackTariffs=`Полтава ${formatMoney(deliveryPricing.local)}`')&&!slots.includes('Полтава ${formatMoney(deliveryPricing.local)} · передмістя'));
ok('desktop summary keeps manual quote pending until address confirmation',slots.includes("manualQuote?'після підтвердження'"));
ok('manual quote explains manager confirmation',slots.includes("manualQuote?'Адресу не розпізнано автоматично. Менеджер підтвердить вартість доставки до передоплати.'"));
ok('address lookup miss keeps manual entry possible without tariff spam',address.includes('Точного збігу немає. Введіть адресу вручну — менеджер перевірить її до передоплати.'));
ok('provider failure has the same quiet fallback',address.includes('Пошук адрес тимчасово недоступний. Введіть адресу вручну — менеджер перевірить її до передоплати.'));
ok('initial booking copy is concise and explicit',booking.includes('<strong>Доставка</strong>')&&booking.includes('до вас і назад · Полтава 250 грн')&&!booking.includes('до вас і назад · Полтава 250 грн · передмістя 350 грн'));
ok('hydrated booking copy matches initial HTML',chunk.includes('children:"Доставка"')&&chunk.includes('до вас і назад · Полтава 250 грн')&&!chunk.includes('до вас і назад · Полтава 250 грн · передмістя 350 грн'));
ok('CI runs this regression',(workflow.includes('test:v4.1.52-manual-address-fallback')||qaRunner.includes('test:v4.1.52-manual-address-fallback')));

console.log(`v4.1.52 manual address fallback: ${checks-failed}/${checks} OK`);
if(failed)process.exit(1);
