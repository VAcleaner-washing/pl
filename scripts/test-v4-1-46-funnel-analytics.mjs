import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const rel=JSON.parse(read('release.json'));
const js=read('assets/booking-funnel-analytics.js');
const booking=read('_next/static/chunks/146ntlcv_t6~w-v4041.js');
const stamp=read('scripts/stamp-build.mjs');
const workflow=read('.github/workflows/pages.yml');
const qaRunner=read('scripts/qa-full.mjs');
const privacy=read('polityka-konfidenciynosti/index.html');
let n=0,failed=0;
function ok(name,cond){n++;if(cond)console.log(`OK   ${name}`);else{failed++;console.error(`FAIL ${name}`)}}
ok('release keeps v4.1.46+ funnel analytics',pkg.version===rel.version&&Number(rel.build)>=4146);
ok('sitewide attribution keeps campaign parameters',js.includes("utm_source")&&js.includes("utm_medium")&&js.includes("utm_campaign")&&js.includes("utm_content")&&js.includes("utm_term")&&js.includes('vacleaner_attribution_v1'));
ok('attribution survives internal navigation in sessionStorage',js.includes('sessionStorage')&&js.includes("ref.source!=='internal'")&&js.includes('landing_path'));
ok('booking funnel has requested core stages',[
  'booking_view','booking_task_selected','booking_product_selected','booking_date_started','booking_date_selected','booking_date_unavailable','booking_fulfillment_selected','booking_delivery_zone','booking_extra_added','booking_contact_started','booking_submit','booking_submit_error','booking_completed'
].every(token=>js.includes(token)||booking.includes(token)));
ok('funnel carries CRO dimensions',[
  'booking_origin','booking_task','product_code','rental_days','fulfillment','delivery_zone','delivery_amount','extras_count','extra_codes','promo_context','currency','value','traffic_source','traffic_medium','traffic_campaign','traffic_content','traffic_term'
].every(token=>js.includes(token)));
ok('funnel has repeat/refresh dedupe state',js.includes('vacleaner_booking_analytics_v1')&&js.includes('state.last[key]===sig')&&js.includes('state.once[key]')&&js.includes('throttleMs'));
ok('delivery analytics never captures a full address',!js.includes('delivery_address:')&&!js.includes('customer_phone')&&!js.includes('customer_name'));
ok('successful backend create still emits GA4 generate_lead',booking.includes('event:"generate_lead"')&&booking.includes('booking_code:n.bookingCode')&&booking.includes('currency:"UAH"'));
ok('generate_lead is bridged to booking_completed',js.includes("item?.event==='generate_lead'")&&js.includes("track('booking_completed'"));
ok('submit errors expose backend-safe error codes',booking.includes("__VAC_ANALYTICS__?.track('booking_submit_error'")&&booking.includes('promo_reason:reason||\'\''));
ok('availability failures and sold-out dates are distinguishable',js.includes("booking_availability_error")&&js.includes("availability_status:'unavailable'"));
ok('RETURN and quiz attribution are explicit',js.includes("from==='return_sms'")&&js.includes("from==='quiz'")&&js.includes("promo_context:'return'")&&js.includes("promo_context:'quiz'"));
ok('stamp injects analytics on public HTML and versions asset',stamp.includes('booking-funnel-analytics')&&stamp.includes("!rel.startsWith('admin/')")&&stamp.includes('/assets/booking-funnel-analytics.js?v=${build}'));
ok('privacy documents anonymous funnel attribution',privacy.includes('UTM-мітки')&&privacy.includes('Ім’я, номер телефону, повна адреса та текст коментаря не передаються'));
ok('CI runs funnel analytics regression',(workflow.includes('test:v4.1.46-funnel-analytics')||qaRunner.includes('test:v4.1.46-funnel-analytics')));
if(failed)process.exit(1);
console.log(`v4.1.46 funnel analytics: ${n}/${n} OK`);
