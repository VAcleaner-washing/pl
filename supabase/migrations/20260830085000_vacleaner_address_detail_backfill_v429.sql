-- VAcleaner v4.2.29 only: finish canonical address/detail separation for legacy data.
-- Scope is intentionally limited to VAcleaner tables in the shared Supabase project.
alter table public.vacleaner_customers
  add column if not exists address_detail text;

alter table public.vacleaner_bookings
  add column if not exists fulfillment_address_detail text;

comment on column public.vacleaner_customers.address_detail is
  'Entrance, floor, intercom or landmark. Never sent to route calculation.';
comment on column public.vacleaner_bookings.fulfillment_address_detail is
  'Booking snapshot of entrance, floor, intercom or landmark. Never sent to route calculation.';

create or replace function public.vacleaner_split_legacy_address_v429(source_address text)
returns jsonb
language plpgsql
as $$
declare
  raw_value text := btrim(coalesce(source_address, ''));
  clean_value text;
  matched text[];
begin
  if raw_value = '' or raw_value = 'Історична доставка · адреса не збережена' then
    return jsonb_build_object('address', raw_value, 'detail', '');
  end if;

  clean_value := regexp_replace(raw_value, '^\s*Доставка\s*[:😊-]?\s*', '', 'i');
  clean_value := regexp_replace(clean_value, '^\s*Давайте\s+краще\s+з\s+доставкою\s+тоді\.?\s*', '', 'i');
  clean_value := regexp_replace(clean_value, '^\s*[0-9]{9,12}(?=[А-ЯІЇЄA-Z])', '', 'i');
  clean_value := btrim(clean_value);

  -- Explicit separators used by old admin versions: middle dot, hyphen, en/em dash.
  matched := regexp_match(
    clean_value,
    '^(.*?)\s*(?:·|[-–—])\s*((?:(?:під[’''ʼ`]?їзд|подъезд)\s*№?\s*[0-9]+|[0-9]+\s*(?:-?(?:й|ий)\s*)?(?:під[’''ʼ`]?їзд|подъезд)|(?:перший|другий|третій|четвертий|п[''’ʼ]?ятий|шостий|сьомий|восьмий|дев[''’ʼ]?ятий|десятий)\s+під[’''ʼ`]?їзд|[0-9]+\s*п(?:\s|$|[.,;])|кв\.?\s*[0-9]+|квартира\s*[0-9]+|домофон|[0-9]+\s*(?:-?(?:й|ий)\s*)?поверх|поверх\s*[0-9]+|вхід|зі?\s+сторони|з\s+двору|зі\s+двору|орієнтир).*)$',
    'i'
  );
  if matched is not null and btrim(matched[1], ' ,;.') <> '' then
    return jsonb_build_object(
      'address', btrim(matched[1], ' ,;.-–—'),
      'detail', btrim(matched[2], ' ,;.-–—')
    );
  end if;

  -- Prefer word-first details. This keeps the house number in cases like
  -- "Вул. Баленка 2 під'їзд 1" -> address "Вул. Баленка 2", detail "під'їзд 1".
  matched := regexp_match(
    clean_value,
    '^(.*?)\s*[,;.]*\s*((?:(?:під[’''ʼ`]?їзд|подъезд)\s*№?\s*[0-9]+|кв\.?\s*[0-9]+|квартира\s*[0-9]+|домофон|поверх\s*[0-9]+|вхід|зі?\s+сторони|з\s+двору|зі\s+двору|орієнтир).*)$',
    'i'
  );
  if matched is not null and btrim(matched[1], ' ,;.') <> '' then
    return jsonb_build_object(
      'address', btrim(matched[1], ' ,;.'),
      'detail', btrim(matched[2], ' ,;.')
    );
  end if;

  -- Numeric-first legacy forms: "3 під'їзд", "6й під'їзд", "2п", "6 поверх".
  matched := regexp_match(
    clean_value,
    '^(.*?)\s*[,;.]*\s*((?:[0-9]+\s*(?:-?(?:й|ий)\s*)?(?:під[’''ʼ`]?їзд|подъезд)|(?:перший|другий|третій|четвертий|п[''’ʼ]?ятий|шостий|сьомий|восьмий|дев[''’ʼ]?ятий|десятий)\s+під[’''ʼ`]?їзд|[0-9]+\s*п(?:\s|$|[.,;])|[0-9]+\s*(?:-?(?:й|ий)\s*)?поверх).*)$',
    'i'
  );
  if matched is not null and btrim(matched[1], ' ,;.') <> '' then
    return jsonb_build_object(
      'address', btrim(matched[1], ' ,;.'),
      'detail', btrim(matched[2], ' ,;.')
    );
  end if;

  return jsonb_build_object('address', clean_value, 'detail', '');
end;
$$;

with parsed as (
  select
    phone,
    public.vacleaner_split_legacy_address_v429(address)->>'address' as clean_address,
    public.vacleaner_split_legacy_address_v429(address)->>'detail' as clean_detail
  from public.vacleaner_customers
  where address is not null
    and btrim(address) <> ''
    and (address_detail is null or btrim(address_detail) = '')
)
update public.vacleaner_customers c
set
  address = p.clean_address,
  address_detail = nullif(p.clean_detail, '')
from parsed p
where c.phone = p.phone
  and p.clean_address <> c.address;

with parsed as (
  select
    id,
    public.vacleaner_split_legacy_address_v429(fulfillment_address)->>'address' as clean_address,
    public.vacleaner_split_legacy_address_v429(fulfillment_address)->>'detail' as clean_detail
  from public.vacleaner_bookings
  where fulfillment = 'delivery'
    and fulfillment_address is not null
    and btrim(fulfillment_address) <> ''
    and (fulfillment_address_detail is null or btrim(fulfillment_address_detail) = '')
)
update public.vacleaner_bookings b
set
  fulfillment_address = p.clean_address,
  fulfillment_address_detail = nullif(p.clean_detail, '')
from parsed p
where b.id = p.id
  and p.clean_address <> b.fulfillment_address;

drop function public.vacleaner_split_legacy_address_v429(text);
