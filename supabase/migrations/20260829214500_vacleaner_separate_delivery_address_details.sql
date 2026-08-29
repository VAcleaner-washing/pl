-- VAcleaner only: store a route-safe address separately from courier instructions.
alter table public.vacleaner_customers
  add column if not exists address_detail text;

alter table public.vacleaner_bookings
  add column if not exists fulfillment_address_detail text;

comment on column public.vacleaner_customers.address_detail is
  'Entrance, floor, intercom or landmark. Never sent to route calculation.';
comment on column public.vacleaner_bookings.fulfillment_address_detail is
  'Booking snapshot of entrance, floor, intercom or landmark. Never sent to route calculation.';

create or replace function public.vacleaner_split_legacy_address(source_address text)
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
  clean_value := regexp_replace(clean_value, '^\s*[0-9]{9,12}([[:alpha:]])', '\1');
  clean_value := btrim(clean_value);

  if strpos(clean_value, ' · ') > 0 then
    return jsonb_build_object(
      'address', btrim(split_part(clean_value, ' · ', 1)),
      'detail', btrim(substring(clean_value from strpos(clean_value, ' · ') + 3))
    );
  end if;

  matched := regexp_match(
    clean_value,
    '^(.*?)(\s*(?:(?:[,;]\s*)[0-9]+\s*(?:-?й\s*)?під[’''ʼ`]?їзд|(?:[,;]?\s*)(?:під[’''ʼ`]?їзд|подъезд|кв\.?\s*[0-9]+|квартира\s*[0-9]+|домофон|код\s+домофона|[0-9]+\s*(?:-?й\s*)?поверх|поверх|вхід|зі\s+сторони|з\s+двору|зі\s+двору|орієнтир|жовта\s+[0-9]+-?ти\s+поверхівка)|\([^)]*(?:орієнтир|стадіон|поверхівка|двір|ворота|вхід|під[’''ʼ`]?їзд)[^)]*\)).*)$',
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

update public.vacleaner_customers
set
  address = public.vacleaner_split_legacy_address(address)->>'address',
  address_detail = nullif(public.vacleaner_split_legacy_address(address)->>'detail', '')
where address is not null
  and btrim(address) <> ''
  and (address_detail is null or btrim(address_detail) = '');

update public.vacleaner_bookings
set
  fulfillment_address = public.vacleaner_split_legacy_address(fulfillment_address)->>'address',
  fulfillment_address_detail = nullif(public.vacleaner_split_legacy_address(fulfillment_address)->>'detail', '')
where fulfillment = 'delivery'
  and fulfillment_address is not null
  and btrim(fulfillment_address) <> ''
  and (fulfillment_address_detail is null or btrim(fulfillment_address_detail) = '');

drop function public.vacleaner_split_legacy_address(text);
