# v4.3.43 / build 4343 — Client reads on demand

Opening a client card issued four background API requests even while Benefits, Document and SMS were closed. Load each section when opened, share a pending read and reuse its successful result only within that card. Keep contacts, completed-only KPIs, rental history and save payloads available immediately.

Failed sections offer retry. Detached-card responses cannot update a later card or start a private preview download. Closed Benefits/SMS summaries remain neutral until the authoritative response arrives.

Add shipped-artifact request/interaction coverage in Chromium and WebKit, with synthetic read-only API fixtures and no injected CSS/compatibility DOM. The baseline build issues four closed-section reads in each scenario. Existing startup, finance, booking, session, PWA cache and update gates remain required.

Previous production: 605b85a8cf9e75a29ffca6e9657fa6fffcca7d74 / build 4342. No backend deployment, schema, price, booking/financial-data or VA HOME change. iPhone/standalone checks are emulation; physical-device and native-keyboard behavior are not claimed.
