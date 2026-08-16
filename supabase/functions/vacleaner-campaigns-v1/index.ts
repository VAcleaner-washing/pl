import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const validUuid=(value:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??""));
const cleanText=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[<>]/g,"").slice(0,max):"";
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const smsPhone=(value:unknown)=>normalizePhone(value).replace(/^\+/,"");
const SMS_SENDER="VACLEANER",SMS_COOLDOWN_DAYS=90,SMS_OPT_OUT="vacleaner.pp.ua/s",SMS_LINK_TOKEN="{link}",SMS_LINK_SAMPLE="vacleaner.pp.ua/b#XXXXXXX",SP_PROMO_VAR="PromoLink";
const expandSmsTemplate=(text:string,link=SMS_LINK_SAMPLE)=>String(text||"").split(SMS_LINK_TOKEN).join(link);
const smsParts=(text:string)=>{const unicode=/[^\u0000-\u007f]/.test(text),len=[...text].length;if(unicode)return len<=70?1:Math.min(6,Math.ceil(len/67));return len<=160?1:Math.min(6,Math.ceil(len/153))};
const promoShortLink=(code:unknown)=>{const value=String(code||"").toUpperCase().replace(/[^A-Z0-9_-]/g,"");return /^VA-[A-Z0-9]{7}$/.test(value)?`vacleaner.pp.ua/b#${value.slice(3)}`:""};
const senderStatusLabel=(status:number)=>status===1?"Активний":status===2?"Відхилено":"На модерації";
const spHeaders=(key:string)=>({Authorization:`Bearer ${key}`,"Content-Type":"application/json"});
function sendpulseErrorDetail(data:any){const raw=data?.error??data?.message??data?.error_description??data?.data?.error??data?.data?.message??"";return cleanText(String(raw||""),220)}
async function spJson(key:string,url:string,init:RequestInit={}){const res=await fetch(url,{...init,headers:{...spHeaders(key),...(init.headers||{})},signal:AbortSignal.timeout(15000)});const raw=await res.text();let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data=raw?{message:raw}:null}if(!res.ok){const detail=sendpulseErrorDetail(data);throw new Error(`sendpulse_http_${res.status}${detail?":"+detail:""}`)}return data}
async function sendpulseBalance(key:string){const data=await spJson(key,"https://api.sendpulse.com/balance");return {currency:String(data?.currency||""),amount:Number(data?.balance_currency||0)}}
async function sendpulseSender(key:string){const rows=await spJson(key,"https://api.sendpulse.com/sms/senders");const list=Array.isArray(rows)?rows:[];const row=list.find((item:any)=>String(item?.sender||"").toUpperCase()===SMS_SENDER&&String(item?.country_code||"").toUpperCase()==="UA")||list.find((item:any)=>String(item?.sender||"").toUpperCase()===SMS_SENDER)||null;return row?{found:true,status:Number(row.status),statusLabel:senderStatusLabel(Number(row.status)),statusExplain:String(row.status_explain||""),country:String(row.country||""),countryCode:String(row.country_code||"")}:{found:false,status:null,statusLabel:"Не знайдено",statusExplain:"",country:"",countryCode:""}}
async function campaignPromoContext(db:any,campaignId:string,phones:string[]){
  if(!validUuid(campaignId))return {personalized:false,campaign:null,byPhone:new Map<string,any>()};
  const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,starts_at,ends_at").eq("id",campaignId).maybeSingle();
  if(campaignError)throw campaignError;if(!campaign)return {personalized:false,campaign:null,byPhone:new Map<string,any>()};
  const now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,ends=campaign.ends_at?new Date(campaign.ends_at).getTime():0;
  if(campaign.status!=="active"||(starts&&starts>now)||(ends&&ends<=now))throw new Error("campaign_inactive");
  const personalized=String(campaign.campaign_type||"")==="return";
  if(!personalized||!phones.length)return {personalized,campaign,byPhone:new Map<string,any>()};
  const {data:codes,error:codeError}=await db.from("vacleaner_promo_codes").select("id,code,customer_phone,active,expires_at").eq("campaign_id",campaignId).eq("active",true).in("customer_phone",phones);
  if(codeError)throw codeError;
  const ids=(codes||[]).map((row:any)=>row.id).filter(Boolean);let used=new Set<string>();
  if(ids.length){const {data:redemptions,error:redemptionError}=await db.from("vacleaner_promo_redemptions").select("promo_code_id").in("promo_code_id",ids);if(redemptionError)throw redemptionError;used=new Set((redemptions||[]).map((row:any)=>String(row.promo_code_id)))}
  const byPhone=new Map<string,any>();
  for(const row of codes||[]){const phone=normalizePhone(row.customer_phone),link=promoShortLink(row.code),expired=row.expires_at&&new Date(row.expires_at).getTime()<=now;if(!phone||!link||expired||used.has(String(row.id)))continue;byPhone.set(phone,{promoCode:String(row.code),promoLink:link,promoCodeId:String(row.id)})}
  return {personalized,campaign,byPhone};
}
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
function sendpulseAddressBookRow(payload:any,addressBookId:number){
  const candidates=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.result)?payload.result:[payload?.data??payload];
  return candidates.find((row:any)=>Number(row?.id||row?.addressBookId||0)===addressBookId)||candidates.find((row:any)=>row&&typeof row==="object")||{};
}
async function sendpulsePhoneReady(key:string,addressBookId:number,phone:string){
  const raw=await spJson(key,`https://api.sendpulse.com/sms/numbers/info/${addressBookId}/${smsPhone(phone)}`);
  const row=Array.isArray(raw)?raw.find((item:any)=>item?.result===true)??raw[0]:raw;
  const data=row?.data??row;
  return Number(data?.status||0)===1;
}
async function waitForSendpulseAddressBook(key:string,addressBookId:number,phones:string[]){
  const expectedPhones=Math.max(1,phones.length);
  const deadline=Date.now()+85000;
  let last={active:0,excluded:0,newPhones:expectedPhones,status:0,statusExplain:""};
  let attempt=0;
  while(Date.now()<deadline){
    const info=await spJson(key,`https://api.sendpulse.com/addressbooks/${addressBookId}`);
    const row=sendpulseAddressBookRow(info,addressBookId);
    const active=Math.max(0,Number(row?.active_phones_quantity??row?.activePhonesQuantity??0)||0);
    const excluded=Math.max(0,Number(row?.exc_phones_quantity??row?.excluded_phones_quantity??row?.inactive_phones_quantity??0)||0);
    const explicitNew=Number(row?.new_phones_quantity);
    const newPhones=Number.isFinite(explicitNew)?Math.max(0,explicitNew):Math.max(0,expectedPhones-active-excluded);
    last={active,excluded,newPhones,status:Number(row?.status||0),statusExplain:cleanText(String(row?.status_explain||""),120)};
    if(active>=expectedPhones)return last;
    if(active+excluded>=expectedPhones&&excluded>0)throw new Error(`sendpulse_addressbook_rejected:${active}_active:${excluded}_excluded`);
    // SendPulse's aggregate counters may lag. For small test batches, verify the actual phone status too.
    if(phones.length<=10&&attempt%3===2){
      const states=await Promise.allSettled(phones.map(phone=>sendpulsePhoneReady(key,addressBookId,phone)));
      const exactActive=states.filter(state=>state.status==='fulfilled'&&state.value===true).length;
      if(exactActive>=expectedPhones)return {...last,active:exactActive,newPhones:0};
    }
    attempt+=1;
    if(Date.now()<deadline)await sleep(attempt<4?1000:2500);
  }
  throw new Error(`sendpulse_addressbook_processing:${last.active}/${expectedPhones}_active:${last.newPhones}_new:${last.excluded}_excluded`);
}
async function createPersonalizedAddressBook(key:string,label:string,recipients:Array<any>){
  let addressBookId=0;
  const book=await spJson(key,"https://api.sendpulse.com/addressbooks",{method:"POST",body:JSON.stringify({bookName:`VAcleaner ${label} ${new Date().toISOString().slice(0,16)}`})});
  addressBookId=Number(book?.id||0);if(!addressBookId)throw new Error("sendpulse_addressbook_error");
  try{
    const phones:Record<string,any>={};for(const row of recipients)phones[smsPhone(row.phone)]=[[{name:SP_PROMO_VAR,type:"string",value:String(row.promoLink||"")}]];
    const add=await spJson(key,"https://api.sendpulse.com/sms/numbers/variables",{method:"POST",body:JSON.stringify({addressBookId,phones})});
    const added=Array.isArray(add)?add.find((item:any)=>item?.result===true):add;if(!added?.result)throw new Error("sendpulse_variables_error");
    await waitForSendpulseAddressBook(key,addressBookId,recipients.map((row:any)=>String(row.phone||"")));
    return addressBookId;
  }catch(error){await spJson(key,`https://api.sendpulse.com/addressbooks/${addressBookId}`,{method:"DELETE"}).catch(()=>null);throw error}
}
async function deleteSendpulseAddressBook(key:string,addressBookId:number){if(addressBookId>0)await spJson(key,`https://api.sendpulse.com/addressbooks/${addressBookId}`,{method:"DELETE"}).catch(()=>null)}
async function createPersonalizedSendpulseCampaign(key:string,dispatchId:string,route:string,message:string,recipients:Array<any>){
  const addressBookId=await createPersonalizedAddressBook(key,dispatchId.slice(0,8),recipients);
  try{
    const body=String(message).split(SMS_LINK_TOKEN).join(`{{${SP_PROMO_VAR}}}`);
    const result=await spJson(key,"https://api.sendpulse.com/sms/campaigns",{method:"POST",body:JSON.stringify({sender:SMS_SENDER,addressBookId,body,route:{UA:route},emulate:false,use_dynamic_list:false,stat_link_tracking:false,stat_link_need_protocol:false})});
    if(!result?.result||!result?.campaign_id)throw new Error("sendpulse_api_error");
    return {campaignId:Number(result.campaign_id),addressBookId};
  }catch(error){await deleteSendpulseAddressBook(key,addressBookId);throw error}
}
async function preflightPersonalizedSendpulseCampaign(key:string,route:string,message:string,recipients:Array<any>){
  const addressBookId=await createPersonalizedAddressBook(key,"preflight",recipients);
  try{
    const body=String(message).split(SMS_LINK_TOKEN).join(`{{${SP_PROMO_VAR}}}`);
    const result=await spJson(key,"https://api.sendpulse.com/sms/campaigns",{method:"POST",body:JSON.stringify({sender:SMS_SENDER,addressBookId,body,route:{UA:route},emulate:true,use_dynamic_list:false,stat_link_tracking:false,stat_link_need_protocol:false})});
    if(result?.result===false)throw new Error(`sendpulse_preflight_rejected:${sendpulseErrorDetail(result)||"provider_rejected"}`);
    return {ok:true};
  }finally{await deleteSendpulseAddressBook(key,addressBookId)}
}
async function preflightDirectSendpulseCampaign(key:string,route:string,message:string,recipients:Array<any>){
  const result=await spJson(key,"https://api.sendpulse.com/sms/send",{method:"POST",body:JSON.stringify({sender:SMS_SENDER,phones:recipients.map((r:any)=>smsPhone(r.phone)),body:message,route:{UA:route},emulate:true,stat_link_tracking:false,stat_link_need_protocol:false})});
  if(result?.result===false)throw new Error(`sendpulse_preflight_rejected:${sendpulseErrorDetail(result)||"provider_rejected"}`);
  return {ok:true};
}

type AudienceRow={phone:string;name:string;completedOrders:number;lastCompleted:string;daysDormant:number;consent:"explicit"|"legacy"|"opted_out";consentAt:string|null;consentSource:string;activeBooking:boolean;lastSmsAt:string|null;cooldown:boolean;selectable:boolean};
async function buildAudience(db:any,segment:string){
  const [{data:customers,error:customerError},{data:completed,error:completedError},{data:active,error:activeError},{data:recentSms,error:smsError}]=await Promise.all([
    db.from("vacleaner_customers").select("phone,name,marketing_sms_consent,marketing_sms_consent_at,marketing_sms_consent_source,marketing_sms_opted_out_at").limit(5000),
    db.from("vacleaner_bookings").select("customer_phone,customer_name,return_date").eq("status","completed").order("return_date",{ascending:false}).limit(10000),
    db.from("vacleaner_bookings").select("customer_phone").in("status",["waiting_payment","confirmed","issued"]).limit(5000),
    db.from("vacleaner_sms_dispatch_recipients").select("customer_phone,status,created_at").in("status",["submitted","sent","delivered","not_delivered"]).gte("created_at",new Date(Date.now()-SMS_COOLDOWN_DAYS*86400000).toISOString()).order("created_at",{ascending:false}).limit(10000),
  ]);if(customerError||completedError||activeError||smsError)throw customerError||completedError||activeError||smsError;
  const profiles=new Map<string,any>();for(const row of customers||[]){const phone=normalizePhone(row.phone);if(phone)profiles.set(phone,row)}
  const activePhones=new Set((active||[]).map((r:any)=>normalizePhone(r.customer_phone)).filter(Boolean));
  const recentMap=new Map<string,string>();for(const row of recentSms||[]){const phone=normalizePhone(row.customer_phone);if(phone&&!recentMap.has(phone))recentMap.set(phone,String(row.created_at||""))}
  const stats=new Map<string,{phone:string;name:string;count:number;last:string}>();for(const row of completed||[]){const phone=normalizePhone(row.customer_phone);if(!phone)continue;const date=String(row.return_date||"");const cur=stats.get(phone)||{phone,name:cleanText(row.customer_name,120),count:0,last:date};cur.count+=1;if(date>cur.last){cur.last=date;cur.name=cleanText(row.customer_name,120)||cur.name}stats.set(phone,cur)}
  const today=Date.now(),rows:AudienceRow[]=[];for(const item of stats.values()){
    const profile=profiles.get(item.phone)||{},lastTime=Date.parse(`${item.last}T12:00:00Z`),daysDormant=Number.isFinite(lastTime)?Math.max(0,Math.floor((today-lastTime)/86400000)):0,activeBooking=activePhones.has(item.phone),lastSmsAt=recentMap.get(item.phone)||null,cooldown=Boolean(lastSmsAt);
    const optedOut=Boolean(profile.marketing_sms_opted_out_at),explicit=profile.marketing_sms_consent===true&&!optedOut,consent=optedOut?"opted_out":explicit?"explicit":"legacy";
    const segmentMatch=segment==="all"?true:segment==="sleeping_long"?daysDormant>=365:segment==="sleeping_warm"?daysDormant>=180&&daysDormant<365:daysDormant>=180;
    if(!segmentMatch)continue;
    const selectable=!optedOut&&!cooldown&&!activeBooking;
    rows.push({phone:item.phone,name:String(profile.name||item.name||item.phone),completedOrders:item.count,lastCompleted:item.last,daysDormant,consent,consentAt:profile.marketing_sms_consent_at||null,consentSource:String(profile.marketing_sms_consent_source||""),activeBooking,lastSmsAt,cooldown,selectable});
  }
  rows.sort((a,b)=>b.daysDormant-a.daysDormant||a.name.localeCompare(b.name,"uk"));return rows;
}
function deliveryStatus(code:number){return code===2?"delivered":code===12?"not_delivered":code===1?"sent":"submitted"}

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),token=(request.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
    if(!url||!service||!token)return json({error:"unauthorized"},401);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userError}=await db.auth.getUser(token);if(userError||!userData.user)return json({error:"unauthorized"},401);
    const {data:admin,error:adminError}=await db.from("vacleaner_admin_users").select("user_id").eq("user_id",userData.user.id).maybeSingle();if(adminError)throw adminError;if(!admin)return json({error:"forbidden"},403);
    const body=await request.json() as Record<string,any>,action=String(body.action??""),campaignId=String(body.campaignId??"");

    if(action==="sms_status"){
      const key=Deno.env.get("SENDPULSE_API_KEY");if(!key)return json({error:"sendpulse_not_configured"},503);
      try{const [senderStatus,balance]=await Promise.all([sendpulseSender(key),sendpulseBalance(key)]);return json({sender:SMS_SENDER,provider:"SendPulse",senderStatus,balance,cooldownDays:SMS_COOLDOWN_DAYS,optOutUrl:SMS_OPT_OUT})}catch{return json({sender:SMS_SENDER,provider:"SendPulse",senderStatus:{found:false,status:null,statusLabel:"API недоступне",statusExplain:""},balance:null,cooldownDays:SMS_COOLDOWN_DAYS,optOutUrl:SMS_OPT_OUT})}
    }
    if(action==="sms_audience"){
      const segment=["all","sleeping","sleeping_warm","sleeping_long"].includes(String(body.segment))?String(body.segment):"sleeping";let rows=await buildAudience(db,segment);
      let personalized=false,promoMissing=0;
      if(validUuid(campaignId)){const promo=await campaignPromoContext(db,campaignId,rows.map(r=>r.phone));personalized=promo.personalized;if(personalized){rows=rows.map(row=>{const promoRow=promo.byPhone.get(row.phone),selectable=row.selectable&&Boolean(promoRow);if(row.selectable&&!promoRow)promoMissing+=1;return {...row,selectable,promoReady:Boolean(promoRow)}})}}
      const visibleRows=rows.filter(row=>!row.cooldown);
      return json({segment,personalized,customers:visibleRows,summary:{total:rows.length,selectable:rows.filter(r=>r.selectable).length,explicit:rows.filter(r=>r.selectable&&r.consent==="explicit").length,legacy:rows.filter(r=>r.selectable&&r.consent==="legacy").length,optedOut:rows.filter(r=>r.consent==="opted_out").length,cooldown:rows.filter(r=>r.cooldown).length,active:rows.filter(r=>r.activeBooking).length,promoMissing}})
    }
    if(action==="sms_dispatches"){
      const {data,error}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,sender,route,audience_segment,message_body,message_parts,status,sendpulse_campaign_id,sendpulse_addressbook_id,personalized,audience_count,explicit_consent_count,legacy_count,sent_count,delivered_count,not_delivered_count,legacy_attestation,total_cost,currency,error_code,created_at,sent_at,last_synced_at").order("created_at",{ascending:false}).limit(50);if(error)throw error;return json({dispatches:data||[]})
    }
    if(action==="customer_sms_history"){
      const phone=normalizePhone(body.phone);if(!phone)return json({error:"invalid_customer"},400);const [{data:customer,error:ce},{data:rows,error:re}]=await Promise.all([db.from("vacleaner_customers").select("phone,marketing_sms_consent,marketing_sms_consent_at,marketing_sms_consent_source,marketing_sms_opted_out_at").eq("phone",phone).maybeSingle(),db.from("vacleaner_sms_dispatch_recipients").select("status,status_explain,money_spent,created_at,dispatch_id,vacleaner_sms_dispatches(message_body,audience_segment,status,sent_at)").eq("customer_phone",phone).order("created_at",{ascending:false}).limit(30)]);if(ce||re)throw ce||re;const consent=customer?.marketing_sms_opted_out_at?"opted_out":customer?.marketing_sms_consent===true?"explicit":"legacy";return json({consent,consentAt:customer?.marketing_sms_consent_at||null,consentSource:customer?.marketing_sms_consent_source||"",optedOutAt:customer?.marketing_sms_opted_out_at||null,history:rows||[]})
    }
    if(action==="set_customer_sms_consent"){
      const phone=normalizePhone(body.phone);if(!phone)return json({error:"invalid_customer"},400);const enabled=body.enabled===true,now=new Date().toISOString(),patch=enabled?{marketing_sms_consent:true,marketing_sms_consent_at:now,marketing_sms_consent_source:"admin_confirmed",marketing_sms_opted_out_at:null,updated_at:now}:{marketing_sms_consent:false,marketing_sms_opted_out_at:now,marketing_sms_consent_source:"admin_opt_out",updated_at:now};const {data,error}=await db.from("vacleaner_customers").update(patch).eq("phone",phone).select("phone").maybeSingle();if(error)throw error;if(!data)return json({error:"invalid_customer"},404);return json({ok:true,consent:enabled?"explicit":"opted_out"})
    }
    if(action==="sms_preflight"){
      const key=Deno.env.get("SENDPULSE_API_KEY");if(!key)return json({error:"sendpulse_not_configured"},503);
      const segment=["all","sleeping","sleeping_warm","sleeping_long"].includes(String(body.segment))?String(body.segment):"sleeping",route=body.route==="international"?"international":"national",message=cleanText(body.message,402),selected=[...new Set((Array.isArray(body.phones)?body.phones:[]).map(normalizePhone).filter(Boolean))].slice(0,500);if(!message||!selected.length)return json({error:"invalid_sms_campaign"},400);if(!message.toLowerCase().includes(SMS_OPT_OUT))return json({error:"sms_optout_required"},400);
      const audience=await buildAudience(db,segment),map=new Map(audience.map(row=>[row.phone,row])),recipients=selected.map(phone=>map.get(phone)).filter(Boolean) as AudienceRow[];if(recipients.length!==selected.length||recipients.some(r=>!r.selectable))return json({error:"audience_changed"},409);const legacy=recipients.filter(r=>r.consent==="legacy");if(legacy.length&&body.legacyAttestation!==true)return json({error:"legacy_consent_confirmation_required",legacyCount:legacy.length},409);
      const promo=await campaignPromoContext(db,campaignId,selected),personalized=promo.personalized;if(personalized&&!message.includes(SMS_LINK_TOKEN))return json({error:"promo_link_required"},400);const recipientsWithPromo=recipients.map(row=>{const personal=promo.byPhone.get(row.phone);return {...row,promoCode:personal?.promoCode||null,promoLink:personal?.promoLink||null}});if(personalized&&recipientsWithPromo.some(row=>!row.promoCode||!row.promoLink))return json({error:"promo_codes_missing"},409);
      const measuredMessage=personalized?expandSmsTemplate(message):message;if([...measuredMessage].length>402||smsParts(measuredMessage)>6)return json({error:"sms_too_long"},400);
      const sender=await sendpulseSender(key);if(route==="national"&&sender.status!==1)return json({error:"sender_not_active",senderStatus:sender},409);
      try{const balance=await sendpulseBalance(key);if(personalized)await preflightPersonalizedSendpulseCampaign(key,route,message,recipientsWithPromo);else await preflightDirectSendpulseCampaign(key,route,message,recipients);return json({ok:true,parts:smsParts(measuredMessage),recipients:recipients.length,personalized,balance,senderStatus:sender})}
      catch(error){const detail=error instanceof Error?error.message:"sendpulse_preflight_failed";return json({error:"sendpulse_preflight_failed",detail},422)}
    }
    if(action==="sms_send"){
      const key=Deno.env.get("SENDPULSE_API_KEY");if(!key)return json({error:"sendpulse_not_configured"},503);
      const segment=["all","sleeping","sleeping_warm","sleeping_long"].includes(String(body.segment))?String(body.segment):"sleeping",route=body.route==="international"?"international":"national",message=cleanText(body.message,402),selected=[...new Set((Array.isArray(body.phones)?body.phones:[]).map(normalizePhone).filter(Boolean))].slice(0,500);if(!message||!selected.length)return json({error:"invalid_sms_campaign"},400);if(!message.toLowerCase().includes(SMS_OPT_OUT))return json({error:"sms_optout_required"},400);
      const audience=await buildAudience(db,segment),map=new Map(audience.map(row=>[row.phone,row])),recipients=selected.map(phone=>map.get(phone)).filter(Boolean) as AudienceRow[];if(recipients.length!==selected.length||recipients.some(r=>!r.selectable))return json({error:"audience_changed"},409);const legacy=recipients.filter(r=>r.consent==="legacy"),explicit=recipients.filter(r=>r.consent==="explicit");if(legacy.length&&body.legacyAttestation!==true)return json({error:"legacy_consent_confirmation_required",legacyCount:legacy.length},409);
      const promo=await campaignPromoContext(db,campaignId,selected);const personalized=promo.personalized;if(personalized&&!message.includes(SMS_LINK_TOKEN))return json({error:"promo_link_required"},400);
      const recipientsWithPromo=recipients.map(row=>{const personal=promo.byPhone.get(row.phone);return {...row,promoCode:personal?.promoCode||null,promoLink:personal?.promoLink||null}});
      if(personalized&&recipientsWithPromo.some(row=>!row.promoCode||!row.promoLink))return json({error:"promo_codes_missing"},409);
      const measuredMessage=personalized?expandSmsTemplate(message):message;if([...measuredMessage].length>402||smsParts(measuredMessage)>6)return json({error:"sms_too_long"},400);
      const sender=await sendpulseSender(key);if(route==="national"&&sender.status!==1)return json({error:"sender_not_active",senderStatus:sender},409);
      const now=new Date().toISOString(),parts=smsParts(measuredMessage);const {data:dispatch,error:dispatchError}=await db.from("vacleaner_sms_dispatches").insert({campaign_id:validUuid(campaignId)?campaignId:null,sender:SMS_SENDER,route,audience_segment:segment,message_body:message,message_parts:parts,status:"draft",personalized,audience_count:recipients.length,explicit_consent_count:explicit.length,legacy_count:legacy.length,legacy_attestation:legacy.length?true:false,created_by:userData.user.id}).select("*").single();if(dispatchError||!dispatch)throw dispatchError||new Error("dispatch_insert_failed");
      const recipientRows=recipientsWithPromo.map(r=>({dispatch_id:dispatch.id,customer_phone:r.phone,customer_name:r.name,consent_basis:r.consent==="explicit"?"explicit":"legacy_admin_attested",status:"queued",promo_code:r.promoCode,promo_link:r.promoLink}));const {error:recipientError}=await db.from("vacleaner_sms_dispatch_recipients").insert(recipientRows);if(recipientError){await db.from("vacleaner_sms_dispatches").delete().eq("id",dispatch.id);throw recipientError}
      try{
        let campaignResult:any;
        if(personalized){const result=await createPersonalizedSendpulseCampaign(key,dispatch.id,route,message,recipientsWithPromo);campaignResult={campaignId:result.campaignId,addressBookId:result.addressBookId,sends:recipients.length,exceptions:0}}
        else{const result=await spJson(key,"https://api.sendpulse.com/sms/send",{method:"POST",body:JSON.stringify({sender:SMS_SENDER,phones:recipients.map(r=>smsPhone(r.phone)),body:message,route:{UA:route},emulate:false,stat_link_tracking:true,stat_link_need_protocol:true})});if(!result?.result||!result?.campaign_id)throw new Error("sendpulse_api_error");campaignResult={campaignId:Number(result.campaign_id),addressBookId:null,sends:Math.max(0,Number(result?.counters?.sends||recipients.length)),exceptions:Number(result?.counters?.exceptions||0)}}
        const sends=Math.max(0,Number(campaignResult.sends||recipients.length)),status=sends===recipients.length?"submitted":"partial";await Promise.all([db.from("vacleaner_sms_dispatches").update({status,sendpulse_campaign_id:campaignResult.campaignId,sendpulse_addressbook_id:campaignResult.addressBookId,sent_count:personalized?0:sends,sent_at:now,last_synced_at:now}).eq("id",dispatch.id),db.from("vacleaner_sms_dispatch_recipients").update({status:"submitted",updated_at:now}).eq("dispatch_id",dispatch.id)]);return json({ok:true,dispatchId:dispatch.id,campaignId:campaignResult.campaignId,sent:sends,exceptions:campaignResult.exceptions,parts,personalized})
      }catch(error){const code=error instanceof Error?error.message:"sendpulse_api_error";await Promise.all([db.from("vacleaner_sms_dispatches").update({status:"failed",error_code:code,last_synced_at:now}).eq("id",dispatch.id),db.from("vacleaner_sms_dispatch_recipients").update({status:"failed",status_explain:code,updated_at:now}).eq("dispatch_id",dispatch.id)]);return json({error:"sendpulse_api_error",detail:code},502)}
    }
    if(action==="sms_sync"){
      const key=Deno.env.get("SENDPULSE_API_KEY");if(!key)return json({error:"sendpulse_not_configured"},503);const dispatchId=String(body.dispatchId||"");if(!validUuid(dispatchId))return json({error:"invalid_dispatch"},400);const {data:dispatch,error}=await db.from("vacleaner_sms_dispatches").select("*").eq("id",dispatchId).maybeSingle();if(error)throw error;if(!dispatch||!dispatch.sendpulse_campaign_id)return json({error:"invalid_dispatch"},404);const raw=await spJson(key,`https://api.sendpulse.com/sms/campaigns/info/${dispatch.sendpulse_campaign_id}`),payload=Array.isArray(raw)?raw.find((x:any)=>x?.result)?.data:raw?.data;if(!payload)return json({error:"sendpulse_api_error"},502);const infos=Array.isArray(payload.task_phones_info)?payload.task_phones_info:[],now=new Date().toISOString();for(const info of infos){const phone=normalizePhone(String(info.phone||""));if(!phone)continue;await db.from("vacleaner_sms_dispatch_recipients").update({status:deliveryStatus(Number(info.status)),status_explain:String(info.status_explain||""),money_spent:Number(info.money_spent||0),updated_at:now}).eq("dispatch_id",dispatch.id).eq("customer_phone",phone)}const {data:statuses,error:statusError}=await db.from("vacleaner_sms_dispatch_recipients").select("status,money_spent").eq("dispatch_id",dispatch.id);if(statusError)throw statusError;const delivered=(statuses||[]).filter((r:any)=>r.status==="delivered").length,notDelivered=(statuses||[]).filter((r:any)=>r.status==="not_delivered").length,sent=(statuses||[]).filter((r:any)=>["sent","delivered","not_delivered"].includes(r.status)).length,totalCost=(statuses||[]).reduce((sum:number,r:any)=>sum+Number(r.money_spent||0),0),finalStatus=notDelivered&&delivered?"partial":notDelivered&&!delivered?"partial":sent?"sent":"submitted",terminal=delivered+notDelivered>=Number(dispatch.audience_count||0)&&Number(dispatch.audience_count||0)>0;let addressBookId=Number(dispatch.sendpulse_addressbook_id||0);if(terminal&&addressBookId){await spJson(key,`https://api.sendpulse.com/addressbooks/${addressBookId}`,{method:"DELETE"}).catch(()=>null);addressBookId=0}await db.from("vacleaner_sms_dispatches").update({status:finalStatus,sent_count:sent,delivered_count:delivered,not_delivered_count:notDelivered,total_cost:totalCost||Number(payload.company_price||0)||null,currency:String(payload.currency||"")||null,last_synced_at:now,sendpulse_addressbook_id:addressBookId||null}).eq("id",dispatch.id);return json({ok:true,dispatchId:dispatch.id,sent,delivered,notDelivered,totalCost:totalCost||Number(payload.company_price||0)||0,currency:String(payload.currency||"")})
    }

    if(!validUuid(campaignId))return json({error:"invalid_campaign"},400);
    if(action==="archive_campaign"){
      const now=new Date().toISOString();const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,status,starts_at,ends_at").eq("id",campaignId).maybeSingle();if(campaignError)throw campaignError;if(!campaign)return json({error:"invalid_campaign"},404);const endedAt=campaign.ends_at&&new Date(campaign.ends_at).getTime()<Date.now()?campaign.ends_at:now;const {error:updateError}=await db.from("vacleaner_campaigns").update({status:"ended",ends_at:endedAt,updated_at:now}).eq("id",campaignId);if(updateError)throw updateError;await db.from("vacleaner_promo_codes").update({active:false}).eq("campaign_id",campaignId);return json({ok:true,status:"ended"});
    }
    if(action==="delete_campaign"){
      const {count,error:historyError}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("campaign_id",campaignId);if(historyError)throw historyError;if(Number(count||0)>0)return json({error:"campaign_has_history"},409);const {error}=await db.from("vacleaner_campaigns").delete().eq("id",campaignId);if(error)throw error;return json({ok:true,deleted:true});
    }
    return json({error:"invalid_action"},400);
  }catch(error){const message=error instanceof Error?error.message:String(error||"service_error");if(message==="campaign_inactive")return json({error:"campaign_inactive"},409);console.error("vacleaner-campaigns-v1",message);return json({error:"service_error"},500)}
});
