update public.vacleaner_settings
set value =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              value::jsonb,
              '{products,combo,label}', to_jsonb('Комбо'::text), true
            ),
            '{products,combo,shortLabel}', to_jsonb('Комбо'::text), true
          ),
          '{products,ideal_windows,label}', to_jsonb('Ідеальні вікна'::text), true
        ),
        '{products,ideal_windows,shortLabel}', to_jsonb('Ідеальні вікна'::text), true
      ),
      '{products,elite,label}', to_jsonb('Елітний стандарт чистоти'::text), true
    ),
    '{products,elite,shortLabel}', to_jsonb('Елітний стандарт чистоти'::text), true
  ),
  updated_at = now()
where key = 'catalog';
