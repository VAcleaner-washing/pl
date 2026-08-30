# Deploy v4.2.30

1. Завантажити цей архів у QA-гілку, не напряму в main.
2. Не merge у main, поки GitHub Static / build gate і Browser QA aggregate не GREEN.
3. Production DB migrations v4.2.30 уже застосовані.
4. Production Edge Functions уже задеплоєні: settings v21, booking-v5 v27, admin-bookings-v4 v7, reminders-v1 v9, push v9, extend-rental-v1 v6.
5. Після GitHub GREEN зробити smoke: public double-create retry, admin double-create retry, new-booking push, peer issued/completed push, cron issue/return reminder, rental extension, Finance vehicle labels.
6. Після smoke — merge/squash і deploy GitHub Pages.
