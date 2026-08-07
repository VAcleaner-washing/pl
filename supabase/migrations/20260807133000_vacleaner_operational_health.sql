-- VAcleaner v3.0.29 operational health: runtime proof that reservation authority
-- still contains the transaction lock, half-open slot checks and capacity hard-block.

create or replace function public.vacleaner_operational_health()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_definition text := '';
  v_lock boolean := false;
  v_half_open boolean := false;
  v_capacity_block boolean := false;
  v_pending_non_reserving boolean := false;
begin
  select pg_catalog.pg_get_functiondef(p.oid)
    into v_definition
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'vacleaner_apply_reservation'
   order by p.oid desc
   limit 1;

  if coalesce(v_definition,'') <> '' then
    v_lock := pg_catalog.strpos(v_definition, 'pg_advisory_xact_lock') > 0;
    v_half_open := pg_catalog.strpos(v_definition, 'vacleaner_slot_index(b.return_date,b.return_window) > v_slot') > 0;
    v_capacity_block := pg_catalog.strpos(v_definition, 'v_reserved + v_resource.quantity > v_capacity') > 0
      and pg_catalog.strpos(v_definition, 'inventory_conflict') > 0;
    v_pending_non_reserving := pg_catalog.strpos(v_definition, 'p_target_status <> ''pending''') > 0;
  end if;

  return pg_catalog.jsonb_build_object(
    'authority', 'vacleaner_apply_reservation',
    'version', 1,
    'functionPresent', coalesce(v_definition,'') <> '',
    'transactionLock', v_lock,
    'halfOpenSlots', v_half_open,
    'capacityHardBlock', v_capacity_block,
    'pendingDoesNotReserve', v_pending_non_reserving,
    'healthy', v_lock and v_half_open and v_capacity_block and v_pending_non_reserving
  );
end;
$function$;

revoke all on function public.vacleaner_operational_health() from public, anon, authenticated;
grant execute on function public.vacleaner_operational_health() to service_role;
