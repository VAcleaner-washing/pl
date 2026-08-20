alter table public.vacleaner_sms_dispatches
  add column if not exists sendpulse_addressbook_id bigint,
  add column if not exists personalized boolean not null default false;

alter table public.vacleaner_sms_dispatch_recipients
  add column if not exists promo_code text,
  add column if not exists promo_link text;

comment on column public.vacleaner_sms_dispatches.sendpulse_addressbook_id is 'Temporary SendPulse mailing list used for per-recipient SMS variables; cleaned after terminal sync.';
comment on column public.vacleaner_sms_dispatches.personalized is 'True when the SMS body uses per-recipient promo links.';
comment on column public.vacleaner_sms_dispatch_recipients.promo_code is 'Personal promo code attached to this SMS recipient.';
comment on column public.vacleaner_sms_dispatch_recipients.promo_link is 'Short booking link carrying the personal promo fragment.';
