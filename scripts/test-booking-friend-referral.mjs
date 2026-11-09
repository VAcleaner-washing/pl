import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {database,handler,input,variants} from './helpers/backend-admin-harness.mjs';

const pg=new PGlite();
await pg.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create table public.vacleaner_customers(phone text primary key,name text);
  create table public.vacleaner_bookings(
    id uuid primary key default gen_random_uuid(), customer_phone text references public.vacleaner_customers(phone),
    status text not null, base_amount integer not null, extras_amount integer not null,
    delivery_amount integer not null, total_amount integer not null, extras jsonb not null default '{}',
    updated_at timestamptz not null, prepayment_paid boolean, deposit_amount integer,
    start_date date, return_date date, source text, fulfillment_address_detail text
  );
`);
// The observed production phone constraints accept +380… (single regex escape).
// The archived bootstrap migration contains double escapes; normalize this old
// fixture literal only. The new migration below is executed byte-for-byte.
const baseline=fs.readFileSync('supabase/migrations/20260827170000_vacleaner_referral_program_v421.sql','utf8');
await pg.exec(baseline.replaceAll(String.raw`'^\\+380[0-9]{9}$'`,()=>"'^[+]380[0-9]{9}$'"));
await pg.exec(fs.readFileSync('supabase/migrations/20261109163433_vacleaner_booking_friend_referral.sql','utf8'));
const rpcSql='select public.vacleaner_admin_attach_booking_referral($1,$2,$3,$4,$5,$6)';
const code='VA-ABC1234',owner='+380950000001';
let checks=0;
const check=(label,fn)=>{fn();checks++;};

async function setup(file,change=()=>{}){
  await pg.exec('truncate public.vacleaner_bookings, public.vacleaner_customers cascade');
  const db=database(),call=handler(file,db);
  const created=await call({...input,action:'create',prepaymentPaid:true});
  assert.equal(created.status,201,JSON.stringify(created));
  const booking=db.tables.vacleaner_bookings[0];
  booking.status='confirmed';booking.source='instagram';booking.fulfillment_address_detail='Під’їзд 2';
  booking.extras.keep={value:'unchanged'};
  db.tables.vacleaner_customers.push({phone:owner,name:'Рекомендував'});
  db.tables.vacleaner_referral_codes.push({owner_phone:owner,code,active:true});
  change(db,booking);
  const phones=new Set([owner,...db.tables.vacleaner_bookings.map(b=>b.customer_phone),...db.tables.vacleaner_customers.map(c=>c.phone)]);
  for(const phone of phones)await pg.query('insert into public.vacleaner_customers(phone,name) values($1,$2)',[phone,'QA']);
  for(const row of db.tables.vacleaner_referral_codes)await pg.query('insert into public.vacleaner_referral_codes(owner_phone,code,active) values($1,$2,$3)',[row.owner_phone,row.code,row.active]);
  for(const b of db.tables.vacleaner_bookings)await pg.query(`insert into public.vacleaner_bookings(id,customer_phone,status,base_amount,extras_amount,delivery_amount,total_amount,extras,updated_at,prepayment_paid,deposit_amount,start_date,return_date,source,fulfillment_address_detail) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,[b.id,b.customer_phone,b.status,b.base_amount,b.extras_amount,b.delivery_amount,b.total_amount,b.extras,b.updated_at,b.prepayment_paid,b.deposit_amount,b.start_date,b.return_date,b.source,b.fulfillment_address_detail]);
  const regularRpc=db.rpc;
  db.referralCalls=[];
  db.rpc=async(name,args)=>{
    if(name!=='vacleaner_admin_attach_booking_referral')return regularRpc(name,args);
    db.referralCalls.push(structuredClone(args));
    try{
      await pg.query(rpcSql,[args.p_booking_id,args.p_referral_code,args.p_expected_updated_at,args.p_extras,args.p_base_amount,args.p_total_amount]);
      const saved=(await pg.query('select to_jsonb(b) as booking from public.vacleaner_bookings b where id=$1',[args.p_booking_id])).rows[0].booking;
      Object.assign(booking,saved);
      db.tables.vacleaner_referral_uses=(await pg.query('select * from public.vacleaner_referral_uses')).rows;
      return{data:null,error:null};
    }catch(error){return{data:null,error:{message:error.message,code:error.code}};}
  };
  return{db,call,booking,body:{action:'attach_referral',bookingId:booking.id,referralCode:code}};
}

for(const file of variants){
  for(const status of ['pending','waiting_payment','confirmed']){
    const {db,call,booking,body}=await setup(file,(_db,b)=>{b.status=status});
    const before=structuredClone(booking),result=await call({...body,referralCode:' va-abc1234 '});
    check(`${status}: real HTTP + SQL attachment`,()=>assert.equal(result.status,200,JSON.stringify(result)));
    check('discount changes rental only',()=>{
      assert.equal(result.body.booking.base_amount,before.base_amount-100);
      assert.equal(result.body.booking.total_amount,before.total_amount-100);
      for(const key of ['status','prepayment_paid','deposit_amount','start_date','return_date','source','fulfillment_address_detail','extras_amount','delivery_amount'])assert.equal(result.body.booking[key],before[key],key);
      assert.deepEqual(result.body.booking.extras.keep,before.extras.keep);
    });
    check('pending referral links booking and both phones',()=>{
      const use=db.tables.vacleaner_referral_uses[0];assert.equal(db.tables.vacleaner_referral_uses.length,1);
      assert.deepEqual([use.booking_id,use.referrer_phone,use.referred_phone,use.friend_discount_amount,use.status],[booking.id,owner,booking.customer_phone,100,'pending']);
      assert.equal(db.tables.vacleaner_referral_rewards.length,0,'reward only after completion');
    });
    const repeated=await call(body);
    check('retry does not double-discount or duplicate use',()=>{assert.equal(repeated.status,200);assert.equal(repeated.body.attached,false);assert.equal(db.referralCalls.length,1);assert.equal(db.tables.vacleaner_referral_uses.length,1);assert.equal(repeated.body.booking.total_amount,before.total_amount-100)});
    const changed=await call({...body,referralCode:'VA-OTHER12'});
    check('attached referral cannot be replaced',()=>assert.equal(changed.body.error,'booking_referral_already_attached'));
  }
  for(const status of ['issued','completed','cancelled','declined']){
    const {call,body,db}=await setup(file,(_db,b)=>{b.status=status});
    const before=(await pg.query('select * from public.vacleaner_bookings')).rows;
    const result=await call(body);
    check(`${status}: refuses repricing`,()=>{assert.equal(result.status,409);assert.equal(result.body.error,'invalid_transition');assert.equal(db.referralCalls.length,0)});
    assert.deepEqual((await pg.query('select * from public.vacleaner_bookings')).rows,before);
  }
  for(const status of ['pending','waiting_payment','confirmed','issued','completed','cancelled','declined']){
    const {call,body}=await setup(file,(db,b)=>{db.tables.vacleaner_bookings.push({...structuredClone(b),id:'33333333-3333-4333-8333-333333333333',status})});
    const result=await call(body),allowed=['cancelled','declined'].includes(status);
    check(`${status}: prior rental eligibility`,()=>{assert.equal(result.status,allowed?200:409,JSON.stringify(result));if(!allowed)assert.equal(result.body.error,'referral_first_rental_only')});
  }
  for(const [label,change,reason] of [
    ['self',(_db,b)=>{b.customer_phone=owner},'self_referral'],
    ['inactive',db=>{db.tables.vacleaner_referral_codes[0].active=false},'referral_inactive'],
    ['unknown',db=>{db.tables.vacleaner_referral_codes=[]},'invalid_referral'],
    ['existing promo',(_db,b)=>{b.extras.promo={code:'RETURN'}},'booking_promo_already_attached'],
    ['existing reward',(_db,b)=>{b.extras.referral_reward={id:'reward'}},'booking_promo_already_attached'],
    ['better manual discount',(_db,b)=>{b.extras.manual_discount={type:'fixed',value:200,reason:'QA'}},'promo_not_best_discount'],
    ['inconsistent legacy total',(_db,b)=>{b.total_amount+=150},'booking_finance_review_required'],
  ]){
    const {call,body}=await setup(file,change);const before=(await pg.query('select * from public.vacleaner_bookings')).rows;
    const result=await call(body);check(label,()=>{assert.equal(result.status,409,JSON.stringify(result));assert.equal(result.body.error,reason)});
    assert.deepEqual((await pg.query('select * from public.vacleaner_bookings')).rows,before);
  }
  {
    const {call,body,db}=await setup(file);
    const denied=await call(body,'invalid');check('no token access',()=>{assert.equal(denied.status,401);assert.equal(db.referralCalls.length,0)});
    db.tables.admin_users=[];assert.equal((await call(body)).status,403);
  }
  {
    const {call,body}=await setup(file);
    await pg.exec(`create function public.qa_fail_referral_insert() returns trigger language plpgsql as $$ begin raise exception 'qa_insert_failure'; end $$;
      create trigger qa_insert_failure before insert on public.vacleaner_referral_uses for each row execute function public.qa_fail_referral_insert();`);
    const before=(await pg.query('select * from public.vacleaner_bookings')).rows;
    const result=await call(body);
    check('failed use insert rolls back financial update',()=>{assert.equal(result.status,409);assert.deepEqual((result.body),{error:'service_error'})});
    assert.deepEqual((await pg.query('select * from public.vacleaner_bookings')).rows,before);
    assert.equal((await pg.query('select * from public.vacleaner_referral_uses')).rows.length,0);
    await pg.exec('drop trigger qa_insert_failure on public.vacleaner_referral_uses; drop function public.qa_fail_referral_insert()');
  }
  {
    const {call,body,db}=await setup(file),originalRpc=db.rpc;
    db.rpc=async(name,args)=>{if(name==='vacleaner_admin_attach_booking_referral')await pg.query("update public.vacleaner_bookings set updated_at=updated_at+interval '1 second' where id=$1",[args.p_booking_id]);return originalRpc(name,args)};
    const before=(await pg.query('select base_amount,total_amount from public.vacleaner_bookings')).rows;
    const result=await call(body);check('stale price snapshot refuses update',()=>assert.equal(result.body.error,'booking_changed'));
    assert.deepEqual((await pg.query('select base_amount,total_amount from public.vacleaner_bookings')).rows,before);
  }
  for(const [label,change,reason] of [
    ['status changed during request',async id=>pg.query("update public.vacleaner_bookings set status='issued' where id=$1",[id]),'invalid_transition'],
    ['code deactivated during request',async()=>pg.query('update public.vacleaner_referral_codes set active=false'),'referral_inactive'],
    ['another rental appeared during request',async id=>pg.query("insert into public.vacleaner_bookings(id,customer_phone,status,base_amount,extras_amount,delivery_amount,total_amount,extras,updated_at) select gen_random_uuid(),customer_phone,'pending',base_amount,extras_amount,delivery_amount,total_amount,extras,updated_at from public.vacleaner_bookings where id=$1",[id]),'referral_first_rental_only'],
  ]){
    const {call,body,db}=await setup(file),originalRpc=db.rpc;
    db.rpc=async(name,args)=>{if(name==='vacleaner_admin_attach_booking_referral')await change(args.p_booking_id);return originalRpc(name,args)};
    const result=await call(body);check(label,()=>assert.equal(result.body.error,reason));
    assert.equal((await pg.query('select * from public.vacleaner_referral_uses')).rows.length,0);
  }
  {
    const {call,body}=await setup(file,(_db,b)=>{b.extras.base_before_discount=1300;b.extras.discount={amount:50,source:'manual'};b.extras.manual_discount={type:'fixed',value:50,reason:'QA'};b.base_amount=1250;b.total_amount=1250+b.extras_amount+b.delivery_amount});
    const result=await call(body);check('saved tariff snapshot survives newer catalogue prices',()=>{assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.booking.base_amount,1200);assert.equal(result.body.booking.extras.manual_discount.value,50)});
  }
  console.log(`PASS real HTTP handler + PostgreSQL transaction: ${file}`);
}
{
  const {booking}=await setup(variants[0],(_db,b)=>{b.extras.base_before_discount=700;b.extras.discount={source:'manual',amount:200};b.base_amount=500;b.total_amount=500+b.extras_amount+b.delivery_amount});
  const extras={...booking.extras,promo:{code,kind:'referral_friend'},referral_friend:{code,referrer_phone:owner,discount_amount:100},discount:{source:'promo',amount:100}};
  await assert.rejects(pg.query(rpcSql,[booking.id,code,booking.updated_at,extras,600,600+booking.extras_amount+booking.delivery_amount]),/booking_finance_review_required/);
  assert.equal((await pg.query('select base_amount from public.vacleaner_bookings where id=$1',[booking.id])).rows[0].base_amount,500);checks++;
}
const permissions=(await pg.query(`select r,has_function_privilege(r,'public.vacleaner_admin_attach_booking_referral(uuid,text,timestamptz,jsonb,integer,integer)','execute') as allowed from unnest(array['anon','authenticated','service_role']) r`)).rows;
assert.deepEqual(permissions.map(p=>p.allowed),[false,false,true]);checks++;
const security=(await pg.query(`select prosecdef,proconfig from pg_proc where proname='vacleaner_admin_attach_booking_referral'`)).rows[0];assert.equal(security.prosecdef,false);checks++;
await pg.close();console.log(`PASS booking referral: ${checks} scenarios, actual migration, rollback and RPC permissions`);
