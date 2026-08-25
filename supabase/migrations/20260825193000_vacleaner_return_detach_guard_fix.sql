-- VAcleaner v4.1.32 — explicit RETURN detach must not be re-applied by the ordinary edit guard.
create or replace function public.vacleaner_preserve_best_promo_discount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_promo jsonb;
  v_discount jsonb;
  v_raw integer;
  v_promo_value integer;
  v_promo_amount integer;
  v_loyalty_percent integer;
  v_loyalty_amount integer;
  v_type text;
begin
  -- The only supported bypass is the service-role-only detach RPC below.
  if coalesce(current_setting('vacleaner.allow_promo_detach', true),'') = '1' then
    return new;
  end if;

  v_promo := old.extras -> 'promo';
  if coalesce(old.extras -> 'discount' ->> 'source','') <> 'promo'
     or coalesce(v_promo ->> 'applied','false') <> 'true' then
    return new;
  end if;
  if coalesce(new.extras -> 'discount' ->> 'source','') = 'manual' then
    return new;
  end if;

  v_raw := greatest(0, coalesce((new.extras ->> 'base_before_discount')::integer,(old.extras ->> 'base_before_discount')::integer,new.base_amount,0));
  v_promo_value := greatest(0, coalesce((v_promo ->> 'discount_value')::integer,0));
  v_type := coalesce(v_promo ->> 'discount_type','percent');
  v_promo_amount := least(v_raw, case when v_type='fixed' then v_promo_value else round(v_raw * least(100,v_promo_value) / 100.0)::integer end);
  v_loyalty_percent := greatest(0, least(10, coalesce((new.extras -> 'loyalty' ->> 'percent')::integer,0)));
  v_loyalty_amount := round(v_raw * v_loyalty_percent / 100.0)::integer;

  if v_promo_amount > v_loyalty_amount then
    v_discount := jsonb_build_object('source','promo','percent',case when v_type='percent' then v_promo_value else 0 end,'amount',v_promo_amount);
    new.extras := jsonb_set(jsonb_set(new.extras,'{promo}',v_promo,true),'{discount}',v_discount,true);
    new.base_amount := greatest(0,v_raw-v_promo_amount);
    new.total_amount := new.base_amount + coalesce(new.extras_amount,0) + coalesce(new.delivery_amount,0);
  end if;
  return new;
end;
$function$;

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

  -- Transaction-local flag: ordinary edits still preserve the applied promo,
  -- while this explicit manager action is allowed to clear it atomically.
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

revoke all on function public.vacleaner_preserve_best_promo_discount() from public,anon,authenticated;
revoke all on function public.vacleaner_admin_detach_booking_promo(uuid,jsonb,integer,integer) from public, anon, authenticated;
grant execute on function public.vacleaner_admin_detach_booking_promo(uuid,jsonb,integer,integer) to service_role;
