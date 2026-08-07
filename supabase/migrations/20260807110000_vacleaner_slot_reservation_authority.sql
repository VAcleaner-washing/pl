-- VAcleaner v3.0.23 stabilization: one authoritative half-open slot inventory model.
-- A return in a slot releases the resource for a pickup in the same slot.

create or replace function public.vacleaner_slot_index(p_date date, p_window text)
returns bigint
language sql
immutable
strict
set search_path = ''
as $$
  select case p_window
    when 'morning' then ((p_date - date '2000-01-01')::bigint * 2)
    when 'evening' then ((p_date - date '2000-01-01')::bigint * 2 + 1)
    else null
  end;
$$;

create or replace function public.vacleaner_apply_reservation(
  p_booking_id uuid,
  p_start_date date,
  p_return_date date,
  p_pickup_window text,
  p_return_window text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_rental_days integer,
  p_resources jsonb,
  p_target_status text,
  p_hold_expires_at timestamptz default null
)
returns public.vacleaner_bookings
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.vacleaner_bookings%rowtype;
  v_start_slot bigint;
  v_end_slot bigint;
  v_resource record;
  v_capacity integer;
  v_reserved integer;
  v_slot bigint;
  v_now timestamptz := pg_catalog.now();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vacleaner-slot-reservation-v1'));

  select * into v_booking
    from public.vacleaner_bookings
   where id = p_booking_id
   for update;
  if not found then raise exception 'booking_not_found'; end if;

  if p_target_status not in ('pending','waiting_payment','confirmed','issued') then
    raise exception 'invalid_target_status';
  end if;
  if p_pickup_window not in ('morning','evening') or p_return_window not in ('morning','evening') then
    raise exception 'invalid_window';
  end if;
  if p_return_date < p_start_date or p_rental_days < 1 or p_rental_days > 14 or p_end_at <= p_start_at then
    raise exception 'invalid_rental_period';
  end if;
  if p_resources is null or jsonb_typeof(p_resources) <> 'array' or jsonb_array_length(p_resources) < 1 then
    raise exception 'invalid_resources';
  end if;
  if p_target_status = 'waiting_payment' and p_hold_expires_at is null then
    raise exception 'invalid_hold';
  end if;

  v_start_slot := public.vacleaner_slot_index(p_start_date, p_pickup_window);
  v_end_slot := public.vacleaner_slot_index(p_return_date, p_return_window);
  if v_start_slot is null or v_end_slot is null or v_end_slot <= v_start_slot then
    raise exception 'invalid_rental_period';
  end if;

  -- Pending requests do not reserve stock. Waiting-payment / confirmed / issued
  -- reservations are checked per occupied half-day slot using half-open [start,end).
  if p_target_status <> 'pending' then
    for v_resource in
      select r.resource_code, sum(r.quantity)::integer as quantity
        from jsonb_to_recordset(p_resources) as r(resource_code text, quantity integer)
       where r.resource_code is not null and r.quantity > 0
       group by r.resource_code
    loop
      select i.capacity into v_capacity
        from public.vacleaner_inventory i
       where i.resource_code = v_resource.resource_code
         and i.active = true
       for share;
      if v_capacity is null then raise exception 'inventory_missing:%', v_resource.resource_code; end if;

      for v_slot in select * from pg_catalog.generate_series(v_start_slot, v_end_slot - 1)
      loop
        select coalesce(sum(br.quantity),0)::integer
          into v_reserved
          from public.vacleaner_booking_resources br
          join public.vacleaner_bookings b on b.id = br.booking_id
         where br.resource_code = v_resource.resource_code
           and b.id <> p_booking_id
           and (
             b.status in ('confirmed','issued')
             or (b.status = 'waiting_payment' and b.hold_expires_at > v_now)
           )
           and public.vacleaner_slot_index(b.start_date,b.pickup_window) <= v_slot
           and public.vacleaner_slot_index(b.return_date,b.return_window) > v_slot;

        if v_reserved + v_resource.quantity > v_capacity then
          raise exception 'inventory_conflict:%:%', v_resource.resource_code, v_slot;
        end if;
      end loop;
    end loop;
  end if;

  update public.vacleaner_bookings
     set start_date = p_start_date,
         return_date = p_return_date,
         pickup_window = p_pickup_window,
         return_window = p_return_window,
         start_at = p_start_at,
         end_at = p_end_at,
         rental_days = p_rental_days,
         status = p_target_status,
         hold_expires_at = case when p_target_status = 'waiting_payment' then p_hold_expires_at else null end,
         prepayment_paid = case when p_target_status = 'confirmed' then true else prepayment_paid end,
         prepayment_paid_at = case when p_target_status = 'confirmed' then coalesce(prepayment_paid_at,v_now) else prepayment_paid_at end,
         confirmed_at = case when p_target_status = 'confirmed' then coalesce(confirmed_at,v_now) else confirmed_at end,
         issued_at = case when p_target_status = 'issued' then coalesce(issued_at,v_now) else issued_at end,
         updated_at = v_now
   where id = p_booking_id
   returning * into v_booking;

  delete from public.vacleaner_booking_resources where booking_id = p_booking_id;
  insert into public.vacleaner_booking_resources(booking_id,resource_code,quantity)
  select p_booking_id, r.resource_code, sum(r.quantity)::integer
    from jsonb_to_recordset(p_resources) as r(resource_code text, quantity integer)
   where r.resource_code is not null and r.quantity > 0
   group by r.resource_code;

  return v_booking;
end;
$function$;

create or replace function public.vacleaner_confirm_booking(p_booking_id uuid)
returns public.vacleaner_bookings
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.vacleaner_bookings%rowtype;
  v_resources jsonb;
begin
  select * into v_booking from public.vacleaner_bookings where id=p_booking_id;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.status = 'confirmed' then return v_booking; end if;
  if v_booking.status not in ('pending','waiting_payment') then raise exception 'booking_not_pending'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('resource_code',br.resource_code,'quantity',br.quantity)),'[]'::jsonb)
    into v_resources
    from public.vacleaner_booking_resources br
   where br.booking_id=p_booking_id;

  return public.vacleaner_apply_reservation(
    p_booking_id,
    v_booking.start_date,
    v_booking.return_date,
    v_booking.pickup_window,
    v_booking.return_window,
    v_booking.start_at,
    v_booking.end_at,
    v_booking.rental_days,
    v_resources,
    'confirmed',
    null
  );
end;
$function$;

revoke all on function public.vacleaner_apply_reservation(uuid,date,date,text,text,timestamptz,timestamptz,integer,jsonb,text,timestamptz) from public, anon, authenticated;
grant execute on function public.vacleaner_apply_reservation(uuid,date,date,text,text,timestamptz,timestamptz,integer,jsonb,text,timestamptz) to service_role;
revoke all on function public.vacleaner_confirm_booking(uuid) from public, anon, authenticated;
grant execute on function public.vacleaner_confirm_booking(uuid) to service_role;
