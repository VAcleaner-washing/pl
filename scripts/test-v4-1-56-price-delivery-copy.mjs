import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let checks=0,failed=0;
const ok=(name,value)=>{checks++;if(!value){failed++;console.error(`FAIL ${name}`)}};
const versionAtLeast=(value,min)=>value.split('.').map(Number).reduce((n,x,i)=>n+(x||0)*[1e6,1e3,1][i],0)>=min.split('.').map(Number).reduce((n,x,i)=>n+(x||0)*[1e6,1e3,1][i],0);

const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
ok('release is coherent',versionAtLeast(release.version,'4.1.56')&&Number(release.build)>=4156&&pkg.version===release.version);

const css=read('assets/public-experience.css');
ok('home package titles reserve a shared desktop height',css.includes('.home-v21 .v21-package-grid>article>h3{min-height:clamp(150px,10.5vw,172px)}'));
ok('home package descriptions reserve a shared desktop height',css.includes('.home-v21 .v21-package-grid>article>p{min-height:90px}')&&css.includes('@media(min-width:1280px)'));
ok('home package price no longer uses a variable auto spacer',css.includes('.home-v21 .v21-package-grid>article>strong{margin-top:0}'));
ok('home package booking links keep a shared bottom baseline',css.includes('.home-v21 .v21-package-grid>article>a[href*="bronuvannia"]{margin-top:auto}'));
ok('HOME RESET gift has explicit rhythm',css.includes('.home-v21 .v21-package-grid>article>.vx-home-reset-gift{margin:18px 0 14px}'));

const home=read('index.html');
const shared=read('_next/static/chunks/0x2bx8kerxrmz.js');
const homeChunk=read('_next/static/chunks/01pb0x0z72e41.js');
const compact='Передоплата 200 грн — після підтвердження · доставка по Полтаві — 250 грн · самовивіз у Полтаві';
ok('home shows compact Poltava delivery copy',home.includes(compact));
ok('hydrated home copy matches static HTML',homeChunk.includes(compact));
ok('shared final CTA matches compact copy',shared.includes(compact));
ok('old split tariff is gone from CTA chunks',!homeChunk.includes('доставка — 250 грн / від 350 грн')&&!shared.includes('доставка — 250 грн / від 350 грн'));
ok('base-zone jargon is gone from public compact CTA',!home.includes('250 грн у базовій зоні'));

const booking=read('bronuvannia/index.html');
const bookingChunk=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
const slots=read('assets/public-booking-slots.js');
const address=read('assets/address-autocomplete.js');
ok('booking card leads with Poltava 250 only',booking.includes('до вас і назад · Полтава 250 грн')&&!booking.includes('до вас і назад · Полтава 250 грн · передмістя 350 грн'));
ok('hydrated booking card matches static copy',bookingChunk.includes('до вас і назад · Полтава 250 грн')&&!bookingChunk.includes('до вас і назад · Полтава 250 грн · передмістя 350 грн'));
ok('booking address hint separates local villages and other suburb',slots.includes('Розсошенці, Щербані та Горбанівка — теж ${formatMoney(deliveryPricing.local)}')&&slots.includes('Інші адреси — від ${formatMoney(firstOutside)}'));
ok('distance result is client-facing, not formula-heavy',slots.includes('Доставка за цією адресою — ${formatMoney(quote.amount)}. Сума вже врахована у бронюванні.')&&!slots.includes('Базові ${deliveryPricing.includedKm} км'));
ok('address search errors no longer repeat both tariffs',!address.includes('Полтава — 250 грн, передмістя — 350 грн')&&address.includes('Введіть адресу вручну — менеджер перевірить її до передоплати.'));

const delivery=read('dostavka/index.html');
const faq=read('faq/index.html');
const terms=read('umovy/index.html');
for(const [name,text] of [['delivery',delivery],['faq',faq],['terms',terms]]){
  ok(`${name} keeps 250 local villages`,text.includes('Розсошенці')&&text.includes('Щербані')&&text.includes('Горбанівка')&&text.includes('250 грн'));
  ok(`${name} keeps separate suburb tariff`,text.includes('від 350 грн'));
  ok(`${name} avoids public km formula`,!text.includes('до 10 км за межами локальної зони')&&!text.includes('далі +15 грн'));
}

if(failed){console.error(`v4.1.56 price/delivery copy: ${checks-failed}/${checks} OK`);process.exit(1)}
console.log(`v4.1.56 price/delivery copy: ${checks}/${checks} OK`);
