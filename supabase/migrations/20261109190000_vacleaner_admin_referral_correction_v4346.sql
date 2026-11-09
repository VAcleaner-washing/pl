-- VAcleaner v4.3.46: attach, correct, or clear first-rental referrals after booking creation.
-- Atomic, backend-only operation. Existing settlement, payments, resources and source are unchanged.
create or replace function public.vacleaner_admin_set_booking_referral(
  p_booking_id uuid,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.vacleaner_bookings%rowtype;
  v_owner public.vacleaner_referral_codes%rowtype;
  v_use public.vacleaner_referral_uses%rowtype;
  v_extras jsonb;
  v_existing text;
  v_code text;
  v_raw integer;
  v_percent integer;
  v_loyalty integer;
  v_friend integer;
  v_amount integer;
  v_source text;
  v_type text;
  v_promo jsonb;
  v_friend_meta jsonb;
  v_discount jsonb;
  v_updated public.vacleaner_bookings%rowtype;
begin
  select * into v_booking from public.vacleaner_bookings
  where id=p_booking_id for update;
  if not found then raise exception 'invalid_booking'; end if;
  if v_booking.status not in ('pending','waiting_payment','confirmed') then
    raise exception 'invalid_transition';
  end if;

  v_extras := coalesce(v_booking.extras,'{}'::jsonb);
  v_existing := upper(coalesce(v_extras->'referral_friend'->>'code',''));
  v_code := upper(btrim(coalesce(p_code,'')));
  if v_code<>'' and v_code !~ '^VA-[A-Z0-9]{6,12}$' then
    raise exception 'invalid_referral';
  end if;

  select * into v_use from public.vacleaner_referral_uses
  where booking_id=p_booking_id for update;
  if found and v_use.status='completed' then
    raise exception 'referral_completed_locked';
  end if;
  if v_use.id is not null and v_use.status='pending'
     and v_existing<>'' and v_existing<>upper(v_use.referral_code) then
    raise exception 'referral_state_conflict';
  end if;
  if v_existing=v_code and ((v_code='' and v_use.id is null) or
      (v_code<>'' and v_use.status='pending' and upper(v_use.referral_code)=v_code)) then
    return jsonb_build_object('booking_id',v_booking.id,'changed',false,'code',nullif(v_code,''));
  end if;

  if coalesce(v_extras->'promo','null'::jsonb)<>'null'::jsonb and (
    v_existing='' or
    coalesce(v_extras->'promo'->>'campaign_type','') <> 'referral'
  ) then
    raise exception 'referral_existing_promo';
  end if;
  if coalesce(v_extras->'manual_discount'->>'type','none')<>'none' or
     coalesce(v_extras->'discount'->>'primary_source',v_extras->'discount'->>'source','none')='manual' then
    raise exception 'referral_existing_discount';
  end if;
  if coalesce(v_extras->'referral_reward'->>'applied','false')='true' then
    raise exception 'referral_existing_reward';
  end if;
  if exists(select 1 from public.vacleaner_promo_redemptions where booking_id=p_booking_id) then
    raise exception 'referral_existing_promo';
  end if;

  v_raw := greatest(0,coalesce(
    (v_extras->>'base_before_discount')::integer,
    v_booking.base_amount + coalesce((v_extras->'discount'->>'amount')::integer,0)
  ));
  v_percent := coalesce((v_extras->'loyalty'->>'percent')::integer,0);
  if v_percent not in (0,5,10) then v_percent:=0; end if;
  v_loyalty := least(v_raw,round(v_raw*v_percent/100.0)::integer);
  v_friend := least(v_raw,100);

  if v_code<>'' then
    select * into v_owner from public.vacleaner_referral_codes
    where upper(code)=v_code and active=true for share;
    if not found then raise exception 'referral_inactive'; end if;
    if v_owner.owner_phone=v_booking.customer_phone then
      raise exception 'self_referral';
    end if;
    if exists (
      select 1 from public.vacleaner_bookings b
      where b.customer_phone=v_booking.customer_phone and b.id<>p_booking_id
        and b.status in ('pending','waiting_payment','confirmed','issued','completed')
    ) then raise exception 'referral_first_rental_only'; end if;
    if exists (
      select 1 from public.vacleaner_referral_uses u
      where u.referred_phone=v_booking.customer_phone and u.booking_id<>p_booking_id
        and u.status in ('pending','completed')
    ) then raise exception 'referral_already_used'; end if;
    v_friend_meta:=jsonb_build_object(
      'code',v_owner.code,'referrer_phone',v_owner.owner_phone,'discount_amount',100);
  else
    v_friend_meta:='null'::jsonb;
  end if;

  if v_code<>'' and v_friend>v_loyalty then
    v_amount:=v_friend; v_source:='promo'; v_type:='fixed';
    v_promo:=jsonb_build_object(
      'code',v_owner.code,'campaign_id','','campaign_name','Приведи друга',
      'campaign_type','referral','kind','referral_friend',
      'referrer_phone',v_owner.owner_phone,
      'discount_type','fixed','discount_value',100,'applied',true);
  else
    v_amount:=v_loyalty;
    v_source:=case when v_loyalty>0 then 'loyalty' else 'none' end;
    v_type:=case when v_loyalty>0 then 'percent' else 'none' end;
    v_promo:='null'::jsonb;
  end if;
  v_discount:=jsonb_build_object(
    'type',v_type,'percent',case when v_source='loyalty' then v_percent else 0 end,
    'amount',v_amount,'source',v_source,'primary_source',v_source,
    'loyalty_amount',v_loyalty,'referral_reward_amount',0,'reason','');

  -- Must atomically update both the relationship and the booking totals.
  -- Skip the legacy promo-preservation trigger only within this transaction.
  perform pg_catalog.set_config('vacleaner.allow_promo_detach','1',true);
  if v_code='' then
    if v_use.id is not null and v_use.status='pending' then
      update public.vacleaner_referral_uses set status='cancelled',
        cancelled_at=now() where id=v_use.id;
    end if;
  elsif v_use.id is not null then
    if v_use.status not in ('pending','cancelled') then
      raise exception 'referral_completed_locked';
    end if;
    update public.vacleaner_referral_uses set
      referral_code=v_owner.code, referrer_phone=v_owner.owner_phone,
      referred_phone=v_booking.customer_phone, friend_discount_amount=100,
      status='pending', cancelled_at=null, completed_at=null
    where id=v_use.id;
  else
    insert into public.vacleaner_referral_uses(
      referral_code,referrer_phone,referred_phone,booking_id,friend_discount_amount,status
    ) values (
      v_owner.code,v_owner.owner_phone,v_booking.customer_phone,p_booking_id,100,'pending'
    );
  end if;

  update public.vacleaner_bookings set
    extras=v_extras || jsonb_build_object(
      'referral_friend',v_friend_meta,'promo',v_promo,
      'discount',v_discount,'base_before_discount',v_raw),
    base_amount=greatest(0,v_raw-v_amount),
    -- Preserve all already recorded non-rental charges (chemistry, manual + грн,
    -- delivery and extras). Only the rental-discount delta can change total_amount.
    total_amount=greatest(0,v_booking.total_amount +
      (greatest(0,v_raw-v_amount) - v_booking.base_amount)),
    updated_at=now()
  where id=p_booking_id
  returning * into v_updated;

  return jsonb_build_object('booking_id',v_updated.id,
    'changed',true,'code',nullif(v_code,''),
    'discount_amount',v_amount,'total_amount',v_updated.total_amount);
exception
  when unique_violation then raise exception 'referral_already_used';
end;
$$;
revoke all on function public.vacleaner_admin_set_booking_referral(uuid,text)
from public, anon, authenticated;
grant execute on function public.vacleaner_admin_set_booking_referral(uuid,text)
to service_role;
