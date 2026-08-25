# VAcleaner v4.1.30 — CLICK-ACTIVATED RETURN BONUS

Build: **4130**  
Date: **2026-08-25**

## RETURN logic
- Sending/delivering an SMS does **not** activate the discount.
- The personalized `/b#...` link activates the issued RETURN/PERSONAL bonus.
- Activation is idempotent: repeated clicks do not extend the validity period.
- Activated bonus validity: **21 days from first activation**.
- The campaign has a separate issuance/activation window (`issuance_ends_at`).
- If the client ignores the SMS and books independently, no RETURN discount is granted automatically.
- Manager can explicitly activate a genuinely issued pending SMS bonus when the client contacts VAcleaner through Instagram/phone.

## Existing booking promo editor
- Existing attached RETURN/PERSONAL bonus is visible in **Edit booking**.
- Manager can detach it; booking price and promo redemption are updated together by a server-side transaction RPC.
- If an activated personalized bonus is available for the same client, it can be attached to the existing booking.
- Current booking is excluded from the “active booking” eligibility guard while deciding whether that bonus can be attached.
- Legacy v4.1.29 auto-attached promo can therefore be corrected without manually editing database rows.

## SMS / campaigns
- RETURN copy is universal (not Puzzi-specific).
- RETURN/PERSONAL codes stay inactive after SendPulse acceptance and delivery.
- Public WEEKDAY/PRODUCT campaign semantics are unchanged.
- QUIZ continues to route through Smart Guide.

## Production backend already deployed
- `vacleaner-phone-promo-v1` — click activation backend.
- `vacleaner-sms-v2` — pending personalized SMS issuance model.
- `vacleaner-campaigns-v1` — pending/manual activation support.
- `vacleaner-admin-data-v1` — v4.1.30 campaign model.
- `vacleaner-booking-promo-v1` — authenticated existing-booking promo editor.
- DB migrations add activation metadata, issuance window, and atomic attach/detach RPCs.

## QA
- Build check: **354 file checks PASS**
- v4.1.30 RETURN activation: **23/23 PASS**
- SMS campaigns: **82/82 PASS**
- Retention/campaign rules: **27/27 PASS**
- Client promo regression: **14/14 PASS**
- Admin auth refresh: **11/11 PASS**
- PWA static: **83 assertions PASS**
- Public booking resilience: **PASS**
- Pages artifact build: **PASS**
