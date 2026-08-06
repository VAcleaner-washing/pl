create table if not exists public.vacleaner_customers (
  phone text primary key,
  name text not null default '',
  telegram text,
  address text,
  document_type text,
  document_number text,
  document_verified_at timestamptz,
  document_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacleaner_customers_phone_format check (phone ~ '^\+380[0-9]{9}$'),
  constraint vacleaner_customers_document_type check (document_type is null or document_type in ('Паспорт','ID-картка','Водійське посвідчення'))
);
alter table public.vacleaner_customers enable row level security;
revoke all on table public.vacleaner_customers from anon, authenticated;
create index if not exists vacleaner_customers_updated_idx on public.vacleaner_customers(updated_at desc);

alter table public.vacleaner_bookings
  add column if not exists issue_payment_amount integer not null default 0,
  add column if not exists issue_payment_paid boolean not null default false,
  add column if not exists issue_payment_paid_at timestamptz,
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists deposit_returned boolean not null default false,
  add column if not exists deposit_returned_at timestamptz;

alter table public.vacleaner_bookings
  drop constraint if exists vacleaner_bookings_issue_payment_amount_nonnegative,
  add constraint vacleaner_bookings_issue_payment_amount_nonnegative check (issue_payment_amount >= 0),
  drop constraint if exists vacleaner_bookings_deposit_amount_nonnegative,
  add constraint vacleaner_bookings_deposit_amount_nonnegative check (deposit_amount >= 0);

update public.vacleaner_bookings
set issue_payment_amount = case when deposit_paid or status in ('issued','completed') then deposit_amount else issue_payment_amount end,
    issue_payment_paid = case when deposit_paid or status in ('issued','completed') then true else issue_payment_paid end,
    issue_payment_paid_at = case when deposit_paid or status in ('issued','completed') then coalesce(issued_at, updated_at) else issue_payment_paid_at end;

with flags as (
  select b.id,
    exists(select 1 from generate_series(b.start_date, b.return_date, interval '1 day') d where extract(dow from d)=6) as has_saturday,
    exists(select 1 from generate_series(b.start_date, b.return_date, interval '1 day') d where extract(dow from d)=0) as has_sunday
  from public.vacleaner_bookings b
)
update public.vacleaner_bookings b
set deposit_amount = case
      when b.product_code = 'elite' then case when f.has_saturday and f.has_sunday then 4000 else 3000 end
      when b.product_code = 'general' then case when f.has_saturday and f.has_sunday then 3000 else 2000 end
      when b.product_code in ('puzzi_jimmy','puzzi_abir','combo','ideal_windows') then case when f.has_saturday and f.has_sunday then 3000 else 1500 end
      else case when f.has_saturday and f.has_sunday then 2000 else 1000 end
    end,
    deposit_paid = false,
    deposit_paid_at = null,
    deposit_returned = false,
    deposit_returned_at = null
from flags f
where b.id = f.id;

insert into public.vacleaner_settings(key,value,updated_at)
values ('deposit_rules', '{"oneUnit":{"day":1000,"weekend":2000},"twoUnits":{"day":1500,"weekend":3000},"general":{"day":2000,"weekend":3000},"elite":{"day":3000,"weekend":4000}}'::jsonb, now())
on conflict (key) do nothing;
