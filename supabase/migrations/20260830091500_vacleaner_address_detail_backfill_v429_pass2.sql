-- VAcleaner v4.2.29 pass 2: move entrance markers that remained before an already-separated apartment/floor detail.
-- VA HOME objects are intentionally untouched.

with parsed as (
  select
    phone,
    regexp_match(
      address,
      '^(.*?)\s*[,;.·\-–—]*\s*((?:(?:під[’''ʼ`]?їзд|підїзд|подъезд)\s*№?\s*[0-9]+|[0-9]+\s*(?:-?(?:й|ий)\s*)?(?:під[’''ʼ`]?їзд|підїзд|подъезд)|(?:перший|другий|третій|четвертий|п[''’ʼ]?ятий|шостий|сьомий|восьмий|дев[''’ʼ]?ятий|десятий)\s+(?:під[’''ʼ`]?їзд|підїзд)|[0-9]+\s*п(?:\s|$|[.,;])).*)$',
      'i'
    ) as m,
    address_detail
  from public.vacleaner_customers
  where address is not null
    and (
      lower(address) ~ 'під[’''ʼ`]?їзд|підїзд|подъезд'
      or address ~* '[, ]+[0-9]+\s*п(\s|$|[.,;])'
    )
)
update public.vacleaner_customers c
set
  address = btrim(p.m[1], ' ,;.·-–—'),
  address_detail = nullif(concat_ws(' · ', nullif(btrim(p.m[2], ' ,;.·-–—'), ''), nullif(btrim(coalesce(p.address_detail,'')), '')), '')
from parsed p
where c.phone = p.phone
  and p.m is not null
  and btrim(p.m[1], ' ,;.·-–—') <> '';

with parsed as (
  select
    id,
    regexp_match(
      fulfillment_address,
      '^(.*?)\s*[,;.·\-–—]*\s*((?:(?:під[’''ʼ`]?їзд|підїзд|подъезд)\s*№?\s*[0-9]+|[0-9]+\s*(?:-?(?:й|ий)\s*)?(?:під[’''ʼ`]?їзд|підїзд|подъезд)|(?:перший|другий|третій|четвертий|п[''’ʼ]?ятий|шостий|сьомий|восьмий|дев[''’ʼ]?ятий|десятий)\s+(?:під[’''ʼ`]?їзд|підїзд)|[0-9]+\s*п(?:\s|$|[.,;])).*)$',
      'i'
    ) as m,
    fulfillment_address_detail
  from public.vacleaner_bookings
  where fulfillment = 'delivery'
    and fulfillment_address is not null
    and (
      lower(fulfillment_address) ~ 'під[’''ʼ`]?їзд|підїзд|подъезд'
      or fulfillment_address ~* '[, ]+[0-9]+\s*п(\s|$|[.,;])'
    )
)
update public.vacleaner_bookings b
set
  fulfillment_address = btrim(p.m[1], ' ,;.·-–—'),
  fulfillment_address_detail = nullif(concat_ws(' · ', nullif(btrim(p.m[2], ' ,;.·-–—'), ''), nullif(btrim(coalesce(p.fulfillment_address_detail,'')), '')), '')
from parsed p
where b.id = p.id
  and p.m is not null
  and btrim(p.m[1], ' ,;.·-–—') <> '';
