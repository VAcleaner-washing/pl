import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const BONUS_VALID_DAYS=21;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const normalizePromoCode=(value:unknown)=>String(value??"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,32);
const requestIp=(req:Request)=>String(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim();
const sha256=async(value:string)=>{const bytes=new TextEncoder().encode(`vacleaner-phone-promo-v1:${value}`);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("")};
async function rateLimit(db:any,scope:string,identity:string,limit:number,windowSeconds:number){const {data,error}=await db.rpc("consume_public_endpoint_rate_limit",{p_scope:scope,p_ip_hash:await sha256(identity),p_limit:limit,p_window_seconds:windowSeconds});if(error)throw error;return data===true}

async function qualifyingDispatch(db:any,promoCode:any,phone:string){
  const {data:recipients,error}=await db.from("vacleaner_sms_dispatch_recipients")
    .select("dispatch_id,customer_phone,promo_code,status,created_at")
    .eq("customer_phone",phone).ilike("promo_code",String(promoCode.code||""))
    .in("status",["submitted","sent","delivered"]).order("created_at",{ascending:false}).limit(20);
  if(error)throw error;
  const dispatchIds=[...new Set((recipients||[]).map((r:any)=>String(r.dispatch_id||"")).filter(Boolean))];
  if(!dispatchIds.length)return null;
  const {data:dispatches,error:dispatchError}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,status,sent_at,created_at").in("id",dispatchIds);
  if(dispatchError)throw dispatchError;
  const byId=new Map((dispatches||[]).map((r:any)=>[String(r.id),r]));
  for(const recipient of recipients||[]){const dispatch=byId.get(String(recipient.dispatch_id||""));if(dispatch&&String(dispatch.campaign_id||"")===String(promoCode.campaign_id||""))return dispatch}
  return null;
}

async function promoPayload(db:any,promoCode:any,campaign:any,source:string){
  const {count:uses,error}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("promo_code_id",promoCode.id);if(error)throw error;
  if(Number(uses||0)>=Number(promoCode.usage_limit||1))return null;
  const now=Date.now(),codeEnds=promoCode.expires_at?new Date(promoCode.expires_at).getTime():0;
  if(!promoCode.active||(codeEnds&&codeEnds<=now)||campaign.status!=="active")return null;
  const personalized=["return","personal"].includes(String(campaign.campaign_type||""));
  const starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,ends=campaign.ends_at?new Date(campaign.ends_at).getTime():0;
  if((starts&&starts>now)||(!personalized&&ends&&ends<=now))return null;
  return {code:String(promoCode.code),campaignId:String(campaign.id),campaignName:String(campaign.name||"Персональний бонус"),campaignType:String(campaign.campaign_type||""),discountType:String(campaign.discount_type||"percent"),discountValue:Number(campaign.discount_value||0),expiresAt:promoCode.expires_at||null,activatedAt:promoCode.activated_at||null,activationSource:String(promoCode.activation_source||source),source};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!key)return json({error:"service_unavailable"},503);
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),body=await req.json().catch(()=>({})) as Record<string,unknown>,action=String(body.action||"");
    const ip=requestIp(req);

    if(action==="activate"){
      const code=normalizePromoCode(body.promoCode);if(!/^VA-[A-Z0-9]{7}$/.test(code))return json({error:"invalid_promo"},400);
      if(!await rateLimit(db,"promo-activate:ip",ip,90,900)||!await rateLimit(db,"promo-activate:code",code,20,900))return json({error:"rate_limited"},429);
      const {data:promoCode,error:codeError}=await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source,activation_dispatch_id").ilike("code",code).maybeSingle();
      if(codeError)throw codeError;if(!promoCode||!promoCode.customer_phone)return json({error:"invalid_promo"},404);
      const phone=normalizePhone(promoCode.customer_phone);if(!phone)return json({error:"invalid_promo"},404);
      const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,starts_at,ends_at,issuance_ends_at").eq("id",promoCode.campaign_id).maybeSingle();if(campaignError)throw campaignError;
      if(!campaign||!["return","personal"].includes(String(campaign.campaign_type||"")))return json({error:"invalid_promo"},404);
      const existing=await promoPayload(db,promoCode,campaign,"sms_link");if(existing)return json({ok:true,alreadyActivated:true,promo:existing});
      const now=Date.now(),starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,issuanceEnd=campaign.issuance_ends_at?new Date(campaign.issuance_ends_at).getTime():(campaign.ends_at?new Date(campaign.ends_at).getTime():0);
      if(campaign.status!=="active"||(starts&&starts>now)||(issuanceEnd&&issuanceEnd<=now))return json({error:"activation_window_expired"},409);
      const dispatch=await qualifyingDispatch(db,promoCode,phone);if(!dispatch)return json({error:"sms_not_issued"},409);
      const {count:uses,error:usesError}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("promo_code_id",promoCode.id);if(usesError)throw usesError;if(Number(uses||0)>0)return json({error:"promo_used"},409);
      const activatedAt=new Date(),expiresAt=new Date(activatedAt.getTime()+BONUS_VALID_DAYS*86400000),patch={active:true,activated_at:activatedAt.toISOString(),activation_source:"sms_link",activation_dispatch_id:dispatch.id,activated_by:null,expires_at:expiresAt.toISOString()};
      const campaignEnd=campaign.ends_at?new Date(campaign.ends_at).getTime():0;if(!campaignEnd||campaignEnd<expiresAt.getTime()){const {error:extendError}=await db.from("vacleaner_campaigns").update({ends_at:expiresAt.toISOString(),updated_at:activatedAt.toISOString()}).eq("id",campaign.id);if(extendError)throw extendError}
      const {data:activated,error:activateError}=await db.from("vacleaner_promo_codes").update(patch).eq("id",promoCode.id).eq("active",false).select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source").maybeSingle();if(activateError)throw activateError;
      const row=activated||await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source").eq("id",promoCode.id).single().then((x:any)=>x.data);
      const payload=await promoPayload(db,row,campaign,"sms_link");if(!payload)return json({error:"promo_unavailable"},409);
      return json({ok:true,alreadyActivated:false,validDays:BONUS_VALID_DAYS,promo:payload});
    }

    if(action!=="lookup")return json({error:"invalid_action"},400);
    const phone=normalizePhone(body.customerPhone);if(!phone)return json({promo:null});
    if(!await rateLimit(db,"phone-promo:ip",ip,90,900))return json({error:"rate_limited"},429);
    if(!await rateLimit(db,"phone-promo:phone",phone,20,900))return json({error:"rate_limited"},429);
    const {data:codes,error:codesError}=await db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,activated_at,activation_source").eq("customer_phone",phone).eq("active",true).order("activated_at",{ascending:false,nullsFirst:false}).limit(20);if(codesError)throw codesError;
    for(const promoCode of codes||[]){
      const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,starts_at,ends_at,issuance_ends_at").eq("id",promoCode.campaign_id).maybeSingle();if(campaignError)throw campaignError;if(!campaign)continue;
      if(["return","personal"].includes(String(campaign.campaign_type||""))&&!await qualifyingDispatch(db,promoCode,phone))continue;
      const payload=await promoPayload(db,promoCode,campaign,"phone");if(payload)return json({promo:payload});
    }
    return json({promo:null});
  }catch(error){console.error("vacleaner-phone-promo-v1",error instanceof Error?error.message:error);return json({error:"service_error"},500)}
});
