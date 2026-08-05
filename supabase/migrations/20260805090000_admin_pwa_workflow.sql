alter table public.vacleaner_bookings
  drop constraint if exists vacleaner_bookings_check,
  drop constraint if exists vacleaner_bookings_status_check;

alter table public.vacleaner_bookings
  add column if not exists prepayment_paid boolean not null default false,
  add column if not exists prepayment_paid_at timestamptz,
  add column if not exists deposit_amount integer not null default 0,
  add column if not exists deposit_paid boolean not null default false,
  add column if not exists hold_expires_at timestamptz,
  add column if not exists issued_at timestamptz;

alter table public.vacleaner_bookings
  add constraint vacleaner_bookings_return_date_check check (return_date >= start_date),
  add constraint vacleaner_bookings_status_check check (
    status in ('pending', 'waiting_payment', 'confirmed', 'issued', 'declined', 'cancelled', 'completed')
  ),
  add constraint vacleaner_bookings_deposit_amount_check check (deposit_amount >= 0);

create index if not exists vacleaner_bookings_hold_idx
  on public.vacleaner_bookings (hold_expires_at)
  where status = 'waiting_payment';

create or replace function public.vacleaner_confirm_booking(p_booking_id uuid)
returns public.vacleaner_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.vacleaner_bookings%rowtype;
  v_conflict text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vacleaner-confirm-booking'));

  select *
    into v_booking
    from public.vacleaner_bookings
   where id = p_booking_id
   for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status = 'confirmed' then
    return v_booking;
  end if;

  if v_booking.status not in ('pending', 'waiting_payment') then
    raise exception 'booking_not_pending';
  end if;

  select requested.resource_code
    into v_conflict
    from public.vacleaner_booking_resources requested
    join public.vacleaner_inventory inventory
      on inventory.resource_code = requested.resource_code
   where requested.booking_id = p_booking_id
     and (
       select coalesce(sum(reserved.quantity), 0)
         from public.vacleaner_booking_resources reserved
         join public.vacleaner_bookings active_booking
           on active_booking.id = reserved.booking_id
        where reserved.resource_code = requested.resource_code
          and active_booking.id <> p_booking_id
          and (
            active_booking.status in ('confirmed', 'issued')
            or (
              active_booking.status = 'waiting_payment'
              and active_booking.hold_expires_at > pg_catalog.now()
            )
          )
          and active_booking.start_at < v_booking.end_at
          and active_booking.end_at > v_booking.start_at
     ) + requested.quantity > inventory.capacity
   limit 1;

  if v_conflict is not null then
    raise exception 'inventory_conflict:%', v_conflict;
  end if;

  update public.vacleaner_bookings
     set status = 'confirmed',
         prepayment_paid = true,
         prepayment_paid_at = coalesce(prepayment_paid_at, pg_catalog.now()),
         hold_expires_at = null,
         confirmed_at = coalesce(confirmed_at, pg_catalog.now()),
         updated_at = pg_catalog.now()
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.vacleaner_confirm_booking(uuid) from public, anon, authenticated;
grant execute on function public.vacleaner_confirm_booking(uuid) to service_role;
