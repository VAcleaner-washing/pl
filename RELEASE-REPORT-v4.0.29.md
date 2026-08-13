# VAcleaner v4.0.29

- Preserves the v4.0.28 mobile Bookings layout: Client and Handoff remain separate full-width rows.
- Replaces batched synthetic date changes with browser-paced controls and an explicit wait for the expected rendered deposit value.
- Aligns the PWA density contract with the intentionally restored full-width Client and Handoff rows while still requiring every card to fit within one phone viewport.
- Makes the Liquid Glass browser check use the configured Chromium executable when provided.
- Keeps deposit business rules, desktop booking layout, and the Upcoming tab unchanged.
