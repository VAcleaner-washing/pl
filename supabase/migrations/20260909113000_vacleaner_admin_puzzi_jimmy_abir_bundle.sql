-- Admin-only operational bundle: Puzzi + Jimmy + window robot.
-- Rental price intentionally equals the current Puzzi + Jimmy tariff plus the standalone robot tariff.
update public.vacleaner_settings
set value = jsonb_set(
  value::jsonb,
  '{products,puzzi_jimmy_abir}',
  jsonb_build_object(
    'label', 'Puzzi + Jimmy + робот',
    'shortLabel', 'Puzzi + Jimmy + робот',
    'category', 'Комплект',
    'description', 'Миючий Puzzi + пиловий Jimmy + робот для вікон. Вартість = тариф Puzzi + Jimmy + тариф робота.',
    'weekday', 1850,
    'weekend', 2050,
    'resources', jsonb_build_object('puzzi', 1, 'jimmy', 1, 'abir', 1),
    'depositGroup', 'general',
    'imageKeys', to_jsonb(array['puzzi','jimmy','abir']::text[]),
    'adminOnly', true,
    'aliases', to_jsonb(array['Puzzi + Jimmy + робот','Миючий + пиловий + робот','Puzzi + Jimmy + ABIR']::text[])
  ),
  true
),
updated_at = now()
where key = 'catalog';
