-- Attach a friend's code to an existing, unissued first rental without a partial
-- discount/use write. Called only by the authenticated admin Edge Function.
create or replace function public.vacleaner_admin_attach_booking_referral(
  p_booking_id uuid,
  p_referral_code text,
  p_expected_updated_at timestamptz,
  p_extras jsonb,
  p_base_amount integer,
  p_total_amount integer
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking public.vacleaner_bookings%rowtype;
  v_code public.vacleaner_referral_codes%rowtype;
  v_raw_base integer;
  v_discount integer;
begin
  select * into v_booking from public.vacleaner_bookings
  where id = p_booking_id for update;
  if not found then raise exception 'invalid_booking'; end if;
  if v_booking.status not in ('pending','waiting_payment','confirmed') then
    raise exception 'invalid_transition';
  end if;
  if v_booking.extras->'referral_friend'->>'code' = p_referral_code
     and exists (select 1 from public.vacleaner_referral_uses
       where booking_id = p_booking_id and referral_code = p_referral_code
         and referred_phone = v_booking.customer_phone and status = 'pending') then
    return;
  end if;
  if p_expected_updated_at is null or v_booking.updated_at is distinct from p_expected_updated_at then
    raise exception 'booking_changed';
  end if;
  if coalesce(v_booking.extras->'referral_friend'->>'code','') <> '' then
    raise exception 'booking_referral_already_attached';
  end if;
  if coalesce(v_booking.extras->'promo','null'::jsonb) <> 'null'::jsonb
     or coalesce(v_booking.extras->'referral_reward'->>'id','') <> '' then
    raise exception 'booking_promo_already_attached';
  end if;
  select * into v_code from public.vacleaner_referral_codes
  where code = p_referral_code for share;
  if not found then raise exception 'invalid_referral'; end if;
  if not v_code.active then raise exception 'referral_inactive'; end if;
  if v_code.owner_phone = v_booking.customer_phone then raise exception 'self_referral'; end if;

  -- Serialize attachments for the same friend; the existing partial unique
  -- index remains the final protection against simultaneous create requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vacleaner-referral:' || v_booking.customer_phone,0));
  if exists (select 1 from public.vacleaner_bookings
    where customer_phone = v_booking.customer_phone and id <> p_booking_id
      and status in ('pending','waiting_payment','confirmed','issued','completed')) then
    raise exception 'referral_first_rental_only';
  end if;
  if exists (select 1 from public.vacleaner_referral_uses
    where (referred_phone = v_booking.customer_phone and status in ('pending','completed'))
       or booking_id = p_booking_id) then
    raise exception 'referral_already_used';
  end if;

  v_raw_base := coalesce(nullif((v_booking.extras->>'base_before_discount')::integer,0),
    v_booking.base_amount + coalesce((v_booking.extras->'discount'->>'amount')::integer,0));
  v_discount := least(100,greatest(0,v_raw_base));
  if p_extras is null or p_base_amount is null or p_total_amount is null
     or v_discount <= 0 or p_base_amount <> v_raw_base - v_discount or p_base_amount > v_booking.base_amount
     or p_total_amount <> p_base_amount + v_booking.extras_amount + v_booking.delivery_amount
     or v_booking.total_amount <> v_booking.base_amount + v_booking.extras_amount + v_booking.delivery_amount
     or (p_extras - array['promo','referral_friend','discount','base_before_discount'])
        is distinct from (coalesce(v_booking.extras,'{}'::jsonb) - array['promo','referral_friend','discount','base_before_discount'])
     or p_extras->'referral_friend' is distinct from jsonb_build_object('code',v_code.code,'referrer_phone',v_code.owner_phone,'discount_amount',100)
     or p_extras->'promo'->>'code' is distinct from v_code.code
     or p_extras->'promo'->>'kind' is distinct from 'referral_friend'
     or (p_extras->'discount'->>'amount')::integer is distinct from v_discount
     or p_extras->'discount'->>'source' is distinct from 'promo' then
    raise exception 'booking_finance_review_required';
  end if;

  update public.vacleaner_bookings
  set extras = p_extras, base_amount = p_base_amount, total_amount = p_total_amount, updated_at = now()
  where id = p_booking_id;
  insert into public.vacleaner_referral_uses
    (referral_code,referrer_phone,referred_phone,booking_id,friend_discount_amount,status)
  values (v_code.code,v_code.owner_phone,v_booking.customer_phone,p_booking_id,100,'pending');
end;
$$;

revoke all on function public.vacleaner_admin_attach_booking_referral(uuid,text,timestamptz,jsonb,integer,integer) from public, anon, authenticated;
grant execute on function public.vacleaner_admin_attach_booking_referral(uuid,text,timestamptz,jsonb,integer,integer) to service_role;
