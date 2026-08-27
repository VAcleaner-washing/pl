-- VAcleaner v4.2.1 · referral query performance
create index if not exists vacleaner_referral_rewards_referred_phone_idx
  on public.vacleaner_referral_rewards (referred_phone);
