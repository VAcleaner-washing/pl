import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const requestIp=(req:Request)=>String(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown").trim();
const sha256=async(value:string)=>{const bytes=new TextEncoder().encode(`vacleaner-sms-consent-v1:${value}`),digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("")};
async function limited(db:any,scope:string,identity:string,limit:number){const {data,error}=await db.rpc("consume_public_endpoint_rate_limit",{p_scope:scope,p_ip_hash:await sha256(identity),p_limit:limit,p_window_seconds:3600});if(error)throw error;return data===true}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!service)return json({error:"service_unavailable"},503);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),body=await req.json() as Record<string,unknown>,action=String(body.action||""),phone=normalizePhone(body.customerPhone),ip=requestIp(req);
    if(!await limited(db,`vacleaner-sms-consent:${action}:ip`,ip,20))return json({error:"rate_limited"},429);
    if(action==="opt_out"){
      if(!phone)return json({success:true});
      if(!await limited(db,"vacleaner-sms-consent:opt_out:phone",phone,6))return json({success:true});
      const now=new Date().toISOString();const {error}=await db.from("vacleaner_customers").update({marketing_sms_consent:false,marketing_sms_opted_out_at:now,marketing_sms_consent_source:"public_opt_out",updated_at:now}).eq("phone",phone);if(error)throw error;return json({success:true});
    }
    if(action==="opt_in"){
      const bookingCode=String(body.bookingCode||"").trim().slice(0,40);if(!phone||!/^VAC-[A-Z0-9-]{6,32}$/i.test(bookingCode))return json({error:"invalid_request"},400);
      if(!await limited(db,"vacleaner-sms-consent:opt_in:phone",phone,6))return json({error:"rate_limited"},429);
      const since=new Date(Date.now()-30*60*1000).toISOString();const {data:booking,error:bookingError}=await db.from("vacleaner_bookings").select("id").eq("booking_code",bookingCode).eq("customer_phone",phone).gte("created_at",since).maybeSingle();if(bookingError)throw bookingError;if(!booking)return json({error:"booking_not_found"},404);
      const now=new Date().toISOString();const {error}=await db.from("vacleaner_customers").update({marketing_sms_consent:true,marketing_sms_consent_at:now,marketing_sms_consent_source:"public_booking",marketing_sms_opted_out_at:null,updated_at:now}).eq("phone",phone);if(error)throw error;return json({success:true});
    }
    return json({error:"invalid_action"},400);
  }catch(error){console.error("vacleaner-sms-consent-v1",error instanceof Error?error.message:error);return json({error:"service_error"},500)}
});
