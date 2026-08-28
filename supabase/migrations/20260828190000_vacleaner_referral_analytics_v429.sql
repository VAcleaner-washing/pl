-- VAcleaner v4.2.9 · referral analytics + durable communication journal.
-- Logs confirmed referral-program sends so conversion can be measured by channel and cohort.

create table if not exists public.vacleaner_referral_messages (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null references public.vacleaner_customers(phone) on update cascade on delete cascade,
  kind text not null default 'program_invite' check (kind in ('program_invite','reward_reminder')),
  channel text not null check (channel in ('instagram','telegram')),
  reward_id uuid references public.vacleaner_referral_rewards(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint vacleaner_referral_messages_phone_check check (customer_phone ~ '^\\+380[0-9]{9}$')
);

create index if not exists vacleaner_referral_messages_phone_sent_idx
  on public.vacleaner_referral_messages (customer_phone, sent_at desc);
create index if not exists vacleaner_referral_messages_kind_sent_idx
  on public.vacleaner_referral_messages (kind, sent_at desc);
create index if not exists vacleaner_referral_messages_reward_idx
  on public.vacleaner_referral_messages (reward_id)
  where reward_id is not null;

-- Preserve the already-known first referral-program send as an analytics event.
insert into public.vacleaner_referral_messages (customer_phone, kind, channel, sent_at, created_at)
select c.phone, 'program_invite', c.referral_sent_channel, c.referral_sent_at, c.referral_sent_at
from public.vacleaner_customers c
where c.referral_sent_at is not null
  and c.referral_sent_channel in ('instagram','telegram')
  and not exists (
    select 1
    from public.vacleaner_referral_messages m
    where m.customer_phone = c.phone
      and m.kind = 'program_invite'
      and m.sent_at = c.referral_sent_at
  );

alter table public.vacleaner_referral_messages enable row level security;
revoke all on table public.vacleaner_referral_messages from anon, authenticated;
drop policy if exists "VAcleaner deny direct client access" on public.vacleaner_referral_messages;
create policy "VAcleaner deny direct client access"
  on public.vacleaner_referral_messages
  as restrictive for all to anon, authenticated
  using (false) with check (false);

comment on table public.vacleaner_referral_messages is 'Confirmed referral-program and reward-reminder sends used for channel/cohort conversion analytics.';
