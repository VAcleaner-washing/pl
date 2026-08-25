-- VAcleaner v3.0.30 — preserve the best promo/loyalty discount on ordinary booking edits.
-- Manual manager discount remains an explicit override.
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
  -- Explicit manager detach runs through a service-role-only RPC and is allowed to clear promo state.
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

drop trigger if exists vacleaner_preserve_best_promo_discount_trg on public.vacleaner_bookings;
create trigger vacleaner_preserve_best_promo_discount_trg
before update on public.vacleaner_bookings
for each row execute function public.vacleaner_preserve_best_promo_discount();

revoke all on function public.vacleaner_preserve_best_promo_discount() from public,anon,authenticated;
