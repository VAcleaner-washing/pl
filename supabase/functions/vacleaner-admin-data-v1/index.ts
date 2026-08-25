import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const cleanText=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/[<>]/g,"").slice(0,max):"";
const normalizePhone=(value:unknown)=>{const digits=String(value??"").replace(/\D/g,"");if(digits.length===10&&digits.startsWith("0"))return `+38${digits}`;if(digits.length===12&&digits.startsWith("380"))return `+${digits}`;return ""};
const safeBooking=(row:Record<string,unknown>)=>{const copy={...row};delete copy.ip_hash;return copy};
const normalizePromoCode=(value:unknown)=>cleanText(value,32).toUpperCase().replace(/[^A-Z0-9_-]/g,"");
const validUuid=(value:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??""));
const EXPENSE_CATEGORIES=new Set(["chemistry","consumables","repair","delivery","advertising","fees","utilities","other","equipment","improvement"]);
const INVESTMENT_CATEGORIES=new Set(["equipment","improvement"]);
const validIsoDate=(value:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(value??""))&&!Number.isNaN(Date.parse(`${value}T12:00:00Z`));
const safeExpense=(row:Record<string,unknown>)=>({id:row.id,spent_on:row.spent_on,amount:row.amount,category:row.category,cost_type:row.cost_type,vendor:row.vendor,note:row.note,created_at:row.created_at,updated_at:row.updated_at});
async function personalPromoCode(campaignId:string,phone:string){const bytes=new TextEncoder().encode(`${campaignId}:${phone}`),hash=await crypto.subtle.digest("SHA-256",bytes),hex=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();return `VA-${hex.slice(0,7)}`}
async function returnEligibleCustomers(db:any,dormantDays:number,minCompletedOrders:number){
  const cutoff=new Date(Date.now()-Math.max(1,dormantDays)*86400000).toISOString().slice(0,10);
  const [{data:completed,error:completedError},{data:active,error:activeError}]=await Promise.all([
    db.from("vacleaner_bookings").select("customer_phone,customer_name,return_date").eq("status","completed").order("return_date",{ascending:false}).limit(5000),
    db.from("vacleaner_bookings").select("customer_phone").in("status",["waiting_payment","confirmed","issued"]).limit(5000),
  ]);
  if(completedError||activeError)throw completedError||activeError;
  const activePhones=new Set((active||[]).map((r:any)=>normalizePhone(r.customer_phone)).filter(Boolean)),stats=new Map<string,{phone:string,name:string,count:number,last:string}>();
  for(const row of completed||[]){const phone=normalizePhone((row as any).customer_phone);if(!phone)continue;const rentalDate=String((row as any).return_date||"");const cur=stats.get(phone)||{phone,name:cleanText((row as any).customer_name,120),count:0,last:rentalDate};cur.count+=1;if(rentalDate>cur.last){cur.last=rentalDate;cur.name=cleanText((row as any).customer_name,120)||cur.name}stats.set(phone,cur)}
  return [...stats.values()].filter(row=>!activePhones.has(row.phone)&&row.count>=Math.max(1,minCompletedOrders)&&row.last&&row.last<=cutoff);
}

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
      const [{data:bookings,error:bookingError},{data:expenses,error:expenseError}]=await Promise.all([
        db.from("vacleaner_bookings").select("*,vacleaner_booking_resources(resource_code,quantity)").order("start_at",{ascending:false}).limit(1000),
        db.from("vacleaner_expenses").select("id,spent_on,amount,category,cost_type,vendor,note,created_at,updated_at").is("archived_at",null).order("spent_on",{ascending:false}).order("created_at",{ascending:false}).limit(5000),
      ]);
      if(bookingError||expenseError)throw bookingError||expenseError;
      return json({bookings:(bookings??[]).map((row:any)=>safeBooking(row)),expenses:(expenses??[]).map((row:any)=>safeExpense(row))});
    }
    if(action==="save_expense"){
      const expenseId=String(body.expenseId??""),spentOn=String(body.spentOn??""),category=String(body.category??""),amount=Math.round(Number(body.amount)||0);
      if((expenseId&&!validUuid(expenseId))||!validIsoDate(spentOn)||spentOn>new Date().toISOString().slice(0,10)||!EXPENSE_CATEGORIES.has(category)||amount<1||amount>10000000)return json({error:"invalid_expense"},400);
      const now=new Date().toISOString(),costType=INVESTMENT_CATEGORIES.has(category)?"investment":"operating",row={spent_on:spentOn,amount,category,cost_type:costType,vendor:cleanText(body.vendor,120)||null,note:cleanText(body.note,500)||null,updated_by:userData.user.id,updated_at:now};
      if(expenseId){const {data,error}=await db.from("vacleaner_expenses").update(row).eq("id",expenseId).is("archived_at",null).select("id,spent_on,amount,category,cost_type,vendor,note,created_at,updated_at").maybeSingle();if(error)throw error;if(!data)return json({error:"expense_not_found"},404);return json({expense:safeExpense(data)})}
      const {data,error}=await db.from("vacleaner_expenses").insert({...row,created_by:userData.user.id}).select("id,spent_on,amount,category,cost_type,vendor,note,created_at,updated_at").single();if(error||!data)throw error||new Error("expense_insert_failed");return json({expense:safeExpense(data)});
    }
    if(action==="archive_expense"){
      const expenseId=String(body.expenseId??"");if(!validUuid(expenseId))return json({error:"invalid_expense"},400);const now=new Date().toISOString();
      const {data,error}=await db.from("vacleaner_expenses").update({archived_at:now,archived_by:userData.user.id,updated_at:now,updated_by:userData.user.id}).eq("id",expenseId).is("archived_at",null).select("id").maybeSingle();if(error)throw error;if(!data)return json({error:"expense_not_found"},404);return json({ok:true});
    }
    if(action==="clients"){
      const {data,error}=await db.from("vacleaner_customers").select("phone,name,telegram,address,document_type,document_number,document_verified_at,document_updated_at,document_photo_path,document_photo_name,document_photo_mime,document_photo_uploaded_at,created_at,updated_at").order("updated_at",{ascending:false}).limit(1000);
      if(error)throw error;return json({customers:data??[]});
    }
    if(action==="health"){
      const [reservationResult,pushConfigResult,pushSubscriptionsResult]=await Promise.all([
        db.rpc("vacleaner_operational_health"),
        db.from("vacleaner_push_config").select("singleton,updated_at").eq("singleton",true).maybeSingle(),
        db.from("vacleaner_push_subscriptions").select("active,last_success_at,last_failure_at,updated_at").eq("active",true),
      ]);
      if(reservationResult.error)throw reservationResult.error;
      if(pushConfigResult.error)throw pushConfigResult.error;
      if(pushSubscriptionsResult.error)throw pushSubscriptionsResult.error;
      const subscriptions=pushSubscriptionsResult.data??[];
      const successTimes=subscriptions.map((row:any)=>row.last_success_at).filter(Boolean).map((value:string)=>new Date(value).getTime()).filter(Number.isFinite);
      const failureTimes=subscriptions.map((row:any)=>row.last_failure_at).filter(Boolean).map((value:string)=>new Date(value).getTime()).filter(Number.isFinite);
      const lastSuccess=successTimes.length?Math.max(...successTimes):0,lastFailure=failureTimes.length?Math.max(...failureTimes):0;
      return json({
        checkedAt:new Date().toISOString(),
        reservation:reservationResult.data??{healthy:false},
        push:{
          configReady:Boolean(pushConfigResult.data),
          activeSubscriptions:subscriptions.length,
          lastSuccessAt:lastSuccess?new Date(lastSuccess).toISOString():null,
          lastFailureAt:lastFailure?new Date(lastFailure).toISOString():null,
          healthy:Boolean(pushConfigResult.data&&subscriptions.length>0&&lastSuccess>0&&lastSuccess>=lastFailure),
        },
      });
    }
    if(action==="campaigns"){
      const [{data:campaigns,error:campaignError},{data:codes,error:codesError},{data:redemptions,error:redemptionError},{data:dispatches,error:dispatchError}]=await Promise.all([
        db.from("vacleaner_campaigns").select("*").order("created_at",{ascending:false}).limit(100),
        db.from("vacleaner_promo_codes").select("id,campaign_id,code,customer_phone,active,expires_at,usage_limit,created_at").order("created_at",{ascending:false}).limit(1500),
        db.from("vacleaner_promo_redemptions").select("id,campaign_id,promo_code_id,booking_id,customer_phone,discount_amount,base_before_discount,created_at").order("created_at",{ascending:false}).limit(3000),
        db.from("vacleaner_sms_dispatches").select("id,campaign_id").not("campaign_id","is",null).order("created_at",{ascending:false}).limit(5000),
      ]);
      if(campaignError||codesError||redemptionError||dispatchError)throw campaignError||codesError||redemptionError||dispatchError;
      const dispatchCampaign=new Map<string,string>(),dispatchCountByCampaign=new Map<string,number>();
      for(const row of dispatches||[]){const campaignId=String((row as any).campaign_id||"");if(!campaignId)continue;dispatchCampaign.set(String((row as any).id),campaignId);dispatchCountByCampaign.set(campaignId,(dispatchCountByCampaign.get(campaignId)||0)+1)}
      const dispatchIds=[...dispatchCampaign.keys()];let smsRecipients:any[]=[];
      if(dispatchIds.length){const {data:rows,error}=await db.from("vacleaner_sms_dispatch_recipients").select("dispatch_id,customer_phone,status").in("dispatch_id",dispatchIds).in("status",["submitted","sent","delivered"]).limit(20000);if(error)throw error;smsRecipients=rows||[]}
      const smsPhonesByCampaign=new Map<string,Set<string>>();
      for(const row of smsRecipients){const campaignId=dispatchCampaign.get(String(row.dispatch_id||"")),phone=normalizePhone(row.customer_phone);if(!campaignId||!phone)continue;let phones=smsPhonesByCampaign.get(campaignId);if(!phones){phones=new Set<string>();smsPhonesByCampaign.set(campaignId,phones)}phones.add(phone)}
      const bookingIds=[...new Set((redemptions||[]).map((r:any)=>r.booking_id).filter(Boolean))];let bookingMap=new Map<string,any>();
      if(bookingIds.length){const {data:rows,error}=await db.from("vacleaner_bookings").select("id,total_amount,status").in("id",bookingIds);if(error)throw error;bookingMap=new Map((rows||[]).map((r:any)=>[r.id,r]))}
      const enriched=(campaigns||[]).map((campaign:any)=>{const assigned=(codes||[]).filter((c:any)=>c.campaign_id===campaign.id),activeAssigned=assigned.filter((c:any)=>c.active===true),targetPhone=String(campaign.campaign_type||"")==="personal"?(assigned.map((c:any)=>normalizePhone(c.customer_phone)).find(Boolean)||""):"",personalAssigned=activeAssigned.filter((c:any)=>normalizePhone(c.customer_phone)).length,used=(redemptions||[]).filter((r:any)=>r.campaign_id===campaign.id),completedUses=used.filter((r:any)=>bookingMap.get(r.booking_id)?.status==='completed'),revenue=completedUses.reduce((sum:number,r:any)=>sum+Number(bookingMap.get(r.booking_id)?.total_amount||0),0),discountGiven=used.reduce((sum:number,r:any)=>sum+Number(r.discount_amount||0),0),smsPhones=smsPhonesByCampaign.get(campaign.id)||new Set<string>(),hasSmsDispatch=(dispatchCountByCampaign.get(campaign.id)||0)>0,smsUsed=used.filter((r:any)=>smsPhones.has(normalizePhone(r.customer_phone))),conversionBase=hasSmsDispatch?smsPhones.size:personalAssigned,conversionUses=hasSmsDispatch?smsUsed.length:used.length;return{...campaign,targetPhone,assignedCodes:activeAssigned.length,audienceSize:hasSmsDispatch?smsPhones.size:personalAssigned,smsRecipientCount:smsPhones.size,smsUsedCount:smsUsed.length,conversionBasis:hasSmsDispatch?"sms":"codes",conversionBase,conversionUses,usedCount:used.length,completedUses:completedUses.length,conversion:conversionBase?Math.round(conversionUses/conversionBase*100):null,revenue,discountGiven,codes:activeAssigned.slice(0,500)}});
      return json({campaigns:enriched});
    }
    if(action==="create_campaign"){
      const campaignType=String(body.campaignType||"").toLowerCase(),discountType=body.discountType==="fixed"?"fixed":"percent",discountValue=Math.max(1,Math.min(discountType==="percent"?100:10000,Math.round(Number(body.discountValue)||0))),days=Math.max(1,Math.min(90,Math.round(Number(body.durationDays)||14))),dormantDays=Math.max(1,Math.min(730,Math.round(Number(body.dormantDays)||180))),minCompletedOrders=Math.max(0,Math.min(100,Math.round(Number(body.minCompletedOrders)||0)));
      if(!["return","weekday","product","personal"].includes(campaignType)||!discountValue)return json({error:"invalid_campaign"},400);
      const allowedProducts:string[]=campaignType==="product"?[cleanText(body.productCode,40)].filter(Boolean):[],allowedWeekdays:number[]=campaignType==="weekday"?[1,2,3,4]:[],customerPhone=campaignType==="personal"?normalizePhone(body.customerPhone):"";
      if(campaignType==="product"&&!allowedProducts.length)return json({error:"invalid_campaign"},400);if(campaignType==="personal"&&!customerPhone)return json({error:"invalid_campaign"},400);if(campaignType==="personal"){const [{data:knownCustomer,error:knownCustomerError},{count:knownBookings,error:knownBookingsError}]=await Promise.all([db.from("vacleaner_customers").select("phone").eq("phone",customerPhone).maybeSingle(),db.from("vacleaner_bookings").select("id",{count:"exact",head:true}).eq("customer_phone",customerPhone)]);if(knownCustomerError||knownBookingsError)throw knownCustomerError||knownBookingsError;if(!knownCustomer&&!Number(knownBookings||0))return json({error:"customer_not_found"},404)}
      const startsAt=new Date().toISOString(),endsAt=new Date(Date.now()+days*86400000).toISOString(),name=cleanText(body.name,120)||({return:`RETURN · ${dormantDays}+ днів`,weekday:"WEEKDAY",product:`PRODUCT · ${allowedProducts[0]||""}`,personal:"PERSONAL"} as Record<string,string>)[campaignType];
      const {data:campaign,error}=await db.from("vacleaner_campaigns").insert({name,campaign_type:campaignType,status:"active",discount_type:discountType,discount_value:discountValue,dormant_days:dormantDays,allowed_product_codes:allowedProducts,allowed_weekdays:allowedWeekdays,min_completed_orders:campaignType==="return"?Math.max(1,minCompletedOrders):0,starts_at:startsAt,ends_at:endsAt,usage_limit_per_customer:1,created_by:userData.user.id}).select("*").single();if(error||!campaign)throw error||new Error("campaign_insert_failed");
      let codeRows:any[]=[],eligibleAudience=0;
      const rollback=async()=>{await db.from("vacleaner_campaigns").delete().eq("id",campaign.id)};
      try{
        if(campaignType==="return"){
          const eligible=await returnEligibleCustomers(db,dormantDays,Math.max(1,minCompletedOrders));
          if(!eligible.length){await rollback();return json({error:"no_eligible_customers"},409)}
          eligibleAudience=eligible.length;
          const {error:limitError}=await db.from("vacleaner_campaigns").update({usage_limit_total:null,updated_at:new Date().toISOString()}).eq("id",campaign.id);if(limitError)throw limitError;
        }else if(campaignType==="personal"){
          const code=normalizePromoCode(body.code)||await personalPromoCode(campaign.id,customerPhone);if(code.length<4){await rollback();return json({error:"invalid_promo_code"},400)}
          codeRows=[{campaign_id:campaign.id,code,customer_phone:customerPhone,active:false,expires_at:endsAt,usage_limit:1}];const {error:codeError}=await db.from("vacleaner_promo_codes").insert(codeRows);if(codeError)throw codeError;
        }else{
          const code=normalizePromoCode(body.code);if(code.length<4){await rollback();return json({error:"invalid_promo_code"},400)}const totalLimit=Math.max(1,Math.min(10000,Math.round(Number(body.usageLimitTotal)||500)));codeRows=[{campaign_id:campaign.id,code,customer_phone:null,active:true,expires_at:endsAt,usage_limit:totalLimit}];const {error:codeError}=await db.from("vacleaner_promo_codes").insert(codeRows);if(codeError)throw codeError;const {error:limitError}=await db.from("vacleaner_campaigns").update({usage_limit_total:totalLimit,updated_at:new Date().toISOString()}).eq("id",campaign.id);if(limitError)throw limitError;
        }
      }catch(codeError){await rollback();if(String((codeError as any)?.code||"")==="23505")return json({error:"promo_code_exists"},409);throw codeError}
      return json({campaign:{...campaign,assignedCodes:codeRows.length,eligibleAudience},codes:codeRows});
    }
    if(action==="set_campaign_status"){
      const campaignId=String(body.campaignId||""),status=String(body.status||"");if(!validUuid(campaignId)||!["active","paused","ended"].includes(status))return json({error:"invalid_campaign"},400);const {error}=await db.from("vacleaner_campaigns").update({status,updated_at:new Date().toISOString()}).eq("id",campaignId);if(error)throw error;return json({ok:true,status});
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
