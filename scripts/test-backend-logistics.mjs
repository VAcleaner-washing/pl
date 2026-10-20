import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import crypto from 'node:crypto';
import * as config from '../supabase/functions/vacleaner-admin-bookings-v4/config.ts';
import * as settlement from '../supabase/functions/vacleaner-admin-bookings-v4/settlement.mjs';
import * as pricing from '../supabase/functions/vacleaner-admin-bookings-v4/pricing.mjs';
import * as referral from '../supabase/functions/vacleaner-admin-bookings-v4/referral.ts';

// Execute the real HTTP handler. Only Supabase I/O is replaced; logistics,
// pricing, validation, reservation requests and returned JSON are production code.
const sourcePath=process.argv.find(x=>x.startsWith('--source='))?.slice(9);
const variants=sourcePath?[sourcePath]:[
  'supabase/functions/vacleaner-admin-bookings-v4/index.ts',
  'supabase/functions/vacleaner-admin-bookings-v4/index.deploy.js',
];
const id='11111111-1111-4111-8111-111111111111';
const requestId='22222222-2222-4222-8222-222222222222';
const input={productCode:'puzzi',startDate:'2026-10-26',returnDate:'2026-10-27',pickupTime:'09:00',returnTime:'09:00',customerName:'Тест логістики',customerPhone:'0500000000',fulfillment:'delivery',deliveryAddress:'Полтава, тестова вулиця, 1',selectedExtras:[]};

function database(){
  const tables={
    admin_users:[{user_id:id}],vacleaner_bookings:[],vacleaner_customers:[],
    vacleaner_settings:[],vacleaner_inventory:[{resource_code:'puzzi',capacity:2,active:true}],
    vacleaner_booking_audit:[],vacleaner_referral_rewards:[],vacleaner_promo_codes:[],
  };
  const reservations=[];
  let conflict=false;
  const db={tables,reservations,setConflict:value=>{conflict=value},auth:{getUser:async token=>({data:{user:token==='test-manager'?{id}:null},error:null})}};
  db.from=table=>{
    assert.ok(Object.hasOwn(tables,table),`unexpected table ${table}`);
    let op='select',payload,one=false,filters=[],executed;
    const q={
      select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},
      in(k,v){filters.push(r=>v.includes(r[k]));return q},
      is(k,v){filters.push(r=>(r[k]??null)===v);return q},
      gte(){return q},lte(){return q},gt(){return q},order(){return q},limit(){return q},
      insert(v){op='insert';payload=v;return q},update(v){op='update';payload=v;return q},
      upsert(v){op='upsert';payload=v;return q},delete(){op='delete';return q},
      single(){one=true;return q},maybeSingle(){one=true;return q},
      then(resolve,reject){
        if(!executed)executed=Promise.resolve().then(()=>{
          let rows=tables[table].filter(r=>filters.every(f=>f(r)));
          if(op==='insert'){const row={id:crypto.randomUUID(),...structuredClone(payload)};tables[table].push(row);rows=[row]}
          if(op==='update'){for(const row of rows)Object.assign(row,structuredClone(payload))}
          if(op==='upsert'){const row=tables[table].find(r=>r.phone===payload.phone);if(row)Object.assign(row,structuredClone(payload));else tables[table].push(structuredClone(payload));rows=[payload]}
          if(op==='delete')tables[table]=tables[table].filter(r=>!rows.includes(r));
          return{data:structuredClone(one?rows[0]??null:rows),error:null,count:rows.length};
        });
        return executed.then(resolve,reject);
      },
    };return q;
  };
  db.rpc=async(name,args)=>{
    assert.equal(name,'vacleaner_apply_reservation','unexpected RPC');
    reservations.push(structuredClone(args));
    if(conflict)return{data:null,error:{message:'inventory_conflict'}};
    const row=tables.vacleaner_bookings.find(r=>r.id===args.p_booking_id);
    assert.ok(row,'reservation must reference a stored booking');
    Object.assign(row,{status:args.p_target_status,hold_expires_at:args.p_hold_expires_at,
      vacleaner_booking_resources:structuredClone(args.p_resources),prepayment_paid:args.p_target_status==='confirmed'?true:row.prepayment_paid});
    return{data:structuredClone(row),error:null};
  };
  return db;
}

function handler(file,db){
  let serve;
  let code=fs.readFileSync(file,'utf8');
  if(file.endsWith('.ts'))code=stripTypeScriptTypes(code,{mode:'transform'});
  code=code.replace(/^import [\s\S]*?;\r?\n/gm,'');
  vm.runInNewContext(code,{
    ...config,...settlement,...pricing,...referral,
    createClient:()=>db,Request,Response,URL,structuredClone,crypto,TextEncoder,
    console:{warn(){},error(){},log(){}},
    fetch:()=>{throw new Error('network forbidden in backend tests')},
    Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://example.invalid':'test-only'},serve:fn=>{serve=fn}},
  },{filename:file});
  return async(body,token='test-manager')=>{
    const response=await serve(new Request('https://example.invalid/functions/v1/vacleaner-admin-bookings-v4',{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),
    }));
    return{status:response.status,body:await response.json()};
  };
}

for(const file of variants){
  let checks=0;
  for(const [outbound,back,legs,amount] of [
    ['pickup','return_to_location',0,0],['delivery','return_to_location',1,125],
    ['pickup','pickup',1,125],['delivery','pickup',2,250],
  ]){
    const db=database(),call=handler(file,db);
    const body={...input,action:'create',clientRequestId:requestId,deliveryOutboundMethod:outbound,deliveryReturnMethod:back};
    const created=await call(body);assert.equal(created.status,201,JSON.stringify(created.body));
    const booking=created.body.booking,d=booking.extras.delivery;
    assert.deepEqual([d.outbound_method,d.return_method,d.legs,d.factor,d.trip_multiplier,d.amount],[outbound,back,legs,legs/2,legs*2,amount]);
    assert.equal(booking.fulfillment,legs?'delivery':'pickup');
    assert.equal(booking.delivery_amount,amount);assert.equal(booking.base_amount,700);assert.equal(booking.total_amount,700+amount);
    const reloaded=await call({action:'list'});assert.deepEqual(reloaded.body.bookings[0].extras.delivery,d,'reload retains actual saved metadata');
    const retry=await call(body);assert.equal(retry.body.idempotent,true);assert.equal(db.tables.vacleaner_bookings.length,1,'retry must not duplicate');
    const edited=await call({...body,action:'edit',bookingId:booking.id});
    assert.equal(edited.status,200,JSON.stringify(edited.body));assert.deepEqual(edited.body.booking.extras.delivery,d,'edit/reopen keeps the same selection');
    assert.equal(db.reservations[0].p_resources[0].resource_code,'puzzi');
    checks++;
  }
  // Explicit override is a final amount, never halved for the second time.
  {
    const db=database(),call=handler(file,db);
    const result=await call({...input,action:'create',deliveryOutboundMethod:'delivery',deliveryReturnMethod:'return_to_location',deliveryAmountOverride:175});
    assert.equal(result.status,201);assert.equal(result.body.booking.delivery_amount,175);checks++;
  }
  {
    const db=database(),call=handler(file,db);
    const result=await call({...input,action:'create',deliveryAddress:'Супрунівка, Центральна, 1',deliveryAddressVerified:true,deliveryRouteKm:18,deliveryOutboundMethod:'pickup',deliveryReturnMethod:'pickup'});
    assert.equal(result.status,201);assert.equal(result.body.booking.delivery_amount,250,'one-way delivery uses half of the 500 UAH route-zone tariff');
    assert.equal(result.body.booking.extras.delivery.route_km,18);checks++;
  }
  // Existing bookings remain unchanged until explicitly edited; old clients keep
  // saved one-way metadata, actual prepayment, locked deposit and custom amount.
  {
    const db=database(),call=handler(file,db);
    const created=await call({...input,action:'create',prepaymentPaid:true,deliveryOutboundMethod:'delivery',deliveryReturnMethod:'return_to_location',deliveryAmountOverride:175});
    const saved=db.tables.vacleaner_bookings[0];saved.deposit_amount=1500;
    const baseline=structuredClone(saved);
    await call({action:'list'});assert.deepEqual(saved,baseline,'reading cannot rewrite historical bookings');
    const result=await call({...input,action:'edit',bookingId:created.body.booking.id});
    assert.equal(result.status,200,JSON.stringify(result.body));
    assert.equal(result.body.booking.extras.delivery.return_method,'return_to_location');
    assert.equal(result.body.booking.extras.delivery.trip_multiplier,2);assert.equal(result.body.booking.delivery_amount,175);
    assert.equal(result.body.booking.prepayment_paid,true);assert.equal(result.body.booking.prepayment_amount,200);assert.equal(result.body.booking.deposit_amount,1500);checks++;
    const pickup=await call({...input,action:'edit',bookingId:saved.id,fulfillment:'pickup'});
    assert.equal(pickup.body.booking.extras.delivery.legs,0);assert.equal(pickup.body.booking.delivery_amount,0);checks++;
  }
  // Server recomputes the quote when explicit directions change.
  {
    const db=database(),call=handler(file,db);
    const created=await call({...input,action:'create',deliveryOutboundMethod:'delivery',deliveryReturnMethod:'pickup'});
    const result=await call({...input,action:'edit',bookingId:created.body.booking.id,deliveryOutboundMethod:'delivery',deliveryReturnMethod:'return_to_location'});
    assert.equal(result.body.booking.delivery_amount,125);assert.equal(result.body.booking.extras.delivery.trip_multiplier,2);checks++;
  }
  {
    const db=database(),call=handler(file,db);
    const denied=await call({...input,action:'create'},'not-a-manager');assert.equal(denied.status,401);assert.equal(db.tables.vacleaner_bookings.length,0);
    db.tables.admin_users=[];const forbidden=await call({...input,action:'create'});assert.equal(forbidden.status,403);checks++;
  }
  {
    const db=database(),call=handler(file,db);db.setConflict(true);
    const result=await call({...input,action:'create'});assert.notEqual(result.status,201);assert.equal(db.tables.vacleaner_bookings.length,0,'failed reservation rolls back new booking');checks++;
    db.tables.vacleaner_inventory[0].capacity=0;const unavailable=await call({...input,action:'create'});assert.equal(unavailable.status,409);assert.equal(unavailable.body.error,'inventory_conflict');checks++;
  }
  // Finance rules use the same HTTP handler and persisted state as logistics.
  {
    const db=database(),call=handler(file,db);
    const created=await call({...input,action:'create'});const saved=db.tables.vacleaner_bookings[0];
    saved.status='issued';saved.deposit_paid=true;saved.deposit_amount=1000;saved.prepayment_paid=true;saved.prepayment_amount=200;
    const result=await call({action:'save_finance',bookingId:created.body.booking.id,usedPackets:10,manualChargeAmount:150,manualChargeReason:'Додаткові години',storyMention:false});
    assert.equal(result.status,200,JSON.stringify(result.body));
    assert.equal(result.body.booking.extras.chemistry.used_packets,10);assert.equal(result.body.booking.extras.manual_charge.amount,150);
    assert.equal(result.body.booking.total_amount,1600);assert.equal(result.body.booking.delivery_amount,250);checks++;
    const repeat=await call({action:'save_finance',bookingId:saved.id,usedPackets:10,storyMention:false});
    assert.equal(repeat.body.booking.extras.manual_charge.amount,150);assert.equal(repeat.body.booking.total_amount,1600,'issue/finance requests without charge fields preserve the saved fee');checks++;
    for(const status of ['issued','completed']){
      saved.status=status;const before=JSON.stringify(saved);
      const edit=await call({...input,action:'edit',bookingId:saved.id,deliveryOutboundMethod:'pickup',deliveryReturnMethod:'return_to_location'});
      assert.equal(edit.status,409);assert.equal(JSON.stringify(saved),before,`${status} rentals cannot be repriced by the booking editor`);checks++;
    }
  }
  console.log(`PASS ${file}: ${checks} HTTP/persistence scenarios`);
}
