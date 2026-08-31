import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const release=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
const edge=read('supabase/functions/vacleaner-address-v1/index.ts');
const booking=read('supabase/functions/vacleaner-booking-v5/index.ts');
const deploy=read('supabase/functions/vacleaner-booking-v5/index.deploy.js');
const address=read('assets/address-autocomplete.js');
const slots=read('assets/public-booking-slots.js');
const bookingHardening=read('assets/booking-hardening-v4144.js');
const bookingHardeningCss=read('assets/booking-hardening-v4144.css');
const chunk=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
const qa=read('scripts/qa-full.mjs');
let checks=0,failed=0;
const ok=(name,condition)=>{checks++;if(condition)console.log('OK  ',name);else{failed++;console.error('FAIL',name)}};

ok('release is v4.2.41',release.version==='4.2.41'&&release.build===4241&&pkg.version===release.version);
ok('Photon search tries street-type variants for incomplete Poltava input',edge.includes('вулиця ${typedStreet}')&&edge.includes('провулок ${typedStreet}'));
ok('address search no longer stops on any unrelated house number',edge.includes('exactRelevantHouseFound')&&!edge.includes('features.some((feature) => Boolean(text(feature?.properties?.housenumber))) break'));
ok('provider suggestions are filtered by typed street relevance',edge.includes('streetMatchScore(parsed.street')&&edge.includes('.filter((item: any) => !parsed.street || item.streetScore > 0)'));
ok('missing exact building creates a manual no-coordinate candidate',edge.includes('manualAddress: true')&&edge.includes('distanceKm: null, lat: null, lon: null'));
ok('manual/approximate candidate can never become verified',address.includes('const manual=Boolean(item.manualAddress||item.approximateCoordinates)')&&address.includes("if(manual){"));
ok('manual address copy explicitly says booking can be finished',address.includes('Бронювання можна завершити без вибору зі списку')&&address.includes('бронювання можна завершити'));
ok('public quote infers plain street+house as Poltava',slots.includes('function inferredDeliverySettlement')&&slots.includes("return streetLike?'Полтава':first"));
ok('server quote uses the same plain-address Poltava inference',booking.includes('function inferredDeliverySettlement')&&booking.includes('return streetLike ? "Полтава" : first;'));
ok('deployable booking function contains same settlement inference',deploy.includes('function inferredDeliverySettlement')&&deploy.includes('return streetLike ? "Полтава" : first;'));
ok('manual delivery is still not required to be provider-verified',booking.includes('(fulfillment === "delivery" && address.length < 8)')&&!booking.includes('deliveryAddressVerified !== true'));
ok('promo entry is full-width and visibly actionable',bookingHardeningCss.includes('grid-column:1/-1')&&bookingHardeningCss.includes("content:'Додати'")&&bookingHardeningCss.includes('min-height:50px'));
ok('promo disclosure has explicit accessible state labels',bookingHardening.includes("aria-label','Відкрити поле промокоду")&&bookingHardening.includes("Сховати поле промокоду"));
ok('draft restore replays only the checked radio option',bookingHardening.includes("if(el.type==='radio')")&&bookingHardening.includes('if(Boolean(state.checked)&&!el.checked)reactChecked(el,true)'));
ok('availability carries the selected Story gift',chunk.includes('storyGiftChoice:storyActive?storyChoice:""')&&chunk.includes('storyGiftChoice,z,promoCode'));
ok('Story choice survives transient estimate refresh',chunk.includes('en&&K?Number(K.baseBeforeDiscount||0)<1000?"chemistry2":"choice":en&&["diffuser50","chemistry2"].includes(storyGiftChoice)?"choice"'));
ok('chemistry free copy appears only for chemistry reward',chunk.includes('storyActive&&"chemistry2"===storyChoice')&&chunk.includes('children:"2 порції безкоштовно"'));
ok('Story summary has explicit unselected state instead of pretending diffuser/chemistry',chunk.includes('"diffuser50"===storyChoice?"Аромадифузор VA HOME · 50 мл":"Оберіть подарунок"'));
ok('booking estimate echoes authoritative Story choice',booking.includes('storyGiftChoice: storyMention ? storyGiftChoice : ""')&&booking.includes('storyChemistryFreePortions: storyMention && storyGiftChoice === "chemistry2" ? 2 : 0'));
ok('CI runs v4.2.41 address resilience regression',qa.includes('test:v4.2.41-address-resilience'));


const bookingSlots=read('assets/public-booking-slots.js');
const bookingCss=read('assets/public-booking.css');
ok('delivery summary row gets financial alignment class',bookingSlots.includes("deliveryRow.classList.add('vx-summary-delivery-row')"));
ok('delivery summary keeps label separate from amount',bookingSlots.includes("setTextIfChanged(label,'Доставка')"));
ok('delivery amount has explicit right-aligned summary contract',bookingCss.includes('.booking-summary .vx-summary-delivery-row')); 
console.log(`v4.2.41 address resilience: ${checks-failed}/${checks} OK`);
if(failed)process.exit(1);
