-- VAcleaner v4.2.1 · «Приведи друга»
-- Permanent personal referral code; friend gets 100 UAH on first rental;
-- referrer earns a 150 UAH reward after the friend's completed rental.
-- Earned reward is valid for 150 days and may stack with the permanent loyalty tier only.

alter table public.vacleaner_customers
  add column if not exists instagram text,
  add column if not exists preferred_contact text,
  add column if not exists referral_sent_at timestamptz,
  add column if not exists referral_sent_channel text;

alter table public.vacleaner_customers
  drop constraint if exists vacleaner_customers_preferred_contact_check;
alter table public.vacleaner_customers
  add constraint vacleaner_customers_preferred_contact_check
  check (preferred_contact is null or preferred_contact in ('phone','telegram','instagram'));

alter table public.vacleaner_customers
  drop constraint if exists vacleaner_customers_referral_sent_channel_check;
alter table public.vacleaner_customers
  add constraint vacleaner_customers_referral_sent_channel_check
  check (referral_sent_channel is null or referral_sent_channel in ('telegram','instagram'));

alter table public.vacleaner_bookings
  add column if not exists customer_instagram text,
  add column if not exists preferred_contact text;

alter table public.vacleaner_bookings
  drop constraint if exists vacleaner_bookings_preferred_contact_check;
alter table public.vacleaner_bookings
  add constraint vacleaner_bookings_preferred_contact_check
  check (preferred_contact is null or preferred_contact in ('phone','telegram','instagram'));

create table if not exists public.vacleaner_referral_codes (
  owner_phone text primary key references public.vacleaner_customers(phone) on update cascade on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacleaner_referral_codes_phone_check check (owner_phone ~ '^\\+380[0-9]{9}$'),
  constraint vacleaner_referral_codes_code_check check (code ~ '^VA-[A-Z0-9]{6,12}$')
);

create table if not exists public.vacleaner_referral_uses (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  referrer_phone text not null references public.vacleaner_customers(phone) on update cascade on delete restrict,
  referred_phone text not null references public.vacleaner_customers(phone) on update cascade on delete restrict,
  booking_id uuid not null unique references public.vacleaner_bookings(id) on delete cascade,
  friend_discount_amount integer not null default 100 check (friend_discount_amount = 100),
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint vacleaner_referral_uses_phone_check check (referred_phone ~ '^\\+380[0-9]{9}$'),
  constraint vacleaner_referral_no_self_check check (referrer_phone <> referred_phone)
);

-- A cancelled first attempt must not burn the friend's eligibility.
create unique index if not exists vacleaner_referral_uses_active_friend_uidx
  on public.vacleaner_referral_uses (referred_phone)
  where status in ('pending','completed');
create index if not exists vacleaner_referral_uses_referrer_idx
  on public.vacleaner_referral_uses (referrer_phone, status, created_at desc);

create table if not exists public.vacleaner_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_phone text not null references public.vacleaner_customers(phone) on update cascade on delete restrict,
  referred_phone text not null references public.vacleaner_customers(phone) on update cascade on delete restrict,
  source_booking_id uuid not null unique references public.vacleaner_bookings(id) on delete restrict,
  amount integer not null default 150 check (amount = 150),
  status text not null default 'active' check (status in ('active','used','expired','cancelled')),
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_booking_id uuid unique references public.vacleaner_bookings(id) on delete set null,
  used_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacleaner_referral_rewards_phone_check check (referred_phone ~ '^\\+380[0-9]{9}$'),
  constraint vacleaner_referral_rewards_no_self_check check (referrer_phone <> referred_phone),
  constraint vacleaner_referral_reward_expiry_check check (expires_at > activated_at)
);

create index if not exists vacleaner_referral_rewards_available_idx
  on public.vacleaner_referral_rewards (referrer_phone, expires_at)
  where status = 'active';
create index if not exists vacleaner_referral_rewards_expiring_idx
  on public.vacleaner_referral_rewards (expires_at, reminded_at)
  where status = 'active';

-- Backfill one permanent code for every existing customer with at least one completed VAcleaner rental.
-- Seven MD5 hex characters keep the code short while making collisions extremely unlikely;
-- ON CONFLICT also makes the migration safe to rerun.
insert into public.vacleaner_referral_codes (owner_phone, code)
select c.phone, 'VA-' || upper(substr(md5(c.phone || ':vacleaner-referral-v1'), 1, 7))
from public.vacleaner_customers c
where exists (
  select 1 from public.vacleaner_bookings b
  where b.customer_phone = c.phone and b.status = 'completed'
)
on conflict (owner_phone) do nothing;

-- Edge Functions use service_role. Browser roles must never read referral relationships directly.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'vacleaner_referral_codes',
    'vacleaner_referral_uses',
    'vacleaner_referral_rewards'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'VAcleaner deny direct client access', table_name);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      'VAcleaner deny direct client access', table_name
    );
  end loop;
end
$$;

comment on table public.vacleaner_referral_codes is 'Permanent VAcleaner customer referral codes. One active code per customer.';
comment on table public.vacleaner_referral_uses is 'Friend-side referral usage. 100 UAH only for a genuinely new client; cancelled booking releases eligibility.';
comment on table public.vacleaner_referral_rewards is '150 UAH earned referral rewards. Valid 150 days; one reward per booking; may stack with loyalty only.';
