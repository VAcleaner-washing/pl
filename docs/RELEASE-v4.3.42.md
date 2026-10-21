# v4.3.42 / build 4342 — Mobile forms and WebKit QA

On short landscape screens, the absolute finance footer covered the edge of the scrolled settlement result. Mobile finance now reserves an actual grid row for actions, keeping the scroll viewport above them. Mobile modal fields use 16 px text, including the phone-landscape bridge.

The shipped Native cascade had overridden the client card's two-column KPI layout and full-row action placement. Repair those rules at their source, remove duplicate section spacing and padding on closed disclosures, and stack narrow history rows so status, amount and Open remain legible. Completed-only client statistics and all business data retain their existing meaning.

Add mandatory WebKit CI coverage against the validated Pages artifact, alongside the existing Chromium and Static/build gates. Tests cover real mobile finance/booking/client forms, public hydration and startup, using isolated read-only API fixtures with explicit CORS/no-store responses and network diagnostics. Replace the old injected fulfillment-select test bridge with checks of the real independent logistics controls.

No Supabase deployment, schema, price, booking/financial-data or VA HOME change. WebKit/iPhone profiles are emulation; no physical iPhone or native keyboard/push verification is claimed. Previous production: 4274ddc360c4af6e7640f9aa24bffa17ae0655a0 / build 4341.
