alter table public.vacleaner_bookings
  add column if not exists client_request_id text;

comment on column public.vacleaner_bookings.client_request_id is
  'Opaque client request UUID used to make create-booking retries idempotent.';

create unique index if not exists vacleaner_bookings_client_request_id_uidx
  on public.vacleaner_bookings (client_request_id)
  where client_request_id is not null;
