# VAcleaner v4.2.45 · CLIENT CARD UX

Baseline: v4.2.44 STABILIZATION / ACCEPTANCE.

Changes:
- read-first client card;
- 2-column desktop core (Contacts / Rental history);
- progressive disclosure for benefits/referral, document and SMS;
- no duplicate referral CTA in the primary action row;
- content-aware action fill on PWA;
- explicit edit mode for contacts;
- latest 3 rentals first;
- referral workspace remains reachable through `Переглянути програму`;
- Ukrainian SMS status labels;
- settlement received amount explains prepayment + factual deposit;
- bottom settlement hint repeats the factual deposit received.

Deploy only after GitHub Actions Static / build and Browser QA aggregate are both GREEN.

CI-FIX note:
- Browser QA expectations were aligned with the approved read-first client-card UX after GitHub correctly exposed two stale tests.
- No business logic, pricing, referral economics, Supabase schema, or production UI behavior changed in the CI fix.
