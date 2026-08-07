import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const cleanText=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[<>]/g,"").slice(0,max):"";
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const safeBooking=(row:Record<string,unknown>)=>{const copy={...row};delete copy.ip_hash;return copy};

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),auth=request.headers.get("Authorization")??"",token=auth.replace(/^Bearer\s+/i,"");
    if(!url||!service||!token)return json({error:"unauthorized"},401);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userError}=await db.auth.getUser(token);if(userError||!userData.user)return json({error:"unauthorized"},401);
    const {data:admin}=await db.from("admin_users").select("user_id").eq("user_id",userData.user.id).maybeSingle();if(!admin)return json({error:"forbidden"},403);
    const body=await request.json() as Record<string,unknown>,action=String(body.action??"");
    if(action==="list"){
      const {data,error}=await db.from("vacleaner_bookings").select("*,vacleaner_booking_resources(resource_code,quantity)").order("start_at",{ascending:false}).limit(1000);
      if(error)throw error;return json({bookings:(data??[]).map((row:any)=>safeBooking(row))});
    }
    if(action==="clients"){
      const {data,error}=await db.from("vacleaner_customers").select("phone,name,telegram,address,document_type,document_number,document_verified_at,document_updated_at,created_at,updated_at").order("updated_at",{ascending:false}).limit(1000);
      if(error)throw error;return json({customers:data??[]});
    }
    if(action==="save_customer"){
      const originalPhone=normalizePhone(body.originalPhone),customerPhone=normalizePhone(body.customerPhone),customerName=cleanText(body.customerName,120);
      if(!originalPhone||!customerPhone||customerName.length<2)return json({error:"invalid_customer_data"},400);
      const {data:existing,error:existingError}=await db.from("vacleaner_customers").select("*").eq("phone",originalPhone).maybeSingle();if(existingError)throw existingError;
      if(customerPhone!==originalPhone){const {data:conflict,error}=await db.from("vacleaner_customers").select("phone").eq("phone",customerPhone).maybeSingle();if(error)throw error;if(conflict)return json({error:"customer_phone_exists"},409)}
      const now=new Date().toISOString(),documentNumber=cleanText(body.documentNumber,80),requestedType=cleanText(body.documentType,40),documentType=documentNumber&&["Паспорт","ID-картка","Водійське посвідчення"].includes(requestedType)?requestedType:documentNumber?"Паспорт":null,verified=Boolean(documentNumber&&body.identityVerified===true);
      const row:Record<string,unknown>={phone:customerPhone,name:customerName,telegram:cleanText(body.customerTelegram,80)||null,address:cleanText(body.customerAddress,220)||null,document_type:documentType,document_number:documentNumber||null,document_verified_at:verified?(existing?.document_verified_at||now):null,document_updated_at:documentNumber!==String(existing?.document_number||"")?now:(existing?.document_updated_at||(documentNumber?now:null)),updated_at:now};
      if(existing){const {error}=await db.from("vacleaner_customers").update(row).eq("phone",originalPhone);if(error)throw error}else{const {error}=await db.from("vacleaner_customers").upsert({...row,created_at:now},{onConflict:"phone"});if(error)throw error}
      const {error:bookingError}=await db.from("vacleaner_bookings").update({customer_name:customerName,customer_phone:customerPhone,customer_telegram:row.telegram,updated_at:now}).eq("customer_phone",originalPhone);if(bookingError)throw bookingError;
      return json({customer:{...row}});
    }
    return json({error:"invalid_action"},400);
  }catch(error){console.error("vacleaner-admin-data-v1",error instanceof Error?error.message:error);return json({error:"service_error"},500)}
});
