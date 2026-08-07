update public.vacleaner_settings
set value = jsonb_set(
  value,
  '{extras,carp_deta}',
  '{"label":"Плямовивідник Carp-Deta 30 мл","price":100,"aliases":["Плямовивідник Carp-Deta 30 мл","Carp-Deta 30 мл","Carp-Deta"]}'::jsonb,
  true
),
updated_at = now()
where key = 'catalog';
