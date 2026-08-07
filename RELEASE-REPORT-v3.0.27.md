# VAcleaner v3.0.27 — PUBLIC BOOKING RESILIENCE

Version: **3.0.27**  
Build: **3027**  
Date: **2026-08-07**

## Trigger
On 2026-08-07 at about 15:00 the public `/bronuvannia/` route could fall to Chrome's system “This page couldn’t load” screen while checking a same-day evening Puzzi slot. Production inventory shows both Puzzi units were already issued until the morning of 2026-08-08, so the correct UX is an in-page unavailable state with the nearest compatible window — never a browser navigation failure.

## Root hardening
- Added `/sw.js` as a **retirement-only** network worker. It exists solely so historical root-scoped registrations can update and unregister themselves.
- Public pages load `/assets/public-resilience.js`, which finds only the legacy root scope (`origin/`), requests an immediate worker update, and unregisters it.
- `/admin/` PWA is untouched and continues to use only `/admin/sw.js`.
- Root retirement worker does not create or read Cache Storage.

## Booking UX invariant
- Unavailable booking responses remain on the current page.
- Existing nearest-compatible availability UI remains authoritative.
- Added browser regression coverage that an unavailable response does not change `page.url`.

## Production state observed
At the reported time, both Puzzi resources were occupied by issued bookings until 2026-08-08 morning. Therefore 2026-08-07 evening was genuinely unavailable; the expected next available window starts after those returns.

## Backend
No Supabase schema or Edge Function change is required in v3.0.27. `vacleaner-booking-v5` v6 remains the public booking backend.
