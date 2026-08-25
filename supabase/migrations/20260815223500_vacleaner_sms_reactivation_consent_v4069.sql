-- VAcleaner v4.0.69 — SMS reactivation + marketing consent.
-- Applied to production on 2026-08-15. VAcleaner-only objects.

alter table public.vacleaner_customers
  add column if not exists marketing_sms_consent boolean not null default false,
  add column if not exists marketing_sms_consent_at timestamptz,
  add column if not exists marketing_sms_consent_source text,
  add column if not exists marketing_sms_opted_out_at timestamptz;

create table if not exists public.vacleaner_sms_dispatches (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.vacleaner_campaigns(id) on delete set null, sender text not null default 'VACLEANER',
  route text not null default 'national' check (route in ('national','international')), audience_segment text not null default 'sleeping', message_body text not null check (char_length(message_body) between 1 and 402),
  message_parts smallint not null default 1 check (message_parts between 1 and 6), status text not null default 'draft' check (status in ('draft','submitted','sent','partial','failed')), sendpulse_campaign_id bigint,
  audience_count integer not null default 0 check (audience_count>=0), explicit_consent_count integer not null default 0 check (explicit_consent_count>=0), legacy_count integer not null default 0 check (legacy_count>=0),
  sent_count integer not null default 0 check (sent_count>=0), delivered_count integer not null default 0 check (delivered_count>=0), not_delivered_count integer not null default 0 check (not_delivered_count>=0), legacy_attestation boolean not null default false,
  total_cost numeric(12,4), currency text, error_code text, created_by uuid, created_at timestamptz not null default now(), sent_at timestamptz, last_synced_at timestamptz
);
create table if not exists public.vacleaner_sms_dispatch_recipients (
  id uuid primary key default gen_random_uuid(), dispatch_id uuid not null references public.vacleaner_sms_dispatches(id) on delete cascade, customer_phone text not null, customer_name text,
  consent_basis text not null check (consent_basis in ('explicit','legacy_admin_attested')), status text not null default 'queued' check (status in ('queued','submitted','sent','delivered','not_delivered','failed')),
  status_explain text, money_spent numeric(12,4), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(dispatch_id,customer_phone)
);
create index if not exists vacleaner_sms_dispatches_created_idx on public.vacleaner_sms_dispatches(created_at desc);
create index if not exists vacleaner_sms_dispatches_campaign_idx on public.vacleaner_sms_dispatches(campaign_id,created_at desc) where campaign_id is not null;
create index if not exists vacleaner_sms_recipients_phone_idx on public.vacleaner_sms_dispatch_recipients(customer_phone,created_at desc);
create index if not exists vacleaner_sms_recipients_dispatch_idx on public.vacleaner_sms_dispatch_recipients(dispatch_id,status);
create index if not exists vacleaner_customers_sms_consent_idx on public.vacleaner_customers(marketing_sms_consent,marketing_sms_opted_out_at);
alter table public.vacleaner_sms_dispatches enable row level security; alter table public.vacleaner_sms_dispatch_recipients enable row level security;
drop policy if exists vacleaner_sms_dispatches_client_deny on public.vacleaner_sms_dispatches; create policy vacleaner_sms_dispatches_client_deny on public.vacleaner_sms_dispatches for all to anon,authenticated using(false) with check(false);
drop policy if exists vacleaner_sms_recipients_client_deny on public.vacleaner_sms_dispatch_recipients; create policy vacleaner_sms_recipients_client_deny on public.vacleaner_sms_dispatch_recipients for all to anon,authenticated using(false) with check(false);
revoke all on public.vacleaner_sms_dispatches from public,anon,authenticated; revoke all on public.vacleaner_sms_dispatch_recipients from public,anon,authenticated;
grant select,insert,update,delete on public.vacleaner_sms_dispatches to service_role; grant select,insert,update,delete on public.vacleaner_sms_dispatch_recipients to service_role;
