# VAcleaner v4.1.46 — FUNNEL ANALYTICS & CRO MEASUREMENT

## Goal
Measure the real public booking funnel without sending form PII into analytics and without counting refresh/restoration as new funnel progress.

## Funnel events
- `booking_view`
- `booking_started` (legacy compatibility, enriched and deduplicated)
- `booking_task_selected`
- `booking_product_selected`
- `booking_date_started`
- `booking_date_selected`
- `booking_date_unavailable`
- `booking_availability_error`
- `booking_fulfillment_selected`
- `booking_delivery_zone`
- `booking_extra_added`
- `booking_extra_removed`
- `booking_contact_started`
- `booking_submit`
- `booking_submit_error`
- `booking_completed`
- existing `generate_lead` remains the backend-success conversion event.

## Parameters
Events are enriched with safe CRO dimensions where available: booking origin, task, product code, rental days/window, pickup/delivery, delivery zone and amount, extras, promo context, booking value/currency and preserved traffic attribution.

No customer name, phone, full delivery address, document data or free-form comment is included in the funnel events.

## Attribution
Public pages capture `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, Google Ads/Meta click presence and coarse referrer source in session storage. Internal navigation does not overwrite an already captured external source. `from=quiz`, `from=extras` and `from=return_sms` remain explicit booking origins.

## Deduplication
A booking-session ID and stage signatures in `sessionStorage` prevent refresh, React re-render and restored draft state from inflating funnel steps. Submit attempts are throttled to prevent double-tap duplication. A completed booking closes the analytics booking session, so a later new booking in the same tab starts a new session.

## Success and errors
`booking_completed` is emitted only after the existing backend-success `generate_lead` event with a real booking code. Public create failures expose only safe backend error codes / promo reasons to `booking_submit_error`. Availability failure and sold-out states are separate events.

## GTM / GA4
The site emits the funnel as structured `dataLayer` custom events through the existing GTM container `GTM-KC8FF7FB`. The existing `generate_lead` conversion remains unchanged. If the GTM container is not already configured with a generic/custom-event GA4 forwarding rule, the new custom event names still need to be mapped in GTM before they appear as GA4 events; repository code cannot edit the external GTM container.

## Regression / build
- `npm run check`: 377 file checks passed.
- v4.1.46 analytics regression passes.
- Full non-browser GitHub workflow test set passed through the Pages build.
- Public SEO regression: 337/337.
- v4.1.44 booking hardening and v4.1.45 trust/delivery regressions remain green.
- Pages artifact: 219 files, ~6.8 MiB.
- Browser execution cannot be run in this container because Chromium navigation is blocked by the environment (`ERR_BLOCKED_BY_ADMINISTRATOR`); GitHub Actions keeps the production browser QA steps.
