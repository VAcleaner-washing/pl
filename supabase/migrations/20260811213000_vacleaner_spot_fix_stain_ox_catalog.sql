-- Replace the public Carp-Deta option with two stain-care products sold with the booking.
-- Historical bookings keep their original item snapshot in vacleaner_bookings.extras.
update public.vacleaner_settings
set value = jsonb_set(
  jsonb_set(
    jsonb_set(
      value,
      '{extras,carp_deta}',
      coalesce(value #> '{extras,carp_deta}', '{}'::jsonb) || '{"active":false,"legacy":true}'::jsonb,
      true
    ),
    '{extras,spot_lifter}',
    '{"label":"VA SPOT FIX · 50 мл","price":100,"volumeMl":50,"shortDescription":"Для більшості локальних плям від їжі, напоїв, жиру, косметики та побутових забруднень.","aliases":["VA SPOT FIX · 50 мл","VA SPOT FIX","Універсальний плямовивідник · 50 мл","Універсальний плямовивідник","Chemspec Professional Spot Lifter","SPOT LIFTER","Spot Lifter"]}'::jsonb,
    true
  ),
  '{extras,stain_exit}',
  '{"label":"VA STAIN OX · 30 мл","price":100,"volumeMl":30,"shortDescription":"Для старих слідів від кави, чаю, вина, ягід і соків.","aliases":["VA STAIN OX · 30 мл","VA STAIN OX","Для стійких кольорових плям · 30 мл","Засіб для стійких кольорових плям","Chemspec Stain Exit","Stain Exit","STAIN EXIT","Stain Ox"]}'::jsonb,
  true
),
updated_at = now()
where key = 'catalog';
