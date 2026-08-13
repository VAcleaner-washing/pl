-- VAcleaner v3.0.30 — retention campaigns and promo codes.
-- Isolated VAcleaner tables only. No VA HOME objects are touched.

create table if not exists public.vacleaner_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text not null check (campaign_type in ('return','weekday','product','personal')),
  status text not null default 'active' check (status in ('active','paused','ended')),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  dormant_days integer not null default 180 check (dormant_days between 0 and 730),
  allowed_product_codes text[] not null default '{}'::text[],
  allowed_weekdays smallint[] not null default '{}'::smallint[],
  min_completed_orders integer not null default 0 check (min_completed_orders between 0 and 10000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  usage_limit_total integer,
  usage_limit_per_customer integer not null default 1 check (usage_limit_per_customer between 1 and 100),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (usage_limit_total is null or usage_limit_total > 0)
);

create table if not exists public.vacleaner_promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.vacleaner_campaigns(id) on delete cascade,
  code text not null,
  customer_phone text,
  active boolean not null default true,
  expires_at timestamptz,
  usage_limit integer not null default 1 check (usage_limit between 1 and 10000),
  created_at timestamptz not null default now()
);

create unique index if not exists vacleaner_promo_codes_code_upper_uidx
  on public.vacleaner_promo_codes ((upper(code)));
create index if not exists vacleaner_promo_codes_campaign_idx
  on public.vacleaner_promo_codes(campaign_id);
create index if not exists vacleaner_promo_codes_phone_idx
  on public.vacleaner_promo_codes(customer_phone) where customer_phone is not null;

create table if not exists public.vacleaner_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.vacleaner_campaigns(id) on delete restrict,
  promo_code_id uuid not null references public.vacleaner_promo_codes(id) on delete restrict,
  booking_id uuid not null references public.vacleaner_bookings(id) on delete restrict,
  customer_phone text not null,
  discount_amount integer not null check (discount_amount >= 0),
  base_before_discount integer not null check (base_before_discount >= 0),
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists vacleaner_promo_redemptions_campaign_idx
  on public.vacleaner_promo_redemptions(campaign_id,created_at desc);
create index if not exists vacleaner_promo_redemptions_phone_idx
  on public.vacleaner_promo_redemptions(customer_phone,created_at desc);

alter table public.vacleaner_campaigns enable row level security;
alter table public.vacleaner_promo_codes enable row level security;
alter table public.vacleaner_promo_redemptions enable row level security;

drop policy if exists vacleaner_campaigns_client_deny on public.vacleaner_campaigns;
create policy vacleaner_campaigns_client_deny on public.vacleaner_campaigns for all to anon,authenticated using (false) with check (false);
drop policy if exists vacleaner_promo_codes_client_deny on public.vacleaner_promo_codes;
create policy vacleaner_promo_codes_client_deny on public.vacleaner_promo_codes for all to anon,authenticated using (false) with check (false);
drop policy if exists vacleaner_promo_redemptions_client_deny on public.vacleaner_promo_redemptions;
create policy vacleaner_promo_redemptions_client_deny on public.vacleaner_promo_redemptions for all to anon,authenticated using (false) with check (false);

revoke all on public.vacleaner_campaigns from public,anon,authenticated;
revoke all on public.vacleaner_promo_codes from public,anon,authenticated;
revoke all on public.vacleaner_promo_redemptions from public,anon,authenticated;
grant select,insert,update,delete on public.vacleaner_campaigns to service_role;
grant select,insert,update,delete on public.vacleaner_promo_codes to service_role;
grant select,insert,update,delete on public.vacleaner_promo_redemptions to service_role;

create or replace function public.vacleaner_redeem_promo(
  p_promo_code_id uuid,
  p_campaign_id uuid,
  p_booking_id uuid,
  p_customer_phone text,
  p_discount_amount integer,
  p_base_before_discount integer
)
returns public.vacleaner_promo_redemptions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code public.vacleaner_promo_codes%rowtype;
  v_campaign public.vacleaner_campaigns%rowtype;
  v_total integer;
  v_customer integer;
  v_result public.vacleaner_promo_redemptions%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vacleaner-promo:' || p_promo_code_id::text));
  select * into v_code from public.vacleaner_promo_codes where id=p_promo_code_id for update;
  if not found or v_code.campaign_id<>p_campaign_id or not v_code.active then raise exception 'promo_unavailable'; end if;
  select * into v_campaign from public.vacleaner_campaigns where id=p_campaign_id for update;
  if not found or v_campaign.status<>'active' then raise exception 'promo_unavailable'; end if;
  if v_campaign.starts_at>pg_catalog.now() or (v_campaign.ends_at is not null and v_campaign.ends_at<=pg_catalog.now()) then raise exception 'promo_expired'; end if;
  if v_code.expires_at is not null and v_code.expires_at<=pg_catalog.now() then raise exception 'promo_expired'; end if;
  if v_code.customer_phone is not null and v_code.customer_phone<>p_customer_phone then raise exception 'promo_customer_mismatch'; end if;

  select count(*)::integer into v_total from public.vacleaner_promo_redemptions where promo_code_id=p_promo_code_id;
  if v_total>=v_code.usage_limit then raise exception 'promo_limit_reached'; end if;
  if v_campaign.usage_limit_total is not null then
    select count(*)::integer into v_total from public.vacleaner_promo_redemptions where campaign_id=p_campaign_id;
    if v_total>=v_campaign.usage_limit_total then raise exception 'promo_limit_reached'; end if;
  end if;
  select count(*)::integer into v_customer from public.vacleaner_promo_redemptions where campaign_id=p_campaign_id and customer_phone=p_customer_phone;
  if v_customer>=v_campaign.usage_limit_per_customer then raise exception 'promo_customer_limit'; end if;

  insert into public.vacleaner_promo_redemptions(campaign_id,promo_code_id,booking_id,customer_phone,discount_amount,base_before_discount)
  values(p_campaign_id,p_promo_code_id,p_booking_id,p_customer_phone,p_discount_amount,p_base_before_discount)
  returning * into v_result;
  return v_result;
end;
$function$;

revoke all on function public.vacleaner_redeem_promo(uuid,uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.vacleaner_redeem_promo(uuid,uuid,uuid,text,integer,integer) to service_role;
