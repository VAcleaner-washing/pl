import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const js=read('assets/admin-v250.js');
const css=read('assets/admin-v250.css');
const qa=read('scripts/final_desktop_visual_qa.py');
const rel=JSON.parse(read('release.json'));
const pkg=JSON.parse(read('package.json'));
let n=0,failed=0;
function ok(name,cond){n++;if(cond)console.log(`OK   ${name}`);else{failed++;console.error(`FAIL ${name}`)}}
ok('release keeps v4.1.41+ fulfillment contract',pkg.version===rel.version&&Number(rel.build)>=4141);
ok('fulfillment field has dedicated hook',js.includes('class=\"field fulfillment-field\"'));
ok('customer address is always present in booking form',js.includes('class=\"field delivery-address-field wide\"')&&js.includes('Зберігаємо в картці клієнта'));
ok('fulfillment sync keeps customer address editable and hides only delivery pricing',js.includes('const syncFulfillmentUi=()=>')&&js.includes('addressInput.disabled=false')&&js.includes('deliveryPricingField.hidden=!delivery'));

ok('delivery-only pricing block cannot be forced visible',css.includes('.booking-form .delivery-pricing-field[hidden]{display:none}'));

ok('fulfillment field is max-content on desktop',css.includes('.booking-form .fulfillment-field{align-self:start;align-content:start;height:max-content'));
ok('browser QA verifies pickup keeps customer address but hides pricing',qa.includes('pickup keeps customer address editable')&&qa.includes('pickup hides only delivery pricing'));

ok('browser QA clicks client name instead of row center',qa.includes(".first.locator('.client-name').click()"));
ok('short desktop SMS modal keeps real viewport margins',css.includes('.modal:has(.sms-campaign-modal){padding:10px}')&&css.includes('width:calc(100vw - 20px);height:calc(100dvh - 20px)'));
if(failed)process.exit(1);
console.log(`v4.1.41 fulfillment UX: ${n}/${n} OK`);
