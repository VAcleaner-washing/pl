-- VAcleaner v4.0.1 — Smart Guide bonus campaign
alter table public.vacleaner_campaigns drop constraint if exists vacleaner_campaigns_campaign_type_check;
alter table public.vacleaner_campaigns add constraint vacleaner_campaigns_campaign_type_check
  check (campaign_type = any (array['return'::text,'weekday'::text,'product'::text,'personal'::text,'quiz'::text]));

with new_campaign as (
  insert into public.vacleaner_campaigns (
    name,campaign_type,status,discount_type,discount_value,dormant_days,
    allowed_product_codes,allowed_weekdays,min_completed_orders,starts_at,ends_at,
    usage_limit_total,usage_limit_per_customer,updated_at
  )
  select 'Підбір рішення · −5%','quiz','active','percent',5,0,
         array[]::text[],array[]::smallint[],0,now(),null,10000,1,now()
  where not exists (select 1 from public.vacleaner_promo_codes where upper(code)='PIDBIR5')
  returning id
)
insert into public.vacleaner_promo_codes (campaign_id,code,customer_phone,active,expires_at,usage_limit)
select id,'PIDBIR5',null,true,null,10000 from new_campaign;
