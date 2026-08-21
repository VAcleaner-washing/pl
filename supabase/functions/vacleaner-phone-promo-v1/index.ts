import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const requestIp=(req:Request)=>String(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim();
const sha256=async(value:string)=>{const bytes=new TextEncoder().encode(`vacleaner-phone-promo-v1:${value}`);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("")};
async function rateLimit(db:any,scope:string,identity:string,limit:number,windowSeconds:number){const {data,error}=await db.rpc("consume_public_endpoint_rate_limit",{p_scope:scope,p_ip_hash:await sha256(identity),p_limit:limit,p_window_seconds:windowSeconds});if(error)throw error;return data===true}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!key)return json({error:"service_unavailable"},503);
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})) as Record<string,unknown>;
    if(String(body.action||"")!=="lookup")return json({error:"invalid_action"},400);
    const phone=normalizePhone(body.customerPhone);
    if(!phone)return json({promo:null});
    const ip=requestIp(req);
    if(!await rateLimit(db,"phone-promo:ip",ip,90,900))return json({error:"rate_limited"},429);
    if(!await rateLimit(db,"phone-promo:phone",phone,20,900))return json({error:"rate_limited"},429);

    const {data:sent,error:sentError}=await db.from("vacleaner_sms_dispatch_recipients")
      .select("promo_code,status,created_at,dispatch_id")
      .eq("customer_phone",phone)
      .in("status",["submitted","sent","delivered"])
      .order("created_at",{ascending:false})
      .limit(12);
    if(sentError)throw sentError;
    const dispatchIds=[...new Set((sent||[]).map((row:any)=>String(row.dispatch_id||"")).filter(Boolean))];
    const dispatchById=new Map<string,any>();
    if(dispatchIds.length){
      const {data:dispatches,error:dispatchError}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,message_body,status,sent_at").in("id",dispatchIds);
      if(dispatchError)throw dispatchError;for(const row of dispatches||[])dispatchById.set(String(row.id),row);
    }
    const codeFromMessage=(value:unknown)=>{const text=String(value||"");const query=text.match(/[?&]promo=([A-Z0-9_-]+)/i)?.[1];if(query)return String(query).toUpperCase();const hash=text.match(/vacleaner\.pp\.ua\/b#([A-Z0-9_-]+)/i)?.[1];if(!hash)return "";const clean=String(hash).toUpperCase();return clean.startsWith("VA-")?clean:`VA-${clean}`};
    const seen=new Set<string>(),now=Date.now();
    for(const row of sent||[]){
      const dispatch=dispatchById.get(String(row.dispatch_id||""));
      const code=(String(row.promo_code||"").trim().toUpperCase()||codeFromMessage(dispatch?.message_body));
      if(!code||seen.has(code))continue;seen.add(code);
      const {data:promoCode,error:codeError}=await db.from("vacleaner_promo_codes")
        .select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit")
        .ilike("code",code).maybeSingle();
      if(codeError)throw codeError;
      if(!promoCode||!promoCode.active||(promoCode.customer_phone&&promoCode.customer_phone!==phone))continue;
      if(promoCode.expires_at&&new Date(promoCode.expires_at).getTime()<=now)continue;
      const [{data:campaign,error:campaignError},{count:uses,error:usesError}]=await Promise.all([
        db.from("vacleaner_campaigns").select("id,name,campaign_type,status,discount_type,discount_value,starts_at,ends_at").eq("id",promoCode.campaign_id).maybeSingle(),
        db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("promo_code_id",promoCode.id),
      ]);
      if(campaignError||usesError)throw campaignError||usesError;
      if(!campaign||campaign.status!=="active"||Number(uses||0)>=Number(promoCode.usage_limit||1))continue;
      const starts=campaign.starts_at?new Date(campaign.starts_at).getTime():0,ends=campaign.ends_at?new Date(campaign.ends_at).getTime():0;
      if((starts&&starts>now)||(ends&&ends<=now))continue;
      return json({promo:{code:String(promoCode.code),campaignId:String(campaign.id),campaignName:String(campaign.name||"Персональний бонус"),campaignType:String(campaign.campaign_type||""),discountType:String(campaign.discount_type||"percent"),discountValue:Number(campaign.discount_value||0),expiresAt:promoCode.expires_at||campaign.ends_at||null,source:"sms_phone"}});
    }
    return json({promo:null});
  }catch(error){console.error("vacleaner-phone-promo-v1",error instanceof Error?error.message:error);return json({error:"service_error"},500)}
});
