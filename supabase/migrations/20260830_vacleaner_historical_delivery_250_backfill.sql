-- VAcleaner v4.2.38
-- Production backfill already applied 2026-08-30 after owner confirmation that historical completed deliveries used the 250 UAH tariff.
-- Idempotent source-of-truth migration: only historical completed delivery rows still missing a price are affected.
update public.vacleaner_bookings
set delivery_amount = 250,
    updated_at = now()
where booking_code like 'HIST-%'
  and status = 'completed'
  and fulfillment = 'delivery'
  and coalesce(delivery_amount, 0) = 0;
