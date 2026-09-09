-- VAcleaner v4.3.19: explicit manager-approved confirmation without the standard 200 UAH prepayment.
-- The waiver keeps inventory reservation authoritative while preserving prepayment_paid=false.

create or replace function public.vacleaner_confirm_without_prepayment_v1(
  p_booking_id uuid,
  p_extras jsonb,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns public.vacleaner_bookings
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.vacleaner_bookings%rowtype;
  v_resources jsonb;
  v_now timestamptz := pg_catalog.now();
  v_hold timestamptz := pg_catalog.now() + interval '5 minutes';
begin
  select * into v_booking
    from public.vacleaner_bookings
   where id = p_booking_id
   for update;
  if not found then raise exception 'booking_not_found'; end if;

  if v_booking.status = 'confirmed'
     and coalesce((v_booking.extras->'prepayment_waiver'->>'active')::boolean,false) then
    return v_booking;
  end if;
  if v_booking.status not in ('pending','waiting_payment') then
    raise exception 'invalid_transition';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('resource_code',br.resource_code,'quantity',br.quantity)),
    '[]'::jsonb
  ) into v_resources
  from public.vacleaner_booking_resources br
  where br.booking_id = p_booking_id;

  if jsonb_array_length(v_resources) < 1 then
    raise exception 'invalid_resources';
  end if;

  -- Reuse the canonical reservation authority for the inventory check. Waiting-payment
  -- intentionally does not mark the 200 UAH prepayment as paid.
  perform public.vacleaner_apply_reservation(
    p_booking_id,
    v_booking.start_date,
    v_booking.return_date,
    v_booking.pickup_window,
    v_booking.return_window,
    v_booking.start_at,
    v_booking.end_at,
    v_booking.rental_days,
    v_resources,
    'waiting_payment',
    v_hold
  );

  update public.vacleaner_bookings
     set status = 'confirmed',
         hold_expires_at = null,
         prepayment_paid = false,
         prepayment_amount = 0,
         prepayment_paid_at = null,
         confirmed_at = coalesce(confirmed_at,v_now),
         extras = coalesce(p_extras,extras,'{}'::jsonb),
         customer_name = coalesce(nullif(pg_catalog.btrim(p_customer_name),''),customer_name),
         customer_phone = coalesce(nullif(pg_catalog.btrim(p_customer_phone),''),customer_phone),
         updated_at = v_now
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$function$;

revoke all on function public.vacleaner_confirm_without_prepayment_v1(uuid,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.vacleaner_confirm_without_prepayment_v1(uuid,jsonb,text,text) to service_role;
