# VAcleaner v4.0.78 — SendPulse address-book activation fix

- Fixes personalized RETURN SMS preflight race that produced `No active phones in address book` immediately after importing recipients.
- After adding per-recipient `PromoLink` variables, the backend now polls the temporary SendPulse address book until all selected phones become active before creating the preflight or real SMS campaign.
- If SendPulse rejects phone numbers or does not finish processing them in time, the backend returns explicit active/new/excluded diagnostics instead of starting a campaign with an empty active audience.
- Keeps the enlarged internally scrollable SMS recipient area from v4.0.77.
- Production `vacleaner-campaigns-v1` updated with the same source; no SMS was sent during deployment or QA.

QA before release: build checks 334/334 PASS; SMS regression 54/54 PASS; PWA static 82/82 PASS; PWA visual 706/706 PASS; Pages build PASS.
