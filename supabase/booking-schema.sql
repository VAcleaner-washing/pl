create table if not exists public.vacleaner_inventory (
  resource_code text primary key,
  label text not null,
  capacity integer not null check (capacity > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.vacleaner_inventory (resource_code, label, capacity)
values
  ('puzzi', 'Kärcher Puzzi 8/1', 2),
  ('sc2', 'Kärcher SC 2 Deluxe', 2),
  ('jimmy', 'Jimmy', 2),
  ('abir', 'Робот для вікон ABIR', 2)
on conflict (resource_code) do update
set label = excluded.label,
    capacity = excluded.capacity,
    active = true,
    updated_at = now();

create table if not exists public.vacleaner_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  product_code text not null,
  product_label text not null,
  start_date date not null,
  return_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  pickup_window text not null check (pickup_window in ('morning', 'evening')),
  return_window text not null check (return_window in ('morning', 'evening')),
  rental_days integer not null check (rental_days >= 1 and rental_days <= 14),
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  fulfillment_address text check (fulfillment_address is null or char_length(fulfillment_address) <= 180),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (char_length(customer_phone) between 10 and 20),
  customer_telegram text,
  customer_comment text check (customer_comment is null or char_length(customer_comment) <= 800),
  extras jsonb not null default '[]'::jsonb,
  base_amount integer not null check (base_amount >= 0),
  extras_amount integer not null default 0 check (extras_amount >= 0),
  delivery_amount integer not null default 0 check (delivery_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  prepayment_amount integer not null default 200 check (prepayment_amount >= 0),
  prepayment_paid boolean not null default false,
  prepayment_paid_at timestamptz,
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  deposit_paid boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'waiting_payment', 'confirmed', 'issued', 'declined', 'cancelled', 'completed')),
  source text not null default 'vacleaner_website',
  hold_expires_at timestamptz,
  ip_hash text,
  admin_note text check (admin_note is null or char_length(admin_note) <= 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  issued_at timestamptz,
  completed_at timestamptz,
  check (return_date >= start_date),
  check (end_at > start_at)
);

create table if not exists public.vacleaner_booking_resources (
  booking_id uuid not null references public.vacleaner_bookings(id) on delete cascade,
  resource_code text not null references public.vacleaner_inventory(resource_code),
  quantity integer not null default 1 check (quantity > 0),
  primary key (booking_id, resource_code)
);

create index if not exists vacleaner_bookings_period_idx
  on public.vacleaner_bookings (status, start_at, end_at);

create index if not exists vacleaner_bookings_phone_idx
  on public.vacleaner_bookings (customer_phone, created_at desc);

create index if not exists vacleaner_booking_resources_resource_idx
  on public.vacleaner_booking_resources (resource_code, booking_id);

alter table public.vacleaner_inventory enable row level security;
alter table public.vacleaner_bookings enable row level security;
alter table public.vacleaner_booking_resources enable row level security;

revoke all on table public.vacleaner_inventory from public, anon, authenticated;
revoke all on table public.vacleaner_bookings from public, anon, authenticated;
revoke all on table public.vacleaner_booking_resources from public, anon, authenticated;

grant select, insert, update, delete on table public.vacleaner_inventory to service_role;
grant select, insert, update, delete on table public.vacleaner_bookings to service_role;
grant select, insert, update, delete on table public.vacleaner_booking_resources to service_role;

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

  if v_booking.status <> 'pending' then
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
         join public.vacleaner_bookings confirmed
           on confirmed.id = reserved.booking_id
        where reserved.resource_code = requested.resource_code
          and confirmed.status = 'confirmed'
          and confirmed.start_at < v_booking.end_at
          and confirmed.end_at > v_booking.start_at
     ) + requested.quantity > inventory.capacity
   limit 1;

  if v_conflict is not null then
    raise exception 'inventory_conflict:%', v_conflict;
  end if;

  update public.vacleaner_bookings
     set status = 'confirmed',
         confirmed_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.vacleaner_confirm_booking(uuid) from public, anon, authenticated;
grant execute on function public.vacleaner_confirm_booking(uuid) to service_role;
