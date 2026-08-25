alter table public.vacleaner_sms_dispatch_recipients
  add column if not exists sendpulse_campaign_id bigint;

create index if not exists vacleaner_sms_dispatch_recipients_sendpulse_campaign_idx
  on public.vacleaner_sms_dispatch_recipients (sendpulse_campaign_id)
  where sendpulse_campaign_id is not null;
