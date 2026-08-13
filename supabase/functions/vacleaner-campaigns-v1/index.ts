import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const validUuid=(value:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??""));

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),token=(request.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
    if(!url||!service||!token)return json({error:"unauthorized"},401);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userError}=await db.auth.getUser(token);if(userError||!userData.user)return json({error:"unauthorized"},401);
    const {data:admin,error:adminError}=await db.from("vacleaner_admin_users").select("user_id").eq("user_id",userData.user.id).maybeSingle();if(adminError)throw adminError;if(!admin)return json({error:"forbidden"},403);
    const body=await request.json() as Record<string,unknown>,action=String(body.action??""),campaignId=String(body.campaignId??"");
    if(!validUuid(campaignId))return json({error:"invalid_campaign"},400);
    if(action==="archive_campaign"){
      const now=new Date().toISOString();
      const {data:campaign,error:campaignError}=await db.from("vacleaner_campaigns").select("id,status,starts_at,ends_at").eq("id",campaignId).maybeSingle();if(campaignError)throw campaignError;if(!campaign)return json({error:"invalid_campaign"},404);
      const endedAt=campaign.ends_at&&new Date(campaign.ends_at).getTime()<Date.now()?campaign.ends_at:now;
      const {error:updateError}=await db.from("vacleaner_campaigns").update({status:"ended",ends_at:endedAt,updated_at:now}).eq("id",campaignId);if(updateError)throw updateError;
      await db.from("vacleaner_promo_codes").update({active:false}).eq("campaign_id",campaignId);
      return json({ok:true,status:"ended"});
    }
    if(action==="delete_campaign"){
      const {count,error:historyError}=await db.from("vacleaner_promo_redemptions").select("id",{count:"exact",head:true}).eq("campaign_id",campaignId);if(historyError)throw historyError;if(Number(count||0)>0)return json({error:"campaign_has_history"},409);
      const {error}=await db.from("vacleaner_campaigns").delete().eq("id",campaignId);if(error)throw error;return json({ok:true,deleted:true});
    }
    return json({error:"invalid_action"},400);
  }catch(error){console.error("vacleaner-campaigns-v1",error instanceof Error?error.message:error);return json({error:"service_error"},500)}
});
