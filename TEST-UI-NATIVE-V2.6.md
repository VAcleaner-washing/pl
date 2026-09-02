# VAcleaner · Native UI V2.6 Real iPhone Visual RC

Route: `/admin/bronuvannia-native-v26/`.

V2.6 is a visual QA correction pass over V2.5 based on real iPhone screenshots.

- Booking Detail audit header uses a deliberate two-column layout; `Оновити` is a normal 44 px control and cannot float or clip.
- Booking Detail `Ще` separates ellipsis and label and keeps a 48 px touch target.
- RETURN SMS header reserves its own row for `Журнал`, so campaign title, history and close never compete for horizontal width.
- SMS history header/back controls are responsive and cannot clip at 320–430 px.
- No business logic, Supabase contract, pricing, status or production route changes.
