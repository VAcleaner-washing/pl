import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const validUuid=(value:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??""));

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
    if(!url||!service||!token)return json({error:"unauthorized"},401);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:user,error:userError}=await db.auth.getUser(token);if(userError||!user.user)return json({error:"unauthorized"},401);
    const {data:admin,error:adminError}=await db.from("vacleaner_admin_users").select("user_id").eq("user_id",user.user.id).maybeSingle();if(adminError)throw adminError;if(!admin)return json({error:"forbidden"},403);
    const body=await req.json().catch(()=>({})) as Record<string,unknown>;
    if(String(body.action||"")!=="dispatch_recipients")return json({error:"invalid_action"},400);
    const id=String(body.dispatchId||"");if(!validUuid(id))return json({error:"invalid_dispatch"},400);
    const {data:dispatch,error:de}=await db.from("vacleaner_sms_dispatches").select("id,campaign_id,audience_count,status,message_body,created_at,sent_at").eq("id",id).maybeSingle();if(de)throw de;if(!dispatch)return json({error:"invalid_dispatch"},404);
    const {data:rows,error:re}=await db.from("vacleaner_sms_dispatch_recipients")
      .select("id,customer_name,customer_phone,status,status_explain,promo_code,promo_link,sendpulse_campaign_id,money_spent,created_at,updated_at")
      .eq("dispatch_id",id).order("created_at",{ascending:true}).limit(500);
    if(re)throw re;
    const codeFromMessage=(value:unknown)=>{const text=String(value||"");const query=text.match(/[?&]promo=([A-Z0-9_-]+)/i)?.[1];if(query)return String(query).toUpperCase();return ""};
    const commonCode=codeFromMessage(dispatch.message_body);
    const recipients=(rows||[]).map((row:any)=>{const code=String(row.promo_code||commonCode||"");const link=String(row.promo_link||(code?`vacleaner.pp.ua/b?promo=${code}`:"")||"");return {...row,promo_code:code||null,promo_link:link||null}});
    return json({dispatch,recipients});
  }catch(error){console.error("vacleaner-sms-audit-v1",error instanceof Error?error.message:error);return json({error:"service_error"},500)}
});
