insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vacleaner-client-documents',
  'vacleaner-client-documents',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.vacleaner_customers
  add column if not exists document_photo_path text,
  add column if not exists document_photo_name text,
  add column if not exists document_photo_mime text,
  add column if not exists document_photo_uploaded_at timestamptz;

comment on column public.vacleaner_customers.document_photo_path is 'Private Supabase Storage object path in vacleaner-client-documents.';
comment on column public.vacleaner_customers.document_photo_name is 'Original client document photo filename for manager UI only.';
comment on column public.vacleaner_customers.document_photo_mime is 'MIME type of the private client document photo.';
comment on column public.vacleaner_customers.document_photo_uploaded_at is 'Timestamp when the current client document photo was stored.';
