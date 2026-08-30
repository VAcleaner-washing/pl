create table if not exists public.vacleaner_notification_dispatch_claims (
  event_key text primary key,
  booking_id uuid references public.vacleaner_bookings(id) on delete cascade,
  event_type text not null,
  locked_until timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.vacleaner_notification_dispatch_claims enable row level security;
revoke all on table public.vacleaner_notification_dispatch_claims from anon, authenticated;

create or replace function public.vacleaner_claim_notification_dispatch(
  p_event_key text,
  p_booking_id uuid,
  p_event_type text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer := 0;
  safe_lease integer := greatest(30, least(coalesce(p_lease_seconds, 120), 600));
begin
  if coalesce(btrim(p_event_key), '') = '' or length(p_event_key) > 180 then return false; end if;
  insert into public.vacleaner_notification_dispatch_claims(event_key, booking_id, event_type, locked_until, delivered_at, updated_at)
  values (p_event_key, p_booking_id, left(coalesce(p_event_type, 'unknown'), 40), now() + make_interval(secs => safe_lease), null, now())
  on conflict (event_key) do update
    set booking_id = excluded.booking_id,
        event_type = excluded.event_type,
        locked_until = excluded.locked_until,
        updated_at = now()
    where vacleaner_notification_dispatch_claims.delivered_at is null
      and vacleaner_notification_dispatch_claims.locked_until <= now();
  get diagnostics touched = row_count;
  return touched > 0;
end;
$$;

create or replace function public.vacleaner_finish_notification_dispatch(p_event_key text, p_delivered boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_delivered then
    update public.vacleaner_notification_dispatch_claims set delivered_at = coalesce(delivered_at, now()), locked_until = now(), updated_at = now() where event_key = p_event_key;
  else
    update public.vacleaner_notification_dispatch_claims set locked_until = now() - interval '1 second', updated_at = now() where event_key = p_event_key and delivered_at is null;
  end if;
end;
$$;

revoke all on function public.vacleaner_claim_notification_dispatch(text,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.vacleaner_finish_notification_dispatch(text,boolean) from public, anon, authenticated;
grant execute on function public.vacleaner_claim_notification_dispatch(text,uuid,text,integer) to service_role;
grant execute on function public.vacleaner_finish_notification_dispatch(text,boolean) to service_role;

create index if not exists vacleaner_notification_dispatch_claims_booking_idx
  on public.vacleaner_notification_dispatch_claims(booking_id, event_type);
