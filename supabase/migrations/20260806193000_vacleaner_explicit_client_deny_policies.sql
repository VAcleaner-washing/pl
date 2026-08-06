-- VAcleaner data is accessed through authenticated Edge Functions using service_role.
-- Keep browser roles explicitly denied even if grants are accidentally restored later.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vacleaner_admin_users',
    'vacleaner_booking_audit',
    'vacleaner_booking_resources',
    'vacleaner_bookings',
    'vacleaner_customers',
    'vacleaner_inventory',
    'vacleaner_push_config',
    'vacleaner_push_subscriptions',
    'vacleaner_settings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'VAcleaner deny direct client access', table_name);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      'VAcleaner deny direct client access',
      table_name
    );
  end loop;
end
$$;
