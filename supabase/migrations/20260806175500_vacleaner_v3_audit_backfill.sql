-- VAcleaner v3.0: create a baseline audit snapshot for bookings that existed before audit logging.
insert into public.vacleaner_booking_audit (
  booking_id, booking_code, event_type, changed_fields, old_values, new_values, source
)
select
  b.id,
  b.booking_code,
  'created',
  array[
    'status','prepayment_amount','prepayment_paid','issue_payment_amount','issue_payment_paid',
    'return_payment_amount','return_payment_paid','deposit_amount','deposit_paid','deposit_returned',
    'base_amount','extras_amount','delivery_amount','total_amount','extras'
  ]::text[],
  '{}'::jsonb,
  jsonb_build_object(
    'status', b.status,
    'prepayment_amount', b.prepayment_amount,
    'prepayment_paid', b.prepayment_paid,
    'issue_payment_amount', b.issue_payment_amount,
    'issue_payment_paid', b.issue_payment_paid,
    'return_payment_amount', b.return_payment_amount,
    'return_payment_paid', b.return_payment_paid,
    'deposit_amount', b.deposit_amount,
    'deposit_paid', b.deposit_paid,
    'deposit_returned', b.deposit_returned,
    'base_amount', b.base_amount,
    'extras_amount', b.extras_amount,
    'delivery_amount', b.delivery_amount,
    'total_amount', b.total_amount,
    'extras', b.extras
  ),
  'backfill'
from public.vacleaner_bookings b
where not exists (
  select 1 from public.vacleaner_booking_audit a where a.booking_id=b.id
);
