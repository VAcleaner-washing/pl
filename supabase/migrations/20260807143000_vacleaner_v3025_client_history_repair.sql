-- VAcleaner v3.0.25
-- Idempotent repair for customer-profile completeness and historical extra labels.
-- No historical prices are reconstructed: old total_amount values stay authoritative.

with latest as (
  select distinct on (regexp_replace(customer_phone,'\D','','g'))
    regexp_replace(customer_phone,'\D','','g') as digits,
    customer_phone,
    customer_name,
    customer_telegram,
    fulfillment,
    fulfillment_address
  from public.vacleaner_bookings
  where customer_phone ~ '^\+?380[0-9]{9}$'
  order by regexp_replace(customer_phone,'\D','','g'), start_at desc nulls last, created_at desc
), missing as (
  select latest.*
  from latest
  left join public.vacleaner_customers customer
    on regexp_replace(customer.phone,'\D','','g') = latest.digits
  where customer.phone is null
)
insert into public.vacleaner_customers(phone,name,telegram,address,created_at,updated_at)
select
  customer_phone,
  customer_name,
  nullif(customer_telegram,''),
  case when fulfillment='delivery' then nullif(fulfillment_address,'') else null end,
  now(),
  now()
from missing
on conflict(phone) do nothing;

with mapping(booking_code,code,label) as (
  values
    ('HIST-250329-2C42EE','neutralix','Neutralix · концентрат'),
    ('HIST-250707-448232','neutralix','Neutralix · концентрат'),
    ('HIST-250710-4F6816','neutralix','Neutralix · концентрат'),
    ('HIST-250923-F42A01','neutralix','Neutralix · концентрат'),
    ('HIST-260110-858B91','neutralix','Neutralix · концентрат'),
    ('HIST-260322-76EF94','neutralix','Neutralix · концентрат'),
    ('HIST-260617-7A5132','neutralix','Neutralix · концентрат'),
    ('HIST-240521-BA56ED','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-240606-5D53CA','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-240803-C7A973','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-240915-E538AA','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-241109-AEC5C0','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-241123-4AAA87','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-241223-D855AF','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-241226-848A4A','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250206-2E06D2','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250402-BFDFCB','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250416-7F64C1','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250602-202E46','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250611-AC5C8E','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250809-07A3DA','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250826-061005','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-250904-1A271E','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-251012-8A9EAA','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-251114-0F7272','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-251115-56CC11','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-251215-ACA206','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-251217-F86049','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-251219-9AACB1','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260302-EE04D5','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260328-69CF16','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260426-150939','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260509-1A623B','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260516-0D5E92','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260612-31A8B8','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260710-438D55','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260712-65A17D','premium_nozzles','Насадки «Преміум» до SC 2'),
    ('HIST-260728-B7B374','premium_nozzles','Насадки «Преміум» до SC 2')
), target as (
  select booking.id, booking.extras, mapping.code, mapping.label
  from public.vacleaner_bookings booking
  join mapping using (booking_code)
  where booking.booking_code like 'HIST-%'
    and not coalesce(booking.extras->'selected_items','[]'::jsonb)
      @> jsonb_build_array(jsonb_build_object('code',mapping.code))
)
update public.vacleaner_bookings booking
set
  extras = jsonb_set(
    coalesce(booking.extras,'{}'::jsonb),
    '{selected_items}',
    coalesce(booking.extras->'selected_items','[]'::jsonb)
      || jsonb_build_array(jsonb_build_object(
        'code',target.code,
        'label',target.label,
        'price',0,
        'historical',true,
        'included_in_total',true
      )),
    true
  ),
  updated_at = now()
from target
where booking.id = target.id;
