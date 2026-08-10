alter table public.vacleaner_push_subscriptions
  add column if not exists admin_alias text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vacleaner_push_subscriptions_admin_alias_check'
      and conrelid = 'public.vacleaner_push_subscriptions'::regclass
  ) then
    alter table public.vacleaner_push_subscriptions
      add constraint vacleaner_push_subscriptions_admin_alias_check
      check (admin_alias is null or admin_alias in ('vacleaner', 'annanevidoma'));
  end if;
end
$$;

create index if not exists vacleaner_push_subscriptions_admin_alias_active_idx
  on public.vacleaner_push_subscriptions (user_id, admin_alias, active, updated_at desc);

comment on column public.vacleaner_push_subscriptions.admin_alias is
  'VAcleaner manager alias used to exclude the administrator who initiated a booking event push.';
