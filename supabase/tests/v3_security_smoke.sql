-- Run with a privileged connection after migration. Every row must return false/true as noted.
select
  has_table_privilege('anon', 'public.vacleaner_bookings', 'select') as anon_can_read_bookings_should_be_false,
  has_table_privilege('authenticated', 'public.vacleaner_customers', 'select') as authenticated_can_read_customers_should_be_false,
  has_table_privilege('anon', 'public.vacleaner_settings', 'update') as anon_can_update_settings_should_be_false;

select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('vacleaner_bookings','vacleaner_customers','vacleaner_settings','vacleaner_booking_audit')
order by relname;

select count(*) >= 0 as audit_table_available
from public.vacleaner_booking_audit;
