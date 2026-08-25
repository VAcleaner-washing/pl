-- VAcleaner v3.0: immutable booking audit trail and direct-table access hardening.

create table if not exists public.vacleaner_booking_audit (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.vacleaner_bookings(id) on delete cascade,
  booking_code text,
  event_type text not null check (event_type in ('created','updated')),
  changed_fields text[] not null default '{}',
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  actor_id uuid,
  source text not null default 'database',
  created_at timestamptz not null default now()
);

create index if not exists vacleaner_booking_audit_booking_created_idx
  on public.vacleaner_booking_audit (booking_id, created_at desc);

alter table public.vacleaner_booking_audit enable row level security;
revoke all privileges on table public.vacleaner_booking_audit from anon, authenticated;
grant select, insert, update, delete on table public.vacleaner_booking_audit to service_role;
revoke all privileges on sequence public.vacleaner_booking_audit_id_seq from anon, authenticated;
grant usage, select on sequence public.vacleaner_booking_audit_id_seq to service_role;

create or replace function public.vacleaner_log_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  watched constant text[] := array[
    'status','prepayment_amount','prepayment_paid',
    'issue_payment_amount','issue_payment_paid',
    'return_payment_amount','return_payment_paid',
    'deposit_amount','deposit_paid','deposit_returned',
    'base_amount','extras_amount','delivery_amount','total_amount','extras'
  ];
  before_values jsonb := '{}'::jsonb;
  after_values jsonb := '{}'::jsonb;
  fields text[] := '{}';
  field_name text;
begin
  after_values := jsonb_build_object(
    'status', new.status,
    'prepayment_amount', new.prepayment_amount,
    'prepayment_paid', new.prepayment_paid,
    'issue_payment_amount', new.issue_payment_amount,
    'issue_payment_paid', new.issue_payment_paid,
    'return_payment_amount', new.return_payment_amount,
    'return_payment_paid', new.return_payment_paid,
    'deposit_amount', new.deposit_amount,
    'deposit_paid', new.deposit_paid,
    'deposit_returned', new.deposit_returned,
    'base_amount', new.base_amount,
    'extras_amount', new.extras_amount,
    'delivery_amount', new.delivery_amount,
    'total_amount', new.total_amount,
    'extras', new.extras
  );

  if tg_op = 'INSERT' then
    insert into public.vacleaner_booking_audit (
      booking_id, booking_code, event_type, changed_fields, old_values, new_values, source
    ) values (
      new.id, new.booking_code, 'created', watched, '{}'::jsonb, after_values, 'database'
    );
    return new;
  end if;

  before_values := jsonb_build_object(
    'status', old.status,
    'prepayment_amount', old.prepayment_amount,
    'prepayment_paid', old.prepayment_paid,
    'issue_payment_amount', old.issue_payment_amount,
    'issue_payment_paid', old.issue_payment_paid,
    'return_payment_amount', old.return_payment_amount,
    'return_payment_paid', old.return_payment_paid,
    'deposit_amount', old.deposit_amount,
    'deposit_paid', old.deposit_paid,
    'deposit_returned', old.deposit_returned,
    'base_amount', old.base_amount,
    'extras_amount', old.extras_amount,
    'delivery_amount', old.delivery_amount,
    'total_amount', old.total_amount,
    'extras', old.extras
  );

  foreach field_name in array watched loop
    if before_values -> field_name is distinct from after_values -> field_name then
      fields := array_append(fields, field_name);
    end if;
  end loop;

  if coalesce(array_length(fields, 1), 0) > 0 then
    insert into public.vacleaner_booking_audit (
      booking_id, booking_code, event_type, changed_fields, old_values, new_values, source
    ) values (
      new.id, new.booking_code, 'updated', fields, before_values, after_values, 'database'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.vacleaner_log_booking_change() from public, anon, authenticated;
grant execute on function public.vacleaner_log_booking_change() to postgres, service_role;

drop trigger if exists vacleaner_booking_audit_trigger on public.vacleaner_bookings;
create trigger vacleaner_booking_audit_trigger
after insert or update on public.vacleaner_bookings
for each row execute function public.vacleaner_log_booking_change();

-- Public clients work only through Edge Functions. Direct table access stays closed.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_users','vacleaner_admin_users','vacleaner_booking_resources',
    'vacleaner_bookings','vacleaner_customers','vacleaner_inventory',
    'vacleaner_push_config','vacleaner_push_subscriptions','vacleaner_settings'
  ] loop
    execute format('revoke all privileges on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;
