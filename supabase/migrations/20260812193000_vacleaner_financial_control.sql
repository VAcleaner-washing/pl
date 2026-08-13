-- VAcleaner v4.0.39 — auditable operating expenses and investments.
-- Access is intentionally restricted to the authenticated admin Edge Function.

create table if not exists public.vacleaner_expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  amount integer not null check (amount between 1 and 10000000),
  category text not null check (category in (
    'chemistry','consumables','repair','delivery','advertising',
    'fees','utilities','other','equipment','improvement'
  )),
  cost_type text not null check (cost_type in ('operating','investment')),
  vendor text check (vendor is null or char_length(vendor) <= 120),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  archived_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (
    (category in ('equipment','improvement') and cost_type = 'investment') or
    (category not in ('equipment','improvement') and cost_type = 'operating')
  ),
  check ((archived_at is null and archived_by is null) or (archived_at is not null and archived_by is not null))
);

create index if not exists vacleaner_expenses_active_date_idx
  on public.vacleaner_expenses(spent_on desc, created_at desc)
  where archived_at is null;
create index if not exists vacleaner_expenses_active_category_idx
  on public.vacleaner_expenses(category, spent_on desc)
  where archived_at is null;
create index if not exists vacleaner_expenses_created_by_idx on public.vacleaner_expenses(created_by);
create index if not exists vacleaner_expenses_updated_by_idx on public.vacleaner_expenses(updated_by);
create index if not exists vacleaner_expenses_archived_by_idx on public.vacleaner_expenses(archived_by) where archived_by is not null;

alter table public.vacleaner_expenses enable row level security;

drop policy if exists vacleaner_expenses_client_deny on public.vacleaner_expenses;
create policy vacleaner_expenses_client_deny
  on public.vacleaner_expenses for all to anon,authenticated
  using (false) with check (false);

revoke all on public.vacleaner_expenses from public,anon,authenticated;
grant select,insert,update on public.vacleaner_expenses to service_role;

comment on table public.vacleaner_expenses is
  'Manual VAcleaner operating expenses and investments. Records are soft-archived for auditability.';
comment on column public.vacleaner_expenses.cost_type is
  'Operating costs affect operating profit; investments are reported separately.';
