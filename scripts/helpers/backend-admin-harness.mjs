import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import crypto from 'node:crypto';
import * as config from '../../supabase/functions/vacleaner-admin-bookings-v4/config.ts';
import * as settlement from '../../supabase/functions/vacleaner-admin-bookings-v4/settlement.mjs';
import * as pricing from '../../supabase/functions/vacleaner-admin-bookings-v4/pricing.mjs';
import * as referral from '../../supabase/functions/vacleaner-admin-bookings-v4/referral.ts';

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
    vacleaner_booking_audit:[],vacleaner_referral_codes:[],vacleaner_referral_uses:[],vacleaner_referral_rewards:[],vacleaner_promo_codes:[],
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


export {database,handler,input,variants,requestId};
