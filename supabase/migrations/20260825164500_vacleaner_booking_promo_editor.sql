create or replace function public.vacleaner_admin_detach_booking_promo(
  p_booking_id uuid,
  p_extras jsonb,
  p_base_amount integer,
  p_total_amount integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption public.vacleaner_promo_redemptions%rowtype;
  v_code public.vacleaner_promo_codes%rowtype;
begin
  perform 1 from public.vacleaner_bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;

  select * into v_redemption
  from public.vacleaner_promo_redemptions
  where booking_id = p_booking_id
  order by created_at desc
  limit 1
  for update;

  perform set_config('vacleaner.allow_promo_detach','1',true);

  update public.vacleaner_bookings
  set extras = p_extras,
      base_amount = greatest(0, p_base_amount),
      total_amount = greatest(0, p_total_amount),
      updated_at = now()
  where id = p_booking_id;

  if v_redemption.id is not null then
    delete from public.vacleaner_promo_redemptions where id = v_redemption.id;
    select * into v_code from public.vacleaner_promo_codes where id = v_redemption.promo_code_id for update;
    if v_code.id is not null and v_code.activated_at is null then
      update public.vacleaner_promo_codes
      set active = false,
          expires_at = null,
          activation_source = null,
          activation_dispatch_id = null,
          activated_by = null
      where id = v_code.id;
    end if;
  end if;
end;
$$;

create or replace function public.vacleaner_admin_attach_booking_promo(
  p_booking_id uuid,
  p_promo_code_id uuid,
  p_campaign_id uuid,
  p_customer_phone text,
  p_discount_amount integer,
  p_base_before_discount integer,
  p_extras jsonb,
  p_base_amount integer,
  p_total_amount integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.vacleaner_bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if exists (select 1 from public.vacleaner_promo_redemptions where booking_id = p_booking_id) then
    raise exception 'booking_promo_already_attached';
  end if;

  perform public.vacleaner_redeem_promo(
    p_promo_code_id,
    p_campaign_id,
    p_booking_id,
    p_customer_phone,
    p_discount_amount,
    p_base_before_discount
  );

  update public.vacleaner_bookings
  set extras = p_extras,
      base_amount = greatest(0, p_base_amount),
      total_amount = greatest(0, p_total_amount),
      updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.vacleaner_admin_detach_booking_promo(uuid,jsonb,integer,integer) from public, anon, authenticated;
revoke all on function public.vacleaner_admin_attach_booking_promo(uuid,uuid,uuid,text,integer,integer,jsonb,integer,integer) from public, anon, authenticated;
grant execute on function public.vacleaner_admin_detach_booking_promo(uuid,jsonb,integer,integer) to service_role;
grant execute on function public.vacleaner_admin_attach_booking_promo(uuid,uuid,uuid,text,integer,integer,jsonb,integer,integer) to service_role;
