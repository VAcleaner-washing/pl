-- VAcleaner v4.2.34 · repair referral message phone validation.
-- v4.2.9 used a double-escaped regex in a standard PostgreSQL string, so valid
-- +380XXXXXXXXX phones were rejected by vacleaner_referral_messages_phone_check.

alter table public.vacleaner_referral_messages
  drop constraint if exists vacleaner_referral_messages_phone_check;

alter table public.vacleaner_referral_messages
  add constraint vacleaner_referral_messages_phone_check
  check (customer_phone ~ '^[+]380[0-9]{9}$');
