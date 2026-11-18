-- VAcleaner / equipment fleet inventory model (STAGED, not auto-deployed).
-- 4.3.66 candidate, builds on production main v4.3.64.
-- Investment baselines remain financial data and are NEVER edited by this migration.

create table if not exists public.vacleaner_equipment_units (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  resource_code text not null references public.vacleaner_inventory(resource_code),
  unit_number integer not null check (unit_number between 1 and 999),
  status text not null default 'ready' check (status in ('ready','repair','retired')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_code,unit_number)
);

create table if not exists public.vacleaner_equipment_unit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  unit_id uuid not null references public.vacleaner_equipment_units(id),
  action text not null check (action in ('import','create','status_change')),
  from_status text,
  to_status text not null,
  actor_id uuid,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists vacleaner_equipment_unit_events_unit_idx
  on public.vacleaner_equipment_unit_events(unit_id,created_at desc);
create index if not exists vacleaner_equipment_units_resource_idx
  on public.vacleaner_equipment_units(resource_code,status);

alter table public.vacleaner_equipment_units enable row level security;
alter table public.vacleaner_equipment_unit_events enable row level security;
revoke all on public.vacleaner_equipment_units from public,anon,authenticated;
revoke all on public.vacleaner_equipment_unit_events from public,anon,authenticated;
grant select,insert,update on public.vacleaner_equipment_units to service_role;
grant select,insert on public.vacleaner_equipment_unit_events to service_role;

-- Allow a fully unavailable model with capacity=0, where booking RPC rejects all new reservations.
alter table public.vacleaner_inventory drop constraint if exists vacleaner_inventory_capacity_check;
alter table public.vacleaner_inventory
  add constraint vacleaner_inventory_capacity_check check (capacity >= 0);

-- Import each existing physical unit once. Idempotent on re-application.
insert into public.vacleaner_equipment_units(resource_code,unit_number,status,note)
select i.resource_code,n,'ready','Імпорт із наявного складського обліку'
from public.vacleaner_inventory i
cross join lateral pg_catalog.generate_series(1,i.capacity) n
on conflict(resource_code,unit_number) do nothing;

-- Repair recorded 2026-11-17: there are physically 2 Jimmy units, but only 1
-- serviceable. Live rental capacity was safely lowered to 1 under the booking
-- advisory lock. Keep the second broken unit in the physical registry.
-- This is conditional: if Jimmy was already restored to capacity 2, the normal
-- seed above creates both ready and this block changes nothing.
insert into public.vacleaner_equipment_units(resource_code,unit_number,status,note)
select 'jimmy',2,'repair','Несправний Jimmy; виведено з оренди 17.11.2026'
where exists(select 1 from public.vacleaner_inventory
             where resource_code='jimmy' and active=true and capacity=1)
  and (select count(*) from public.vacleaner_equipment_units
       where resource_code='jimmy' and status='ready')=1
  and not exists(select 1 from public.vacleaner_equipment_units
                 where resource_code='jimmy' and unit_number=2)
on conflict(resource_code,unit_number) do nothing;

-- Shared mutex with vacleaner_apply_reservation prevents inventory changes racing booking creation.
create or replace function public.vacleaner_admin_set_equipment_unit_status(
  p_unit_id uuid, p_status text, p_note text, p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_unit public.vacleaner_equipment_units%rowtype;
  v_inventory public.vacleaner_inventory%rowtype;
  v_current_ready integer;
  v_next_ready integer;
  v_peak integer;
  v_now_slot bigint;
  v_note text := pg_catalog.left(pg_catalog.btrim(coalesce(p_note,'')),300);
begin
  if p_unit_id is null or p_actor_id is null or p_status is null or p_status not in ('ready','repair','retired') then
    raise exception 'invalid_equipment_change';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vacleaner-slot-reservation-v1'));
  select * into v_unit from public.vacleaner_equipment_units where id=p_unit_id for update;
  if not found then raise exception 'equipment_unit_not_found'; end if;
  select * into v_inventory from public.vacleaner_inventory
    where resource_code=v_unit.resource_code and active=true for update;
  if not found then raise exception 'equipment_inventory_missing'; end if;
  select count(*)::integer into v_current_ready from public.vacleaner_equipment_units
    where resource_code=v_unit.resource_code and status='ready';
  if v_current_ready<>v_inventory.capacity then raise exception 'equipment_inventory_mismatch'; end if;
  if v_unit.status=p_status then
    return jsonb_build_object('changed',false,'resourceCode',v_unit.resource_code,
      'unitId',v_unit.id,'capacity',v_inventory.capacity,'status',v_unit.status);
  end if;
  v_next_ready := v_current_ready +
    case when p_status='ready' then 1 else 0 end -
    case when v_unit.status='ready' then 1 else 0 end;

  if v_next_ready<v_current_ready then
    -- Do not reduce supply below ANY live concurrent issued/confirmed/held demand.
    -- Late issued returns remain reserved until their booking is completed.
    v_now_slot := public.vacleaner_slot_index(
      (pg_catalog.now() at time zone 'Europe/Kyiv')::date,'morning'
    );
    with active as (
      select
        greatest(
          public.vacleaner_slot_index(b.start_date,b.pickup_window),v_now_slot
        ) as start_slot,
        case when b.status='issued' then greatest(
          public.vacleaner_slot_index(b.return_date,b.return_window),v_now_slot+1
        ) else public.vacleaner_slot_index(b.return_date,b.return_window) end as end_slot,
        br.quantity as quantity
      from public.vacleaner_booking_resources br
      join public.vacleaner_bookings b on b.id=br.booking_id
      where br.resource_code=v_unit.resource_code
        and (b.status in ('confirmed','issued') or
          (b.status='waiting_payment' and b.hold_expires_at>pg_catalog.now()))
    ), events as (
      select start_slot as slot,quantity as change from active where end_slot>start_slot
      union all
      select end_slot as slot,-quantity as change from active where end_slot>start_slot
    ), by_slot as (
      select slot,sum(change) as change from events group by slot
    ), running as (
      select sum(change) over(order by slot) as reserved from by_slot
    )
    select coalesce(max(reserved),0)::integer into v_peak from running;
    if v_peak>v_next_ready then
      raise exception 'equipment_reserved_overlap:%:%',v_unit.resource_code,v_peak;
    end if;
  end if;

  update public.vacleaner_equipment_units
    set status=p_status,note=v_note,updated_at=now() where id=p_unit_id;
  update public.vacleaner_inventory set capacity=v_next_ready,updated_at=now()
    where resource_code=v_unit.resource_code;
  insert into public.vacleaner_equipment_unit_events(
    unit_id,action,from_status,to_status,actor_id,note
  ) values(p_unit_id,'status_change',v_unit.status,p_status,p_actor_id,v_note);
  return jsonb_build_object('changed',true,'resourceCode',v_unit.resource_code,
    'unitId',v_unit.id,'capacity',v_next_ready,'status',p_status);
end;
$$;

create or replace function public.vacleaner_admin_add_equipment_unit(
  p_resource_code text,p_note text,p_actor_id uuid,p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_inventory public.vacleaner_inventory%rowtype;
  v_unit public.vacleaner_equipment_units%rowtype;
  v_no integer;
  v_ready integer;
  v_note text := pg_catalog.left(pg_catalog.btrim(coalesce(p_note,'')),300);
begin
  if p_actor_id is null or p_request_id is null or p_resource_code is null or p_resource_code not in ('puzzi','sc2','jimmy','abir') then
    raise exception 'invalid_equipment_change';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vacleaner-slot-reservation-v1'));
  select * into v_inventory from public.vacleaner_inventory
    where resource_code=p_resource_code and active=true for update;
  if not found then raise exception 'equipment_inventory_missing'; end if;
  -- The intent UUID is also the new unit's stable ID. A lost response can be
  -- retried after reload without increasing stock twice or replaying its event.
  select * into v_unit from public.vacleaner_equipment_units where id=p_request_id;
  if found then
    if v_unit.resource_code<>p_resource_code then raise exception 'invalid_equipment_change'; end if;
    return jsonb_build_object('changed',false,'resourceCode',p_resource_code,
      'unitId',v_unit.id,'unitNumber',v_unit.unit_number,'capacity',v_inventory.capacity);
  end if;
  select count(*)::integer into v_ready from public.vacleaner_equipment_units
    where resource_code=p_resource_code and status='ready';
  if v_ready<>v_inventory.capacity then raise exception 'equipment_inventory_mismatch'; end if;
  select coalesce(max(unit_number),0)+1 into v_no from public.vacleaner_equipment_units
    where resource_code=p_resource_code;
  if v_no>999 then raise exception 'equipment_fleet_limit'; end if;
  insert into public.vacleaner_equipment_units(id,resource_code,unit_number,status,note)
    values(p_request_id,p_resource_code,v_no,'ready',v_note) returning * into v_unit;
  update public.vacleaner_inventory set capacity=v_ready+1,updated_at=now()
    where resource_code=p_resource_code;
  insert into public.vacleaner_equipment_unit_events(
    unit_id,action,from_status,to_status,actor_id,note
  ) values(v_unit.id,'create',null,'ready',p_actor_id,v_note);
  return jsonb_build_object('changed',true,'resourceCode',p_resource_code,
    'unitId',v_unit.id,'unitNumber',v_unit.unit_number,'capacity',v_ready+1);
end;
$$;

revoke all on function public.vacleaner_admin_set_equipment_unit_status(uuid,text,text,uuid)
  from public,anon,authenticated;
grant execute on function public.vacleaner_admin_set_equipment_unit_status(uuid,text,text,uuid)
  to service_role;
-- Remove the unreleased staging prototype that had no idempotency argument.
drop function if exists public.vacleaner_admin_add_equipment_unit(text,text,uuid);
revoke all on function public.vacleaner_admin_add_equipment_unit(text,text,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.vacleaner_admin_add_equipment_unit(text,text,uuid,uuid)
  to service_role;
