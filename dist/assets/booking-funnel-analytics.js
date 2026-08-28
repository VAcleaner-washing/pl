(()=>{
'use strict';
const BUILD='4200';
const ATTR_KEY='vacleaner_attribution_v1';
const STATE_KEY='vacleaner_booking_analytics_v1';
const ATTR_TTL=30*24*60*60*1000;
const BOOKING_PATH='/bronuvannia';
const clean=(v,max=120)=>String(v??'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const rawPath=location.pathname.replace(/\/+$/,'')||'/';
const path=/\/bronuvannia(?:\/index\.html)?$/.test(rawPath)?BOOKING_PATH:rawPath;
const params=new URLSearchParams(location.search);
const now=()=>Date.now();
function safeJson(raw,fallback){try{return JSON.parse(raw)||fallback}catch{return fallback}}
function storeGet(key,area=sessionStorage){try{return safeJson(area.getItem(key),null)}catch{return null}}
function storeSet(key,value,area=sessionStorage){try{area.setItem(key,JSON.stringify(value))}catch{}}
function classifyReferrer(){
  if(!document.referrer)return {source:'direct',medium:'none'};
  try{
    const u=new URL(document.referrer);
    if(u.origin===location.origin)return {source:'internal',medium:'referral',referrer_path:u.pathname};
    const h=u.hostname.toLowerCase();
    if(h.includes('instagram.com')||h.includes('l.instagram.com'))return {source:'instagram',medium:'social'};
    if(h.includes('facebook.com')||h.includes('fb.com'))return {source:'facebook',medium:'social'};
    if(h.includes('google.'))return {source:'google',medium:'organic'};
    if(h.includes('t.me')||h.includes('telegram.'))return {source:'telegram',medium:'messenger'};
    return {source:clean(h,80)||'referral',medium:'referral'};
  }catch{return {source:'referral',medium:'referral'}}
}
function explicitTouch(){
  const utmSource=clean(params.get('utm_source'),80),utmMedium=clean(params.get('utm_medium'),80),utmCampaign=clean(params.get('utm_campaign'),100),utmContent=clean(params.get('utm_content'),100),utmTerm=clean(params.get('utm_term'),100);
  if(utmSource||utmMedium||utmCampaign||utmContent||utmTerm)return {source:utmSource||'campaign',medium:utmMedium||'campaign',campaign:utmCampaign,content:utmContent,term:utmTerm};
  if(params.has('gclid'))return {source:'google',medium:'cpc',campaign:'',content:'',term:'',has_gclid:true};
  if(params.has('fbclid'))return {source:'meta',medium:'paid_social',campaign:'',content:'',term:'',has_fbclid:true};
  return null;
}
function captureAttribution(){
  const existing=storeGet(ATTR_KEY,sessionStorage);
  const external=explicitTouch();
  const ref=classifyReferrer();
  const inferred=external||(ref.source!=='internal'?ref:null);
  const base=existing&&now()-Number(existing.updated_at||0)<ATTR_TTL?existing:null;
  const touch=inferred||base?.last||{source:'direct',medium:'none'};
  const next={
    schema:1,
    created_at:base?.created_at||now(),
    updated_at:now(),
    landing_path:base?.landing_path||path,
    first:base?.first||touch,
    last:inferred||base?.last||touch
  };
  storeSet(ATTR_KEY,next,sessionStorage);
  return next;
}
const attribution=captureAttribution();
function randomId(){try{return crypto.randomUUID()}catch{return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}}
function analyticsState(){
  const saved=storeGet(STATE_KEY,sessionStorage)||{};
  const old=saved.completed_at?{}:saved;
  const s={schema:1,session_id:old.session_id||randomId(),last:old.last||{},once:old.once||{},last_at:old.last_at||{},completed_at:old.completed_at||0};
  storeSet(STATE_KEY,s,sessionStorage);return s;
}
let state=analyticsState();
function saveState(){storeSet(STATE_KEY,state,sessionStorage)}
function selectedProduct(){return document.querySelector('#booking-products .booking-products button[aria-pressed="true"],#booking-products .booking-products button.is-selected,#booking-products .booking-products button.selected')?.dataset?.productCode||clean(params.get('product'),40)}
function bookingTask(){return document.querySelector('#booking-products')?.dataset?.vxSmartTask||''}
function bookingDates(){const dates=[...document.querySelectorAll('#booking-dates input[type="date"]')],windows=[...document.querySelectorAll('#booking-dates select')];return{start_date:dates[0]?.value||'',return_date:dates[1]?.value||'',pickup_window:windows[0]?.value||'morning',return_window:windows[1]?.value||'evening'}}
function rentalDays(d){return Number(window.VACLEANER_CORE?.rentalDays?.(d.start_date,d.return_date,d.pickup_window,d.return_window)||0)}
function fulfillment(){const b=document.querySelector('#booking-extras .booking-choice-row button.is-selected,#booking-extras .booking-choice-row button[aria-pressed="true"]');const t=clean(b?.textContent,80);return /^Доставка/.test(t)?'delivery':/^Самовивіз/.test(t)?'pickup':''}
function normalizeSettlement(v){return clean(v,80).toLocaleLowerCase('uk-UA').replace(/^[смт.\s]+/u,'').replace(/[’`]/g,"'").trim()}
function deliveryQuote(){
  const mode=fulfillment();if(mode!=='delivery')return{delivery_zone:mode||'',delivery_amount:0,delivery_quote_required:false};
  const raw=window.VACLEANER_CORE?.deliveryPricing||{},zones=(Array.isArray(raw.zones)&&raw.zones.length?raw.zones:[{maxKm:15,amount:350},{maxKm:20,amount:500},{maxKm:30,amount:700},{maxKm:40,amount:900}]).map(x=>({maxKm:Number(x.maxKm),amount:Number(x.amount)})).sort((a,b)=>a.maxKm-b.maxKm);
  const input=document.querySelector('.booking-delivery-address input[type="text"]:not([data-vac-address-detail])');const address=clean(input?.value,220);
  if(!address)return{delivery_zone:'pending',delivery_amount:Number(raw.local)||250,delivery_quote_required:false};
  const meta=window.__VAC_DELIVERY_META__?.()||{};const settlement=clean(meta.settlement||address.split(',')[0],80),norm=normalizeSettlement(settlement);
  const local=(raw.localSettlements||['Полтава','Розсошенці','Щербані','Горбанівка']).some(item=>normalizeSettlement(item)===norm);
  if(local)return{delivery_zone:'local',delivery_amount:Number(raw.local)||250,delivery_quote_required:false,delivery_distance_km:0};
  const distance=Number(meta.routeKm),tier=Number.isFinite(distance)?zones.find(row=>distance<=row.maxKm):null,max=Number(raw.maxRouteKm)||Number(zones.at(-1)?.maxKm)||40;
  if(meta.verified===true&&Number.isFinite(distance)&&distance>=0){
    if(!tier||distance>max)return{delivery_zone:'agreement',delivery_amount:0,delivery_quote_required:true,delivery_distance_km:distance};
    return{delivery_zone:'route_zone',delivery_amount:tier.amount,delivery_quote_required:false,delivery_distance_km:distance,delivery_zone_max_km:tier.maxKm};
  }
  return{delivery_zone:'agreement',delivery_amount:0,delivery_quote_required:true,delivery_distance_km:Number.isFinite(distance)?distance:undefined};
}
function extras(){return [...document.querySelectorAll('#booking-extras label[data-extra-code] input[type="checkbox"]:checked')].map(x=>x.closest('label')?.dataset?.extraCode).filter(Boolean)}
function promoContext(){
  const input=document.querySelector('.booking-promo-field input');const has=Boolean(clean(input?.value,40)||params.get('promo')||location.hash);
  const from=clean(params.get('from'),40);
  if(from==='return_sms'||input?.dataset?.autoSmsPromo)return{has_promo:has,promo_context:'return'};
  if(from==='quiz')return{has_promo:has,promo_context:'quiz'};
  if(has)return{has_promo:true,promo_context:'manual'};
  return{has_promo:false,promo_context:'none'};
}
function bookingOrigin(){
  const from=clean(params.get('from'),40);if(from)return from;
  try{if(document.referrer){const u=new URL(document.referrer);if(u.origin===location.origin){if(u.pathname.startsWith('/tekhnika/'))return'product_page';if(u.pathname.startsWith('/rishennia/'))return'solution';if(u.pathname.startsWith('/komplekty'))return'packages';if(u.pathname.startsWith('/pidbir'))return'quiz';if(u.pathname==='/'||u.pathname==='')return'home';return'internal';}}}catch{}
  if(params.get('product'))return'direct_product';
  const src=attribution?.last?.source||'direct';return src==='direct'?'direct':`external_${src}`;
}
function moneyValue(){const s=document.querySelector('.booking-summary-total strong')?.textContent||'';const digits=s.replace(/[^0-9]/g,'');return digits?Number(digits):0}
function common(){
  const d=bookingDates(),q=deliveryQuote(),x=extras(),a=attribution||{};
  return {
    analytics_build:BUILD,booking_session_id:state.session_id,booking_origin:bookingOrigin(),booking_task:bookingTask()||undefined,product_code:selectedProduct()||undefined,
    rental_window:`${d.pickup_window}_${d.return_window}`,rental_days:rentalDays(d)||undefined,fulfillment:fulfillment()||undefined,
    delivery_zone:q.delivery_zone||undefined,delivery_amount:q.delivery_amount||0,extras_count:x.length,extra_codes:x.join(',')||undefined,...promoContext(),currency:'UAH',value:moneyValue()||undefined,
    traffic_source:a.last?.source||'direct',traffic_medium:a.last?.medium||'none',traffic_campaign:a.last?.campaign||undefined,traffic_content:a.last?.content||undefined,traffic_term:a.last?.term||undefined
  };
}
function compact(obj){return Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==undefined&&v!==null&&v!==''))}
const layer=window.dataLayer=window.dataLayer||[];
const previousPush=layer.push.bind(layer);
function rawPush(item){return previousPush(compact(item))}
function track(event,detail={},opts={}){
  if(path!==BOOKING_PATH&&!opts.sitewide)return false;
  const sig=clean(opts.signature??'',300),key=event;
  if(opts.once&&state.once[key])return false;
  if(sig&&state.last[key]===sig)return false;
  const throttle=Math.max(0,Number(opts.throttleMs||0));const t=now();if(throttle&&t-Number(state.last_at[key]||0)<throttle)return false;
  if(opts.once)state.once[key]=true;if(sig)state.last[key]=sig;state.last_at[key]=t;if(event==='booking_completed')state.completed_at=t;saveState();
  rawPush({event,...common(),...detail});return true;
}
function enrich(item){if(!item||typeof item!=='object'||Array.isArray(item)||!item.event)return item;const e=String(item.event);if(!['booking_started','booking_task_selected','generate_lead'].includes(e))return item;return compact({...common(),...item})}
if(!layer.push.__vacFunnel4146){
  const wrapped=(...items)=>{const normalized=items.map(enrich).filter(item=>{if(item?.event==='booking_started'){if(state.once.legacy_booking_started)return false;state.once.legacy_booking_started=true;saveState()}if(item?.event==='booking_task_selected'){const sig=clean(item.booking_task,80);if(sig&&state.last.legacy_booking_task===sig)return false;if(sig){state.last.legacy_booking_task=sig;saveState()}}return true});const result=previousPush(...normalized);for(const item of normalized){if(item?.event==='generate_lead'){track('booking_completed',{booking_code:clean(item.booking_code,64),product_code:clean(item.product_code,40)||selectedProduct(),value:Number(item.value||moneyValue()||0),currency:'UAH'},{signature:clean(item.booking_code,64)||`${selectedProduct()}|${bookingDates().start_date}|${bookingDates().return_date}`});}}return result};
  Object.defineProperty(wrapped,'__vacFunnel4146',{value:true});layer.push=wrapped;
}
window.__VAC_ANALYTICS__={track,common,attribution:()=>typeof structuredClone==='function'?structuredClone(attribution):JSON.parse(JSON.stringify(attribution))};
function availabilityState(){const el=document.querySelector('.availability-card');if(!el)return'';return ['available','unavailable','checking','error','idle'].find(x=>el.classList.contains(x))||''}
let addressTimer=0;
function fireDateSelected(){const d=bookingDates();if(!d.start_date||!d.return_date)return;track('booking_date_selected',{}, {signature:`${selectedProduct()}|${d.start_date}|${d.return_date}|${d.pickup_window}|${d.return_window}`})}
function fireDeliveryZone(){clearTimeout(addressTimer);addressTimer=setTimeout(()=>{if(fulfillment()!=='delivery')return;const q=deliveryQuote();if(q.delivery_zone==='pending')return;track('booking_delivery_zone',q,{signature:`${q.delivery_zone}|${q.delivery_amount}|${q.delivery_quote_required}`})},420)}
function bindBooking(){
  const form=document.querySelector('.booking-form');if(!form||form.dataset.vxFunnelAnalytics==='1')return false;form.dataset.vxFunnelAnalytics='1';
  track('booking_view',{}, {once:true});
  const productGrid=document.querySelector('#booking-products .booking-products');
  const observeProduct=()=>{const code=selectedProduct();if(code)track('booking_product_selected',{product_code:code},{signature:code})};
  if(productGrid){new MutationObserver(observeProduct).observe(productGrid,{subtree:true,attributes:true,attributeFilter:['class','aria-pressed'],childList:true});setTimeout(observeProduct,80);setTimeout(observeProduct,360);}
  form.addEventListener('click',e=>{
    const product=e.target.closest('#booking-products button[data-product-code]');if(product)setTimeout(observeProduct,0);
    if(e.target.closest('#booking-dates .vx-date-trigger,#booking-dates input[type="date"]'))track('booking_date_started',{}, {once:true});
    const f=e.target.closest('#booking-extras .booking-choice-row button');if(f)setTimeout(()=>{const mode=fulfillment();if(mode)track('booking_fulfillment_selected',{fulfillment:mode},{signature:mode});if(mode==='delivery')fireDeliveryZone()},0);
  },true);
  form.addEventListener('change',e=>{
    if(e.target.matches('#booking-dates input[type="date"],#booking-dates select'))setTimeout(fireDateSelected,0);
    if(e.target.matches('#booking-extras label[data-extra-code] input[type="checkbox"]')){const code=e.target.closest('label')?.dataset?.extraCode;if(code&&e.target.checked)track('booking_extra_added',{extra_code:code},{signature:`${code}|added`});else if(code)track('booking_extra_removed',{extra_code:code},{signature:`${code}|removed`});}
    if(e.target.matches('.booking-delivery-address input[type="text"]'))fireDeliveryZone();
  },true);
  form.addEventListener('input',e=>{if(e.target.matches('.booking-delivery-address input[type="text"]'))fireDeliveryZone()},true);
  document.querySelector('#booking-contact')?.addEventListener('focusin',e=>{if(e.target.matches('input,textarea,select'))track('booking_contact_started',{}, {once:true})},true);
  form.addEventListener('submit',()=>track('booking_submit',{}, {throttleMs:1500}),true);
  const av=document.querySelector('.availability-card');if(av){let last=availabilityState();const check=()=>{const current=availabilityState();if(!current||current===last)return;last=current;const d=bookingDates(),sig=`${selectedProduct()}|${d.start_date}|${d.return_date}|${d.pickup_window}|${d.return_window}`;if(current==='unavailable')track('booking_date_unavailable',{availability_status:'unavailable'},{signature:sig});if(current==='error')track('booking_availability_error',{error_code:'availability_error'},{signature:sig})};new MutationObserver(check).observe(av,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});}
  const success=document.querySelector('.booking-success');if(success){const code=clean(success.querySelector('h1')?.textContent,64);track('booking_completed',{booking_code:code},{signature:code||'success_dom'});}
  return true;
}
if(path===BOOKING_PATH){
  let tries=0;const boot=()=>{tries++;if(bindBooking())return;if(tries<30)setTimeout(boot,120)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
})();
