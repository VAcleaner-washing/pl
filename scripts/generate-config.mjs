import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';

const root=process.cwd();
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const configPath=path.join(root,'config','vacleaner.json');
const raw=fs.readFileSync(configPath,'utf8');
const config=JSON.parse(raw);
const hash=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16);
const compact=JSON.stringify(config);

const sharedLogicBrowser=`
const dayNumber=value=>{const time=Date.parse(String(value||'').slice(0,10)+'T12:00:00Z');return Number.isFinite(time)?Math.floor(time/86400000):NaN};
const slotIndex=(date,window='morning')=>{const day=dayNumber(date);return Number.isFinite(day)?day*2+(window==='evening'?1:0):NaN};
const rentalDays=(startDate,returnDate,pickupWindow='morning',returnWindow='evening')=>{const start=dayNumber(startDate),finish=dayNumber(returnDate);if(!Number.isFinite(start)||!Number.isFinite(finish)||finish<start)return 0;const calendarDays=finish-start,pickupOrder=pickupWindow==='evening'?1:0,returnOrder=returnWindow==='evening'?1:0;return calendarDays===0?(returnOrder>pickupOrder?1:0):calendarDays+(returnOrder>pickupOrder?1:0)};
const isWeekendTariffMoment=(date,window='morning')=>{const time=Date.parse(String(date||'').slice(0,10)+'T12:00:00Z');if(!Number.isFinite(time))return false;const day=new Date(time).getUTCDay();return day===6||(day===5&&window==='evening')||(day===0&&window==='morning')};
const paidDayMoments=(startDate,returnDate,pickupWindow='morning',returnWindow='evening')=>{const count=rentalDays(startDate,returnDate,pickupWindow,returnWindow),start=dayNumber(startDate);if(!count||!Number.isFinite(start))return[];return Array.from({length:count},(_,index)=>{const d=new Date((start+index)*86400000+12*3600000).toISOString().slice(0,10);return{date:d,window:pickupWindow,weekend:isWeekendTariffMoment(d,pickupWindow)}})};
const isWeekendDeposit=(startDate,returnDate,pickupWindow='morning',returnWindow='evening')=>{const moments=paidDayMoments(startDate,returnDate,pickupWindow,returnWindow);return moments.length>=2&&moments.some(item=>item.weekend)};
const rentalBase=(product,startDate,returnDate,pickupWindow='morning',returnWindow='evening')=>{if(!product)return 0;const moments=paidDayMoments(startDate,returnDate,pickupWindow,returnWindow);if(!moments.length)return 0;if(moments.length===2&&moments.every(item=>item.weekend)&&Number(product.saturdaySunday)>0)return Number(product.saturdaySunday);return moments.reduce((sum,item)=>sum+Number(item.weekend?product.weekend:product.weekday)||0,0)};
const periodsOverlap=(aStartDate,aReturnDate,aPickupWindow='morning',aReturnWindow='evening',bStartDate,bReturnDate,bPickupWindow='morning',bReturnWindow='evening')=>{const a0=slotIndex(aStartDate,aPickupWindow),a1=slotIndex(aReturnDate,aReturnWindow),b0=slotIndex(bStartDate,bPickupWindow),b1=slotIndex(bReturnDate,bReturnWindow);if(![a0,a1,b0,b1].every(Number.isFinite))return false;return a0<b1&&a1>b0};
`;

const browser=`(()=>{'use strict';const VERSION=${JSON.stringify(String(release.version))};const SOURCE_HASH=${JSON.stringify(hash)};const config=${compact};const {images,catalog,depositRules,slots,deliveryPricing}=config;const {products,extras}=catalog;const productAliases={};Object.entries(products).forEach(([code,item])=>[item.label,item.shortLabel,...(item.aliases||[])].filter(Boolean).forEach(label=>{productAliases[label]=code}));const extraAliases={};Object.entries(extras).forEach(([code,item])=>[item.label,...(item.aliases||[])].filter(Boolean).forEach(label=>{extraAliases[label]=code}));const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));const productMeta=code=>products[code]||null;const productImages=code=>(productMeta(code)?.imageKeys||['puzzi']).map(key=>images[key]).filter(Boolean);const depositGroup=code=>productMeta(String(code||''))?.depositGroup||'oneUnit';${sharedLogicBrowser}window.VACLEANER_CORE=Object.freeze({VERSION,version:VERSION,SOURCE_HASH,sourceHash:SOURCE_HASH,config,images,products,extras,catalog,depositRules,slots,deliveryPricing,productAliases,extraAliases,clone,productMeta,productImages,depositGroup,dayNumber,slotIndex,rentalDays,isWeekendTariffMoment,paidDayMoments,isWeekendDeposit,rentalBase,periodsOverlap});})();\n`;
const browserWithDelivery=browser
  .replace('const {images,catalog,depositRules,slots,deliveryPricing}=config;','const {images,catalog,depositRules,slots,deliveryPricing,deliveryFee}=config;')
  .replace('catalog,depositRules,slots,deliveryPricing,productAliases','catalog,depositRules,slots,deliveryPricing,deliveryFee,productAliases');
fs.writeFileSync(path.join(root,'assets','vacleaner-core.js'),browserWithDelivery);

const shared=`// GENERATED from config/vacleaner.json. Do not edit by hand.\nexport const VACLEANER_RELEASE_VERSION=${JSON.stringify(String(release.version))};\nexport const VACLEANER_SOURCE_HASH=${JSON.stringify(hash)};\nexport const VACLEANER_CONFIG=${JSON.stringify(config)} as const;\nexport const DEFAULT_SLOTS=structuredClone(VACLEANER_CONFIG.slots);\nexport const DEFAULT_DEPOSIT_RULES=structuredClone(VACLEANER_CONFIG.depositRules);\nexport const DEFAULT_CATALOG=structuredClone(VACLEANER_CONFIG.catalog);\nexport function dayNumber(value:string){const time=Date.parse(String(value||'').slice(0,10)+'T12:00:00Z');return Number.isFinite(time)?Math.floor(time/86400000):NaN}\nexport function slotIndex(date:string,window='morning'){const day=dayNumber(date);return Number.isFinite(day)?day*2+(window==='evening'?1:0):NaN}\nexport function rentalDays(startDate:string,returnDate:string,pickupWindow='morning',returnWindow='evening'){const start=dayNumber(startDate),finish=dayNumber(returnDate);if(!Number.isFinite(start)||!Number.isFinite(finish)||finish<start)return 0;const calendarDays=finish-start,pickupOrder=pickupWindow==='evening'?1:0,returnOrder=returnWindow==='evening'?1:0;return calendarDays===0?(returnOrder>pickupOrder?1:0):calendarDays+(returnOrder>pickupOrder?1:0)}\nexport function isWeekendTariffMoment(date:string,window='morning'){const time=Date.parse(String(date||'').slice(0,10)+'T12:00:00Z');if(!Number.isFinite(time))return false;const day=new Date(time).getUTCDay();return day===6||(day===5&&window==='evening')||(day===0&&window==='morning')}\nexport function paidDayMoments(startDate:string,returnDate:string,pickupWindow='morning',returnWindow='evening'){const count=rentalDays(startDate,returnDate,pickupWindow,returnWindow),start=dayNumber(startDate);if(!count||!Number.isFinite(start))return[];return Array.from({length:count},(_,index)=>{const d=new Date((start+index)*86400000+12*3600000).toISOString().slice(0,10);return{date:d,window:pickupWindow,weekend:isWeekendTariffMoment(d,pickupWindow)}})}\nexport function isWeekendDeposit(startDate:string,returnDate:string,pickupWindow='morning',returnWindow='evening'){const moments=paidDayMoments(startDate,returnDate,pickupWindow,returnWindow);return moments.length>=2&&moments.some(item=>item.weekend)}\nexport function rentalBase(product:any,startDate:string,returnDate:string,pickupWindow='morning',returnWindow='evening'){if(!product)return 0;const moments=paidDayMoments(startDate,returnDate,pickupWindow,returnWindow);if(!moments.length)return 0;if(moments.length===2&&moments.every(item=>item.weekend)&&Number(product.saturdaySunday)>0)return Number(product.saturdaySunday);return moments.reduce((sum,item)=>sum+(Number(item.weekend?product.weekend:product.weekday)||0),0)}\nexport function periodsOverlap(aStartDate:string,aReturnDate:string,aPickupWindow='morning',aReturnWindow='evening',bStartDate:string,bReturnDate:string,bPickupWindow='morning',bReturnWindow='evening'){const a0=slotIndex(aStartDate,aPickupWindow),a1=slotIndex(aReturnDate,aReturnWindow),b0=slotIndex(bStartDate,bPickupWindow),b1=slotIndex(bReturnDate,bReturnWindow);if(![a0,a1,b0,b1].every(Number.isFinite))return false;return a0<b1&&a1>b0}\n`;
const sharedWithDelivery=shared.replace(
  'export const DEFAULT_SLOTS=structuredClone(VACLEANER_CONFIG.slots);',
  'export const DEFAULT_SLOTS=structuredClone(VACLEANER_CONFIG.slots);\nexport const DEFAULT_DELIVERY_FEE=Number(VACLEANER_CONFIG.deliveryFee);\nexport const DEFAULT_DELIVERY_PRICING=structuredClone(VACLEANER_CONFIG.deliveryPricing);',
);
for(const name of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
 const dir=path.join(root,'supabase','functions',name);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'config.ts'),sharedWithDelivery);
 // Some deployment workflows use the JavaScript fallback beside index.deploy.js.
 // Generate it from the same source so an old fallback cannot restore stale
 // product names, prices, slots or delivery settings during the next deploy.
 fs.writeFileSync(path.join(dir,'config.deploy.js'),sharedWithDelivery
   .replaceAll(' as const','')
   .replaceAll(':string','')
   .replaceAll(':any',''));
}
// Keep JavaScript deployment fallbacks aligned with the reviewed TypeScript
// sources. Older hand-built fallbacks were a second, stale source of truth.
for(const name of ['vacleaner-settings','vacleaner-booking-v5','vacleaner-admin-bookings-v3']){
  const dir=path.join(root,'supabase','functions',name);
  const source=fs.readFileSync(path.join(dir,'index.ts'),'utf8');
  const deploy=stripTypeScriptTypes(source,{mode:'transform'})
    .replace('from "./config.ts"','from "./config.deploy.js"');
  fs.writeFileSync(path.join(dir,'index.deploy.js'),deploy);
}
console.log(`Generated shared VAcleaner config ${hash}`);
