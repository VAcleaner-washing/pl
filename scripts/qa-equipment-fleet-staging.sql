-- Execute only on isolated R4. Every fixture and change is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); request_id uuid := gen_random_uuid(); u1 uuid; u2 uuid; b1 uuid; b2 uuid;
  r jsonb; blocked boolean; before_events integer;
begin
  if not exists(select 1 from vacleaner_stage.identity) then
    raise exception 'isolated_stage_identity_required';
  end if;
  if has_table_privilege('anon','public.vacleaner_equipment_units','SELECT')
     or has_table_privilege('authenticated','public.vacleaner_equipment_units','UPDATE')
     or has_function_privilege('authenticated','public.vacleaner_admin_set_equipment_unit_status(uuid,text,text,uuid)','EXECUTE')
     or has_function_privilege('anon','public.vacleaner_admin_add_equipment_unit(text,text,uuid,uuid)','EXECUTE') then
    raise exception 'direct_client_privilege_leak';
  end if;
  -- Remove existing synthetic demand from this resource inside this transaction.
  delete from public.vacleaner_booking_resources where resource_code='abir';
  update public.vacleaner_equipment_units set status='ready' where resource_code='abir';
  update public.vacleaner_inventory set capacity=(select count(*) from public.vacleaner_equipment_units where resource_code='abir') where resource_code='abir';
  select id into u1 from public.vacleaner_equipment_units where resource_code='abir' and unit_number=1;
  select id into u2 from public.vacleaner_equipment_units where resource_code='abir' and unit_number=2;
  if u1 is null or u2 is null then raise exception 'two_synthetic_units_required'; end if;
  insert into public.vacleaner_bookings(booking_code,product_code,product_label,start_date,return_date,start_at,end_at,pickup_window,return_window,rental_days,fulfillment,customer_name,customer_phone,base_amount,total_amount,status)
    values('QA-FLEET-'||a,'abir','Synthetic QA','2035-01-01','2035-01-02','2035-01-01 08:00+02','2035-01-02 08:00+02','morning','morning',1,'pickup','Synthetic QA','+380000000000',0,0,'confirmed') returning id into b1;
  insert into public.vacleaner_booking_resources values(b1,'abir',1);
  insert into public.vacleaner_bookings(booking_code,product_code,product_label,start_date,return_date,start_at,end_at,pickup_window,return_window,rental_days,fulfillment,customer_name,customer_phone,base_amount,total_amount,status)
    values('QA-FLEET-NEXT-'||a,'abir','Synthetic QA','2035-01-02','2035-01-03','2035-01-02 08:00+02','2035-01-03 08:00+02','morning','morning',1,'pickup','Synthetic QA','+380000000000',0,0,'confirmed') returning id into b2;
  insert into public.vacleaner_booking_resources values(b2,'abir',1);
  -- Adjacent bookings share the same physical supply without false overlap.
  r:=public.vacleaner_admin_set_equipment_unit_status(u1,'repair','QA rollback',a);
  if (r->>'capacity')::integer<>1 then raise exception 'adjacent_slots_wrong_capacity'; end if;
  select count(*) into before_events from public.vacleaner_equipment_unit_events;
  r:=public.vacleaner_admin_set_equipment_unit_status(u1,'repair','QA retry',a);
  if (r->>'changed')::boolean or (select count(*) from public.vacleaner_equipment_unit_events)<>before_events then raise exception 'retry_not_idempotent'; end if;
  -- Existing commitments prevent removing the last usable unit atomically.
  blocked:=false;
  begin perform public.vacleaner_admin_set_equipment_unit_status(u2,'retired','QA',a);
  exception when others then if sqlerrm like 'equipment_reserved_overlap:%' then blocked:=true; else raise; end if; end;
  if not blocked or (select capacity from public.vacleaner_inventory where resource_code='abir')<>1
    or (select status from public.vacleaner_equipment_units where id=u2)<>'ready'
    or (select count(*) from public.vacleaner_equipment_unit_events)<>before_events then raise exception 'reservation_guard_not_atomic'; end if;
  -- Expired holds and cancelled records cannot keep nonexistent reservations.
  update public.vacleaner_bookings set status='waiting_payment',hold_expires_at=now()-interval '1 minute' where id=b1;
  update public.vacleaner_bookings set status='cancelled' where id=b2;
  r:=public.vacleaner_admin_set_equipment_unit_status(u2,'repair','QA',a);
  if (r->>'capacity')::integer<>0 then raise exception 'zero_capacity_not_supported'; end if;
  -- The ACTUAL existing booking RPC must reject a positive allocation at zero.
  blocked:=false;
  begin perform public.vacleaner_apply_reservation(b1,'2035-01-01','2035-01-02','morning','morning','2035-01-01 08:00+02','2035-01-02 08:00+02',1,'[{"resource_code":"abir","quantity":1}]','confirmed',null);
  exception when others then if sqlerrm like 'inventory_conflict:%' then blocked:=true; else raise; end if; end;
  if not blocked then raise exception 'booking_oversold_zero_capacity'; end if;
  -- Active holds and overdue issued rentals both count as real demand.
  perform public.vacleaner_admin_set_equipment_unit_status(u2,'ready','QA',a);
  update public.vacleaner_bookings set status='waiting_payment',hold_expires_at=now()+interval '10 minutes' where id=b1;
  blocked:=false;
  begin perform public.vacleaner_admin_set_equipment_unit_status(u2,'repair','QA',a);
  exception when others then if sqlerrm like 'equipment_reserved_overlap:%' then blocked:=true; else raise; end if; end;
  if not blocked then raise exception 'active_hold_ignored'; end if;
  update public.vacleaner_bookings set status='issued',start_date=current_date-2,return_date=current_date-1 where id=b1;
  blocked:=false;
  begin perform public.vacleaner_admin_set_equipment_unit_status(u2,'repair','QA',a);
  exception when others then if sqlerrm like 'equipment_reserved_overlap:%' then blocked:=true; else raise; end if; end;
  if not blocked then raise exception 'overdue_issued_ignored'; end if;
  r:=public.vacleaner_admin_add_equipment_unit('abir','QA rollback',a,request_id);
  if (r->>'capacity')::integer<>2 then raise exception 'add_unit_capacity_wrong'; end if;
  select count(*) into before_events from public.vacleaner_equipment_unit_events;
  r:=public.vacleaner_admin_add_equipment_unit('abir','QA lost-response retry',a,request_id);
  if (r->>'changed')::boolean or (r->>'capacity')::integer<>2
     or (select count(*) from public.vacleaner_equipment_unit_events)<>before_events
     or (select count(*) from public.vacleaner_equipment_units where id=request_id)<>1 then
    raise exception 'add_retry_created_duplicate_stock';
  end if;
  -- The fleet and existing booking functions must use the same transaction mutex.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and p.proname in ('vacleaner_apply_reservation','vacleaner_admin_set_equipment_unit_status','vacleaner_admin_add_equipment_unit')
      and p.prosrc like '%pg_advisory_xact_lock%vacleaner-slot-reservation-v1%')<>3 then raise exception 'reservation_mutex_drift'; end if;
end $$;
rollback;
select 'PASS: isolated fleet, grants, adjacency, atomic rejection, holds, overdue, zero-capacity booking RPC, retry and shared mutex; all fixtures rolled back' as result;
