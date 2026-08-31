import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const admin=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const promo=read('assets/booking-hardening-v4144.js');
const publicCss=read('assets/public-booking.css');
const backend=read('supabase/functions/vacleaner-admin-bookings-v4/index.ts');
const spec=read('docs/VAcleaner-SYSTEM-SPEC.md');
const pkg=JSON.parse(read('package.json'));
const release=JSON.parse(read('release.json'));
let pass=0; const failed=[];
const ok=(name,cond)=>{if(cond){pass++;console.log('PASS',name)}else{failed.push(name);console.error('FAIL',name)}};

ok('release includes v4.2.43+ critical booking contract',pkg.version===release.version&&Number(release.build)>=4243);

// Exact surface from the user's screenshot: admin booking card, not public booking summary.
ok('admin booking card renders delivery title and amount as separate siblings',admin.includes('class="booking-delivery-head"')&&admin.includes('class="booking-delivery-amount"')&&admin.includes('class="booking-delivery-address"'));
ok('delivery amount is structurally independent from address text',!admin.includes("${b.fulfillment==='delivery'?money(b.delivery_amount):'0 грн'} ·")&&admin.includes("<b class=\"booking-delivery-amount\">${b.fulfillment==='delivery'?money(b.delivery_amount):'0 грн'}</b>"));
ok('delivery row uses left-right axis and right aligned amount',css.includes('.booking-card .booking-delivery-head{display:flex;align-items:baseline;justify-content:space-between')&&css.includes('.booking-card .booking-delivery-amount{flex:0 0 auto;margin-left:auto')&&css.includes('text-align:right'));
ok('delivery address stays on its own row',css.includes('.booking-card .booking-delivery-address{display:block'));

// Return gift must survive save/load, and diffuser must not grant chemistry freebies.
ok('return UI posts story gift choice',admin.includes('storyGiftChoice:storyChoiceValue()'));
ok('return UI rehydrates gift from extras.gifts.story',admin.includes('const saved=b?.extras?.gifts?.story||{}')&&admin.includes("choice=String(saved?.choice||'')"));
ok('backend accepts explicit diffuser/chemistry choice',backend.includes('requestedStoryChoice = ["diffuser50", "chemistry2"].includes'));
ok('backend persists gifts.story choice',backend.includes('gifts: { ...(currentExtras.gifts || {}), story: actualStoryMention ? { mention: true, eligible: true, choice: storyGiftChoice'));
ok('diffuser does not activate free chemistry',backend.includes('actualStoryMention && storyGiftChoice === "chemistry2" && packetLimit > 0'));
ok('backend keeps explicit diffuser over legacy chemistry flag',backend.includes('requestedStoryChoice || (["diffuser50", "chemistry2"].includes(String(currentStory?.choice || ""))'));

// Promo visibility on the exact public contact surface.
ok('promo toggle is full width secondary control',publicCss.includes('.vx-promo-toggle{width:100%;min-height:60px')&&publicCss.includes('.booking-promo-field{position:relative;grid-column:1/-1}'));
ok('promo control has clear add action and helper copy',promo.includes('Є промокод?')&&promo.includes('Введіть код — перевіримо знижку автоматично')&&promo.includes('Додати <i aria-hidden="true">+</i>'));

ok('spec records exact-surface regression rule',spec.includes('CRIT-QA-001')&&spec.includes('admin booking card → booking-delivery')&&spec.includes('return finance → story gift persistence'));

console.log(JSON.stringify({passed:pass,failed,status:failed.length?'failed':'passed'}));
if(failed.length) process.exit(1);
