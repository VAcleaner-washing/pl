alter table public.vacleaner_push_subscriptions add column if not exists device_id text;

do $$ begin
  alter table public.vacleaner_push_subscriptions add constraint vacleaner_push_subscriptions_device_id_check check (device_id is null or (char_length(device_id) >= 8 and char_length(device_id) <= 128));
exception when duplicate_object then null; end $$;

create index if not exists vacleaner_push_subscriptions_user_active_idx on public.vacleaner_push_subscriptions (user_id, active, updated_at desc);
create unique index if not exists vacleaner_push_subscriptions_active_user_device_key on public.vacleaner_push_subscriptions (user_id, device_id) where active = true and device_id is not null;

with ranked as (
  select id,row_number() over (partition by user_id order by created_at desc, id desc) rn
  from public.vacleaner_push_subscriptions where active=true
)
update public.vacleaner_push_subscriptions s set active=false,updated_at=now() from ranked r where s.id=r.id and r.rn>2;
