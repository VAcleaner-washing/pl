import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

// The fleet API is *never* public. The validated admin user is the sole caller.
// Database unit-status writes are serialized with the existing reservation mutex.
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff",
};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"},
});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const codes=new Set(["puzzi","sc2","jimmy","abir"]);
const statuses=new Set(["ready","repair","retired"]);
const clean=(v:unknown,max=300)=>String(v??"").trim().slice(0,max);

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL");
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!url||!service)return json({error:"service_unavailable"},503);
  if(!token)return json({error:"unauthorized"},401);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await db.auth.getUser(token);
  if(userError||!userData.user)return json({error:"unauthorized"},401);
  const {data:admin,error:adminError}=await db.from("admin_users")
    .select("user_id").eq("user_id",userData.user.id).maybeSingle();
  if(adminError||!admin)return json({error:"forbidden"},403);
  const input:unknown=await request.json().catch(()=>null);
  if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_equipment_change"},400);
  const body=input as Record<string,unknown>;
  const action=String(body.action||"");
  if(action==="list"){
    const [fleet,units,issued]=await Promise.all([
      db.from("vacleaner_inventory").select("resource_code,label,capacity,active,updated_at")
        .eq("active",true).order("resource_code"),
      db.from("vacleaner_equipment_units")
        .select("id,resource_code,unit_number,status,note,created_at,updated_at")
        .order("resource_code").order("unit_number"),
      db.from("vacleaner_bookings")
        .select("id,vacleaner_booking_resources(resource_code,quantity)")
        .eq("status","issued").limit(1000),
    ]);
    if(fleet.error||units.error||issued.error){
      console.error("equipment_list_failed",fleet.error?.code,units.error?.code,issued.error?.code);
      return json({error:"equipment_read_failed"},503);
    }
    const issuedCount:Record<string,number>={};
    for(const booking of issued.data||[]){
      for(const row of booking.vacleaner_booking_resources||[]){
        const code=String(row.resource_code||"");
        issuedCount[code]=(issuedCount[code]||0)+Number(row.quantity||0);
      }
    }
    return json({inventory:fleet.data||[],units:units.data||[],issued:issuedCount});
  }
  if(action==="set_status"){
    const unitId=clean(body.unitId,40);
    const status=String(body.status||"");
    const note=clean(body.note);
    if(!uuid.test(unitId)||!statuses.has(status)){
      return json({error:"invalid_equipment_change"},400);
    }
    const {data,error}=await db.rpc("vacleaner_admin_set_equipment_unit_status",{
      p_unit_id:unitId,p_status:status,p_note:note,p_actor_id:userData.user.id
    });
    if(error){
      const msg=String(error.message||"");
      const known=["equipment_unit_not_found","equipment_inventory_missing","equipment_inventory_mismatch",
        "equipment_reserved_overlap","invalid_equipment_change"];
      const key=known.find(x=>msg.includes(x));
      if(key)return json({error:key},409);
      console.error("equipment_status_failed",error.code);
      return json({error:"equipment_save_failed"},500);
    }
    return json({result:data});
  }
  if(action==="add_unit"){
    const resourceCode=String(body.resourceCode||"");
    const requestId=clean(body.requestId,40);
    if(!codes.has(resourceCode)||!uuid.test(requestId))return json({error:"invalid_equipment_change"},400);
    const {data,error}=await db.rpc("vacleaner_admin_add_equipment_unit",{
      p_resource_code:resourceCode,p_note:clean(body.note),p_actor_id:userData.user.id,p_request_id:requestId
    });
    if(error){
      const msg=String(error.message||"");
      const known=["equipment_inventory_missing","equipment_inventory_mismatch",
        "equipment_fleet_limit","invalid_equipment_change"];
      const key=known.find(x=>msg.includes(x));
      if(key)return json({error:key},409);
      console.error("equipment_add_failed",error.code);
      return json({error:"equipment_save_failed"},500);
    }
    return json({result:data});
  }
  return json({error:"unknown_action"},400);
});
