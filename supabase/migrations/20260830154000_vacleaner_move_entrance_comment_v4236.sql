-- v4.2.36: move a strict legacy entrance-only value out of customer_comment.
-- Conservative by design: only delivery bookings with empty canonical detail and a pure entrance marker are touched.
with moved as (
  update public.vacleaner_bookings
  set fulfillment_address_detail = btrim(customer_comment),
      customer_comment = null,
      updated_at = now()
  where fulfillment = 'delivery'
    and coalesce(btrim(fulfillment_address_detail), '') = ''
    and coalesce(btrim(customer_comment), '') <> ''
    and btrim(customer_comment) ~* '^(?:[0-9]+[[:space:]]*(?:-?(?:й|ий)[[:space:]]*)?(?:під[’''ʼ`]?[їі]зд|підїзд|подъезд)|(?:під[’''ʼ`]?[їі]зд|підїзд|подъезд)[[:space:]]*№?[[:space:]]*[0-9]+)$'
  returning customer_phone, fulfillment_address, fulfillment_address_detail
)
update public.vacleaner_customers c
set address_detail = m.fulfillment_address_detail,
    updated_at = now()
from (
  select distinct on (customer_phone)
    customer_phone, fulfillment_address, fulfillment_address_detail
  from moved
  where customer_phone is not null
  order by customer_phone
) m
where c.phone = m.customer_phone
  and coalesce(btrim(c.address_detail), '') = ''
  and coalesce(btrim(c.address), '') = coalesce(btrim(m.fulfillment_address), '');
