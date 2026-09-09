-- Keep the internal three-unit bundle server-side even when the public settings
-- normalizer rewrites the catalog, and prevent website-created bookings from using it.

create or replace function public.vacleaner_keep_admin_bundle_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_bundle jsonb;
  puzzi_jimmy_weekday numeric;
  puzzi_jimmy_weekend numeric;
  abir_weekday numeric;
  abir_weekend numeric;
begin
  if new.key <> 'catalog' then
    return new;
  end if;

  old_bundle := old.value::jsonb #> '{products,puzzi_jimmy_abir}';
  if old_bundle is null then
    return new;
  end if;

  puzzi_jimmy_weekday := coalesce((new.value::jsonb #>> '{products,puzzi_jimmy,weekday}')::numeric, 1050);
  puzzi_jimmy_weekend := coalesce((new.value::jsonb #>> '{products,puzzi_jimmy,weekend}')::numeric, 1150);
  abir_weekday := coalesce((new.value::jsonb #>> '{products,abir,weekday}')::numeric, 800);
  abir_weekend := coalesce((new.value::jsonb #>> '{products,abir,weekend}')::numeric, 900);

  old_bundle := jsonb_set(old_bundle, '{weekday}', to_jsonb((puzzi_jimmy_weekday + abir_weekday)::numeric), true);
  old_bundle := jsonb_set(old_bundle, '{weekend}', to_jsonb((puzzi_jimmy_weekend + abir_weekend)::numeric), true);
  new.value := jsonb_set(new.value::jsonb, '{products,puzzi_jimmy_abir}', old_bundle, true);
  return new;
end;
$$;

revoke all on function public.vacleaner_keep_admin_bundle_v1() from public, anon, authenticated;
grant execute on function public.vacleaner_keep_admin_bundle_v1() to service_role;

drop trigger if exists vacleaner_keep_admin_bundle_v1 on public.vacleaner_settings;
create trigger vacleaner_keep_admin_bundle_v1
before update of value on public.vacleaner_settings
for each row
when (old.key = 'catalog')
execute function public.vacleaner_keep_admin_bundle_v1();

create or replace function public.vacleaner_block_public_admin_bundle_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.product_code = 'puzzi_jimmy_abir' and new.source = 'vacleaner_website' then
    raise exception 'admin_only_product' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.vacleaner_block_public_admin_bundle_v1() from public, anon, authenticated;
grant execute on function public.vacleaner_block_public_admin_bundle_v1() to service_role;

drop trigger if exists vacleaner_block_public_admin_bundle_v1 on public.vacleaner_bookings;
create trigger vacleaner_block_public_admin_bundle_v1
before insert or update of product_code, source on public.vacleaner_bookings
for each row
execute function public.vacleaner_block_public_admin_bundle_v1();
