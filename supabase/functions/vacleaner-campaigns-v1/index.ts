import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const validUuid=(value:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??""));
const cleanText=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[<>]/g,"").slice(0,max):"";
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const SMS_SENDER="VACLEANER",SMS_COOLDOWN_DAYS=90,SMS_OPT_OUT="vacleaner.pp.ua/s";
const promoShortLink=(code:unknown)=>{const value=String(code||"").toUpperCase().replace(/[^A-Z0-9_-]/g,"");return /^VA-[A-Z0-9]{7}$/.test(value)?`vacleaner.pp.ua/b#${value.slice(3)}`:""};
async function personalPromoCode(campaignId:string,phone:string){const bytes=new TextEncoder().encode(`${campaignId}:${normalizePhone(phone)}`),hash=await crypto.subtle.digest("SHA-256",bytes),hex=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();return `VA-${hex.slice(0,7)}`}
const spHeaders=(key:string)=>({Authorization:`Bearer ${key}`,"Content-Type":"application/json"});
async function spJson(key:string,url:string){const res=await fetch(url,{headers:spHeaders(key),signal:AbortSignal.timeout(15000)});const raw=await res.text();let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data=null}if(!res.ok)throw new Error(`sendpulse_http_${res.status}`);return data}
async function sendpulseBalance(key:string){const data=await spJson(key,"https://api.sendpulse.com/balance");return {currency:String(data?.currency||""),amount:Number(data?.balance_currency||0)}}
async function sendpulseSender(key:string){const rows=await spJson(key,"https://api.sendpulse.com/sms/senders");const list=Array.isArray(rows)?rows:[];const row=list.find((x:any)=>String(x?.sender||"").toUpperCase()===SMS_SENDER&&String(x?.country_code||"").toUpperCase()==="UA")||list.find((x:any)=>String(x?.sender||"").toUpperCase()===SMS_SENDER)||null;const label=(status:number)=>status===1?"Активний":status===2?"Відхилено":"На модерації";return row?{found:true,status:Number(row.status),statusLabel:label(Number(row.status)),statusExplain:String(row.status_explain||""),country:String(row.country||""),countryCode:String(row.country_code||"")}:{found:false,status:null,statusLabel:"Не знайдено",statusExplain:"",country:"",countryCode:""}}

type AudienceRow={phone:string;name:string;completedOrders:number;lastCompleted:string;daysDormant:number;consent:"explicit"|"legacy"|"opted_out";consentAt:string|null;consentSource:string;activeBooking:boolean;lastSmsAt:string|null;cooldown:boolean;selectable:boolean};
async function buildAudience(db:any,segment:string,forcedPhones:string[]=[]){
  const [{data:customers,error:ce},{data:completed,error:co},{data:active,error:ae},{data:recentSms,error:se}]=await Promise.all([
    db.from("vacleaner_customers").select("phone,name,marketing_sms_consent,marketing_sms_consent_at,marketing_sms_consent_source,marketing_sms_opted_out_at").limit(5000),
    db.from("vacleaner_bookings").select("customer_phone,customer_name,return_date").eq("status","completed").order("return_date",{ascending:false}).limit(10000),
    db.from("vacleaner_bookings").select("customer_phone").in("status",["waiting_payment","confirmed","issued"]).limit(5000),
    db.from("vacleaner_sms_dispatch_recipients").select("customer_phone,status,created_at").in("status",["submitted","sent","delivered","not_delivered"]).gte("created_at",new Date(Date.now()-SMS_COOLDOWN_DAYS*86400000).toISOString()).order("created_at",{ascending:false}).limit(10000),
  ]);if(ce||co||ae||se)throw ce||co||ae||se;
  const profiles=new Map<string,any>();for(const row of customers||[]){const phone=normalizePhone(row.phone);if(phone)profiles.set(phone,row)}
  const activePhones=new Set((active||[]).map((r:any)=>normalizePhone(r.customer_phone)).filter(Boolean));
  const recentMap=new Map<string,string>();for(const row of recentSms||[]){const phone=normalizePhone(row.customer_phone);if(phone&&!recentMap.has(phone))recentMap.set(phone,String(row.created_at||""))}
  const stats=new Map<string,{phone:string;name:string;count:number;last:string}>();
  for(const row of completed||[]){const phone=normalizePhone(row.customer_phone);if(!phone)continue;const date=String(row.return_date||""),cur=stats.get(phone)||{phone,name:cleanText(row.customer_name,120),count:0,last:date};cur.count+=1;if(date>cur.last){cur.last=date;cur.name=cleanText(row.customer_name,120)||cur.name}stats.set(phone,cur)}
  for(const rawPhone of forcedPhones||[]){const phone=normalizePhone(rawPhone);if(!phone||stats.has(phone))continue;const profile=profiles.get(phone);if(profile)stats.set(phone,{phone,name:String(profile.name||phone),count:0,last:""})}
  const now=Date.now(),rows:AudienceRow[]=[];
  for(const item of stats.values()){
    const profile=profiles.get(item.phone)||{},lastTime=item.last?Date.parse(`${item.last}T12:00:00Z`):NaN,daysDormant=Number.isFinite(lastTime)?Math.max(0,Math.floor((now-lastTime)/86400000)):0,activeBooking=activePhones.has(item.phone),lastSmsAt=recentMap.get(item.phone)||null,cooldown=Boolean(lastSmsAt),optedOut=Boolean(profile.marketing_sms_opted_out_at),explicit=profile.marketing_sms_consent===true&&!optedOut,consent=optedOut?"opted_out":explicit?"explicit":"legacy";
    const match=segment==="all"?true:segment==="sleeping_long"?daysDormant>=365:segment==="sleeping_warm"?daysDormant>=180&&daysDormant<365:daysDormant>=180;if(!match)continue;
    rows.push({phone:item.phone,name:String(profile.name||item.name||item.phone),completedOrders:item.count,lastCompleted:item.last,daysDormant,consent,consentAt:profile.marketing_sms_consent_at||null,consentSource:String(profile.marketing_sms_consent_source||""),activeBooking,lastSmsAt,cooldown,selectable:!optedOut&&!cooldown&&!activeBooking});
  }
  rows.sort((a,b)=>b.daysDormant-a.daysDormant||a.name.localeCompare(b.name,"uk"));return rows;
}

async function campaignPromoContext(db:any,campaignId:string,phones:string[]){
  if(!validUuid(campaignId))return {personalized:false,campaign:null,byPhone:new Map<string,any>()};
  const {data:campaign,error}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,dormant_days,min_completed_orders,starts_at,ends_at").eq("id",campaignId).maybeSingle();if(error)throw error;
  if(!campaign)return {personalized:false,campaign:null,byPhone:new Map<string,any>()};
  const now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,ends=campaign.ends_at?new Date(campaign.ends_at).getTime():0;
  if(campaign.status!=="active"||(starts&&starts>now)||(ends&&ends<=now))throw new Error("campaign_inactive");
  const personalized=["return","personal"].includes(String(campaign.campaign_type||""));if(!personalized||!phones.length)return {personalized,campaign,byPhone:new Map<string,any>()};
  const normalized=[...new Set(phones.map(normalizePhone).filter(Boolean))];
  const {data:codes,error:codeError}=await db.from("vacleaner_promo_codes").select("id,code,customer_phone,active,expires_at").eq("campaign_id",campaignId).in("customer_phone",normalized);if(codeError)throw codeError;
  const ids=(codes||[]).map((r:any)=>r.id).filter(Boolean);let used=new Set<string>();if(ids.length){const {data:redemptions,error:redemptionError}=await db.from("vacleaner_promo_redemptions").select("promo_code_id").in("promo_code_id",ids);if(redemptionError)throw redemptionError;used=new Set((redemptions||[]).map((r:any)=>String(r.promo_code_id)))}
  const existing=new Map<string,any>();for(const row of codes||[]){const phone=normalizePhone(row.customer_phone),expired=row.expires_at&&new Date(row.expires_at).getTime()<=now;if(phone&&!expired&&!used.has(String(row.id)))existing.set(phone,row)}
  const isPersonal=String(campaign.campaign_type||"")==="personal",byPhone=new Map<string,any>();
  for(const phone of normalized){const row=existing.get(phone);if(isPersonal&&!row)continue;const code=row?.code||await personalPromoCode(campaignId,phone),link=promoShortLink(code);if(link)byPhone.set(phone,{promoCode:String(code),promoLink:link,promoCodeId:row?.id?String(row.id):null})}
  return {personalized,campaign,byPhone};
}

async function proxySms(request:Request,url:string,service:string,body:Record<string,any>){
  const auth=request.headers.get("Authorization")||"",response=await fetch(`${url}/functions/v1/vacleaner-sms-v2`,{method:"POST",headers:{Authorization:auth,apikey:service,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const raw=await response.text();return new Response(raw,{status:response.status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})
}

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");if(!url||!service||!token)return json({error:"unauthorized"},401);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),{data:userData,error:userError}=await db.auth.getUser(token);if(userError||!userData.user)return json({error:"unauthorized"},401);
    const {data:admin,error:adminError}=await db.from("vacleaner_admin_users").select("user_id").eq("user_id",userData.user.id).maybeSingle();if(adminError)throw adminError;if(!admin)return json({error:"forbidden"},403);
    const body=await request.json() as Record<string,any>,action=String(body.action||""),campaignId=String(body.campaignId||"");

    if(["sms_preflight","sms_send","sms_sync"].includes(action))return await proxySms(request,url,service,body);
    if(action==="sms_status"){
      const key=Deno.env.get("SENDPULSE_API_KEY");if(!key)return json({error:"sendpulse_not_configured"},503);
      try{const [senderStatus,balance]=await Promise.all([sendpulseSender(key),sendpulseBalance(key)]);return json({sender:SMS_SENDER,provider:"SendPulse",senderStatus,balance,cooldownDays:SMS_COOLDOWN_DAYS,optOutUrl:SMS_OPT_OUT})}catch{return json({sender:SMS_SENDER,provider:"SendPulse",senderStatus:{found:false,status:null,statusLabel:"API недоступне",statusExplain:""},balance:null,cooldownDays:SMS_COOLDOWN_DAYS,optOutUrl:SMS_OPT_OUT})}
    }
    if(action==="sms_audience"){
      const segment=["all","sleeping","sleeping_warm","sleeping_long"].includes(String(body.segment))?String(body.segment):"sleeping";let forcedPhones:string[]=[];let scopeCampaign:any=null;
      if(validUuid(campaignId)){const {data,error}=await db.from("vacleaner_campaigns").select("id,campaign_type,dormant_days,min_completed_orders").eq("id",campaignId).maybeSingle();if(error)throw error;scopeCampaign=data;if(String(data?.campaign_type||"")==="personal"){const {data:target,error:targetError}=await db.from("vacleaner_promo_codes").select("customer_phone").eq("campaign_id",campaignId).not("customer_phone","is",null).limit(1).maybeSingle();if(targetError)throw targetError;const phone=normalizePhone(target?.customer_phone);if(phone)forcedPhones=[phone]}}
      let rows=await buildAudience(db,segment,forcedPhones),personalized=false,promoMissing=0;
      if(validUuid(campaignId)){const promo=await campaignPromoContext(db,campaignId,rows.map(r=>r.phone));personalized=promo.personalized;if(personalized){const isReturn=String(promo.campaign?.campaign_type||"")==="return",dormant=Math.max(1,Number(promo.campaign?.dormant_days||180)),minimum=Math.max(1,Number(promo.campaign?.min_completed_orders||1));rows=rows.map(row=>{const eligible=!row.activeBooking&&(!isReturn||(Number(row.daysDormant||0)>=dormant&&Number(row.completedOrders||0)>=minimum)),promoRow=eligible?promo.byPhone.get(row.phone):null,selectable=row.selectable&&eligible&&Boolean(promoRow);if(row.selectable&&eligible&&!promoRow)promoMissing+=1;return {...row,selectable,promoReady:Boolean(promoRow)}})}}
      const visibleRows=rows.filter(row=>!row.cooldown);return json({segment,personalized,customers:visibleRows,summary:{total:rows.length,selectable:rows.filter(r=>r.selectable).length,explicit:rows.filter(r=>r.selectable&&r.consent==="explicit").length,legacy:rows.filter(r=>r.selectable&&r.consent==="legacy").length,optedOut:rows.filter(r=>r.consent==="opted_out").length,cooldown:rows.filter(r=>r.cooldown).length,active:rows.filter(r=>r.activeBooking).length,promoMissing}})
    }
    if(action==="sms_dispatches"){const {data,error}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,sender,route,audience_segment,message_body,message_parts,status,sendpulse_campaign_id,sendpulse_addressbook_id,personalized,audience_count,explicit_consent_count,legacy_count,sent_count,delivered_count,not_delivered_count,legacy_attestation,total_cost,currency,error_code,created_at,sent_at,last_synced_at").order("created_at",{ascending:false}).limit(50);if(error)throw error;return json({dispatches:data||[]})}
    if(action==="customer_sms_history"){const phone=normalizePhone(body.phone);if(!phone)return json({error:"invalid_customer"},400);const [{data:customer,error:ce},{data:rows,error:re}]=await Promise.all([db.from("vacleaner_customers").select("phone,marketing_sms_consent,marketing_sms_consent_at,marketing_sms_consent_source,marketing_sms_opted_out_at").eq("phone",phone).maybeSingle(),db.from("vacleaner_sms_dispatch_recipients").select("status,status_explain,money_spent,created_at,dispatch_id,vacleaner_sms_dispatches(message_body,audience_segment,status,sent_at)").eq("customer_phone",phone).order("created_at",{ascending:false}).limit(30)]);if(ce||re)throw ce||re;const consent=customer?.marketing_sms_opted_out_at?"opted_out":customer?.marketing_sms_consent===true?"explicit":"legacy";return json({consent,consentAt:customer?.marketing_sms_consent_at||null,consentSource:customer?.marketing_sms_consent_source||"",optedOutAt:customer?.marketing_sms_opted_out_at||null,history:rows||[]})}
    if(action==="set_customer_sms_consent"){const phone=normalizePhone(body.phone);if(!phone)return json({error:"invalid_customer"},400);const enabled=body.enabled===true,now=new Date().toISOString(),patch=enabled?{marketing_sms_consent:true,marketing_sms_consent_at:now,marketing_sms_consent_source:"admin_confirmed",marketing_sms_opted_out_at:null,updated_at:now}:{marketing_sms_consent:false,marketing_sms_opted_out_at:now,marketing_sms_consent_source:"admin_opt_out",updated_at:now};const {data,error}=await db.from("vacleaner_customers").update(patch).eq("phone",phone).select("phone").maybeSingle();if(error)throw error;if(!data)return json({error:"invalid_customer"},404);return json({ok:true,consent:enabled?"explicit":"opted_out"})}

    if(!validUuid(campaignId))return json({error:"invalid_campaign"},400);
    if(action==="archive_campaign"){const now=new Date().toISOString(),{data:campaign,error:ce}=await db.from("vacleaner_campaigns").select("id,ends_at").eq("id",campaignId).maybeSingle();if(ce)throw ce;if(!campaign)return json({error:"invalid_campaign"},404);const endedAt=campaign.ends_at&&new Date(campaign.ends_at).getTime()<Date.now()?campaign.ends_at:now;const {error}=await db.from("vacleaner_campaigns").update({status:"ended",ends_at:endedAt,updated_at:now}).eq("id",campaignId);if(error)throw error;await db.from("vacleaner_promo_codes").update({active:false}).eq("campaign_id",campaignId);return json({ok:true,status:"ended"})}
    if(action==="delete_campaign"){const {count,error:he}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("campaign_id",campaignId);if(he)throw he;if(Number(count||0)>0)return json({error:"campaign_has_history"},409);const {error}=await db.from("vacleaner_campaigns").delete().eq("id",campaignId);if(error)throw error;return json({ok:true,deleted:true})}
    return json({error:"invalid_action"},400);
  }catch(error){const message=error instanceof Error?error.message:String(error||"service_error");if(message==="campaign_inactive")return json({error:"campaign_inactive"},409);console.error("vacleaner-campaigns-v1",message);return json({error:"service_error"},500)}
});
