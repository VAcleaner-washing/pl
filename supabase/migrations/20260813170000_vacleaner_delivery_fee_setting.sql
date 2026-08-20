insert into public.vacleaner_settings (key, value, updated_at)
values ('delivery_fee', '250'::jsonb, now())
on conflict (key) do nothing;
