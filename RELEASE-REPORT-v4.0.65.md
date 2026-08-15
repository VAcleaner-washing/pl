# VAcleaner v4.0.65 — PICKER DEDUPLICATION PARITY

## Scope
- Removed the duplicate picker hint from public booking; the existing Smart Guide booking entry remains the single contextual CTA.
- Restored the homepage “Не знаєте, що підійде? → Запитати менеджера” helper; the existing large Smart Guide remains the homepage picker integration.
- Removed the extra homepage package-grid picker bridge.
- Removed the redundant runtime rewrite on `/rishennia/`; its existing single choice-strip picker remains.
- Kept the new picker CTA on `/komplekty/` and the solution-detail cross-sell where there was no existing contextual picker entry.
- Kept the v4.0.64 compact review proof and mobile sticky CTA polish.
- Added build guards so home/booking picker duplication fails QA.

No booking prices, availability, deposits, finance logic, admin workflow, or Supabase business data were changed.
