update public.vacleaner_settings
set value =
  jsonb_set(
    jsonb_set(
      value::jsonb,
      '{products,elite,label}',
      to_jsonb('HOME RESET'::text),
      true
    ),
    '{products,elite,shortLabel}',
    to_jsonb('HOME RESET'::text),
    true
  ),
  updated_at = now()
where key = 'catalog';
