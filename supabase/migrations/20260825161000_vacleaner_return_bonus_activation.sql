alter table public.vacleaner_campaigns
  add column if not exists issuance_ends_at timestamptz;

update public.vacleaner_campaigns
set issuance_ends_at = ends_at
where campaign_type in ('return','personal')
  and issuance_ends_at is null;

alter table public.vacleaner_promo_codes
  add column if not exists activated_at timestamptz,
  add column if not exists activation_source text,
  add column if not exists activation_dispatch_id uuid references public.vacleaner_sms_dispatches(id) on delete set null,
  add column if not exists activated_by uuid;

create index if not exists vacleaner_promo_codes_activation_idx
  on public.vacleaner_promo_codes (campaign_id, activated_at desc)
  where activated_at is not null;

-- v4.1.29 treated accepted SMS as activation. v4.1.30 changes the contract:
-- a personalized bonus stays pending until the client opens the SMS link (or an admin activates it).
-- Preserve already redeemed bonuses, but return unredeemed legacy SMS bonuses to pending state.
update public.vacleaner_promo_codes p
set active = false,
    expires_at = null,
    activated_at = null,
    activation_source = null,
    activation_dispatch_id = null,
    activated_by = null
from public.vacleaner_campaigns c
where c.id = p.campaign_id
  and c.campaign_type in ('return','personal')
  and not exists (
    select 1 from public.vacleaner_promo_redemptions r where r.promo_code_id = p.id
  );
