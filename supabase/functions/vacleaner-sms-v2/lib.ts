import { createClient } from "npm:@supabase/supabase-js@2.112.0";

export const SMS_SENDER="VACLEANER",SMS_COOLDOWN_DAYS=90,SMS_OPT_OUT="vacleaner.pp.ua/s",SMS_LINK_TOKEN="{link}",SMS_LINK_SAMPLE="vacleaner.pp.ua/b#XXXXXXX";
export const cleanText=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[<>]/g,"").slice(0,max):"";
export const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
export const smsPhone=(value:unknown)=>normalizePhone(value).replace(/^\+/,"");
export const validUuid=(value:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??""));
export const expandSmsTemplate=(text:string,link=SMS_LINK_SAMPLE)=>String(text||"").split(SMS_LINK_TOKEN).join(link);
export const smsParts=(text:string)=>{const unicode=/[^\u0000-\u007f]/.test(text),len=[...text].length;if(unicode)return len<=70?1:Math.min(6,Math.ceil(len/67));return len<=160?1:Math.min(6,Math.ceil(len/153))};
export const promoShortLink=(code:unknown)=>{const value=String(code||"").toUpperCase().replace(/[^A-Z0-9_-]/g,"");return /^VA-[A-Z0-9]{7}$/.test(value)?`vacleaner.pp.ua/b#${value.slice(3)}`:""};
export async function personalPromoCode(campaignId:string,phone:string){const bytes=new TextEncoder().encode(`${campaignId}:${normalizePhone(phone)}`),hash=await crypto.subtle.digest("SHA-256",bytes),hex=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();return `VA-${hex.slice(0,7)}`}
const spHeaders=(key:string)=>({Authorization:`Bearer ${key}`,"Content-Type":"application/json"});
export function sendpulseErrorDetail(data:any){const raw=data?.error??data?.message??data?.error_description??data?.data?.error??data?.data?.message??"";return cleanText(String(raw||""),220)}
export async function spJson(key:string,url:string,init:RequestInit={}){const res=await fetch(url,{...init,headers:{...spHeaders(key),...(init.headers||{})},signal:AbortSignal.timeout(15000)});const raw=await res.text();let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data=raw?{message:raw}:null}if(!res.ok){const detail=sendpulseErrorDetail(data);throw new Error(`sendpulse_http_${res.status}${detail?":"+detail:""}`)}return data}
export async function sendpulseBalance(key:string){const data=await spJson(key,"https://api.sendpulse.com/balance");return {currency:String(data?.currency||""),amount:Number(data?.balance_currency||0)}}
export async function sendpulseSender(key:string){const rows=await spJson(key,"https://api.sendpulse.com/sms/senders");const list=Array.isArray(rows)?rows:[];const row=list.find((item:any)=>String(item?.sender||"").toUpperCase()===SMS_SENDER&&String(item?.country_code||"").toUpperCase()==="UA")||list.find((item:any)=>String(item?.sender||"").toUpperCase()===SMS_SENDER)||null;const label=(status:number)=>status===1?"Активний":status===2?"Відхилено":"На модерації";return row?{found:true,status:Number(row.status),statusLabel:label(Number(row.status)),statusExplain:String(row.status_explain||""),country:String(row.country||""),countryCode:String(row.country_code||"")}:{found:false,status:null,statusLabel:"Не знайдено",statusExplain:"",country:"",countryCode:""}}

export async function campaignPromoContext(db:any,campaignId:string,phones:string[]){
  if(!validUuid(campaignId))return {personalized:false,campaign:null,byPhone:new Map<string,any>()};
  const {data:campaign,error}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,dormant_days,min_completed_orders,starts_at,ends_at").eq("id",campaignId).maybeSingle();if(error)throw error;
  if(!campaign)return {personalized:false,campaign:null,byPhone:new Map<string,any>()};
  const now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,ends=campaign.ends_at?new Date(campaign.ends_at).getTime():0;
  if(campaign.status!=="active"||(starts&&starts>now)||(ends&&ends<=now))throw new Error("campaign_inactive");
  const personalized=["return","personal"].includes(String(campaign.campaign_type||""));if(!personalized||!phones.length)return {personalized,campaign,byPhone:new Map<string,any>()};
  const normalized=[...new Set(phones.map(normalizePhone).filter(Boolean))];
  const {data:codes,error:codeError}=await db.from("vacleaner_promo_codes").select("id,code,customer_phone,active,expires_at").eq("campaign_id",campaignId).in("customer_phone",normalized);if(codeError)throw codeError;
  const ids=(codes||[]).map((r:any)=>r.id).filter(Boolean);let used=new Set<string>();if(ids.length){const {data:redemptions,error:redemptionError}=await db.from("vacleaner_promo_redemptions").select("promo_code_id").in("promo_code_id",ids);if(redemptionError)throw redemptionError;used=new Set((redemptions||[]).map((r:any)=>String(r.promo_code_id)))}
  const existingByPhone=new Map<string,any>();for(const row of codes||[]){const phone=normalizePhone(row.customer_phone),expired=row.expires_at&&new Date(row.expires_at).getTime()<=now;if(phone&&!expired&&!used.has(String(row.id)))existingByPhone.set(phone,row)}
  const isPersonal=String(campaign.campaign_type||"")==="personal",byPhone=new Map<string,any>();for(const phone of normalized){const existing=existingByPhone.get(phone);if(isPersonal&&!existing)continue;const code=existing?.code||await personalPromoCode(campaignId,phone),link=promoShortLink(code);if(!link)continue;byPhone.set(phone,{promoCode:String(code),promoLink:link,promoCodeId:existing?.id?String(existing.id):null,existingActive:existing?.active===true})}
  return {personalized,campaign,byPhone};
}

export async function preparePromoCodesForSend(db:any,campaign:any,rows:any[]){
  if(!campaign||!["return","personal"].includes(String(campaign.campaign_type||""))||!rows.length)return rows;
  const campaignId=String(campaign.id||""),phones=[...new Set(rows.map(r=>normalizePhone(r.phone)).filter(Boolean))];
  const {data:existing,error}=await db.from("vacleaner_promo_codes").select("id,code,customer_phone,active,expires_at").eq("campaign_id",campaignId).in("customer_phone",phones);if(error)throw error;
  const byPhone=new Map((existing||[]).map((r:any)=>[normalizePhone(r.customer_phone),r]));
  const missing:any[]=[];
  const isPersonal=String(campaign.campaign_type||"")==="personal";for(const row of rows){const phone=normalizePhone(row.phone);if(!phone)continue;const current=byPhone.get(phone);if(current){row.promoCode=String(current.code||row.promoCode||"");row.promoLink=promoShortLink(row.promoCode);row.promoCodeId=String(current.id||"");continue}if(isPersonal)continue;const code=String(row.promoCode||await personalPromoCode(campaignId,phone));missing.push({campaign_id:campaignId,code,customer_phone:phone,active:false,expires_at:campaign.ends_at||null,usage_limit:1})}
  if(missing.length){const {data:created,error:createError}=await db.from("vacleaner_promo_codes").insert(missing).select("id,code,customer_phone,active,expires_at");if(createError)throw createError;for(const r of created||[])byPhone.set(normalizePhone((r as any).customer_phone),r)}
  for(const row of rows){const current=byPhone.get(normalizePhone(row.phone));if(!current)throw new Error("promo_codes_missing");row.promoCode=String(current.code||row.promoCode||"");row.promoLink=promoShortLink(row.promoCode);row.promoCodeId=String(current.id||"");const {error:inactiveError}=await db.from("vacleaner_promo_codes").update({active:false}).eq("id",current.id);if(inactiveError)throw inactiveError}
  return rows;
}


export type AudienceRow={phone:string;name:string;completedOrders:number;lastCompleted:string;daysDormant:number;consent:"explicit"|"legacy"|"opted_out";activeBooking:boolean;lastSmsAt:string|null;cooldown:boolean;selectable:boolean};
export async function buildAudience(db:any,segment:string,forcedPhones:string[]=[]){
  const [{data:customers,error:ce},{data:completed,error:co},{data:active,error:ae},{data:recentSms,error:se}]=await Promise.all([
    db.from("vacleaner_customers").select("phone,name,marketing_sms_consent,marketing_sms_opted_out_at").limit(5000),
    db.from("vacleaner_bookings").select("customer_phone,customer_name,return_date").eq("status","completed").order("return_date",{ascending:false}).limit(10000),
    db.from("vacleaner_bookings").select("customer_phone").in("status",["waiting_payment","confirmed","issued"]).limit(5000),
    db.from("vacleaner_sms_dispatch_recipients").select("customer_phone,status,created_at").in("status",["submitted","sent","delivered","not_delivered"]).gte("created_at",new Date(Date.now()-SMS_COOLDOWN_DAYS*86400000).toISOString()).order("created_at",{ascending:false}).limit(10000)
  ]);if(ce||co||ae||se)throw ce||co||ae||se;
  const profiles=new Map<string,any>();for(const row of customers||[]){const phone=normalizePhone(row.phone);if(phone)profiles.set(phone,row)}
  const activePhones=new Set((active||[]).map((r:any)=>normalizePhone(r.customer_phone)).filter(Boolean)),recentMap=new Map<string,string>();for(const row of recentSms||[]){const phone=normalizePhone(row.customer_phone);if(phone&&!recentMap.has(phone))recentMap.set(phone,String(row.created_at||""))}
  const stats=new Map<string,{phone:string;name:string;count:number;last:string}>();for(const row of completed||[]){const phone=normalizePhone(row.customer_phone);if(!phone)continue;const date=String(row.return_date||""),cur=stats.get(phone)||{phone,name:cleanText(row.customer_name,120),count:0,last:date};cur.count+=1;if(date>cur.last){cur.last=date;cur.name=cleanText(row.customer_name,120)||cur.name}stats.set(phone,cur)}for(const rawPhone of forcedPhones||[]){const phone=normalizePhone(rawPhone);if(!phone||stats.has(phone))continue;const profile=profiles.get(phone);if(profile)stats.set(phone,{phone,name:String(profile.name||phone),count:0,last:""})}
  const now=Date.now(),rows:AudienceRow[]=[];for(const item of stats.values()){const profile=profiles.get(item.phone)||{},lastTime=Date.parse(`${item.last}T12:00:00Z`),daysDormant=Number.isFinite(lastTime)?Math.max(0,Math.floor((now-lastTime)/86400000)):0,activeBooking=activePhones.has(item.phone),lastSmsAt=recentMap.get(item.phone)||null,cooldown=Boolean(lastSmsAt),optedOut=Boolean(profile.marketing_sms_opted_out_at),explicit=profile.marketing_sms_consent===true&&!optedOut,consent=optedOut?"opted_out":explicit?"explicit":"legacy",match=segment==="all"?true:segment==="sleeping_long"?daysDormant>=365:segment==="sleeping_warm"?daysDormant>=180&&daysDormant<365:daysDormant>=180;if(!match)continue;rows.push({phone:item.phone,name:String(profile.name||item.name||item.phone),completedOrders:item.count,lastCompleted:item.last,daysDormant,consent,activeBooking,lastSmsAt,cooldown,selectable:!optedOut&&!cooldown&&!activeBooking})}
  return rows;
}
export const deliveryStatus=(code:number)=>code===2?"delivered":code===12?"not_delivered":code===1?"sent":"submitted";
export type Db=ReturnType<typeof createClient>;
