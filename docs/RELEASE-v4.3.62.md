# Candidate 4.3.62 / build 4362

This candidate corrects verified frontend defects from the 4.3.61 audit and the owner's screenshots. Preparation does not publish production or alter live business records. The branch starts at production commit `76b83bad27c8a61bd9dccd7422d4342fe9633ea1`.

## Resulting behavior

- Composite Settings fields draw focus around the entire input and unit. The clipped second blue stripe is removed in all 19 equivalent fields; values, caret, selection and decimal keyboard behavior remain intact.
- Booking steps 1–4 retain their active states without the inherited connector lines or lower decorative border.
- Delivery-route refresh has visible progress, bounded requests and a recoverable button. An unknown save result offers a canonical read before another mutation. A late route acknowledgement cannot replace a demonstrably newer route. Fuel, price, deposit and status formulas are preserved.
- An open read-only booking detail receives authoritative updates after resume and live sync. Failed reads show a retry notice and suspend mutation controls; dirty forms and action sheets keep their owners and drafts.
- Delegated detail buttons mirror canonical disabled/stale state even when mobile rendering creates or recreates them later. Successful retry restores availability. This closes the mobile WebKit defect found in the first candidate CI run.
- Calendar cards contain every slot in narrow and landscape layouts. The calendar's current day and past-slot clock use Europe/Kyiv.
- Clipboard feedback reflects actual success or denial, with selectable fallback text. More navigation cleans up listeners and restores focus. Settings tabs, time controls and authentication errors have meaningful accessible names and states.
- Canonical booking status semantics remain consistent through the mobile presentation enhancers. Client benefit labels use the current Ukrainian wording.

The owner's requirement to block two-finger zoom is preserved. Backend authorization, the production Supabase project, financial rules and the immutable stable 4.3.46 rollback are unchanged. Changes in generated backend configuration files only stamp the new release identifier; no backend deployment is included.

## Validation and publication gates

Local canonical static QA passed 66/66 after the final application review corrections; route recovery regressions passed 40/40. Candidate boundary tests passed 19/19. Focused tests exercise actual application functions, controlled asynchronous races and frozen failing baseline examples. Browser checks use the compiled normal artifact, synthetic intercepted endpoints and Chromium at mobile and desktop sizes. They cover all 19 composite fields, steps, read-only detail recovery, clipboard failure, menu keyboard navigation, calendar containment and route timeout/reconciliation. A negative browser run also proves that the calendar gate exits nonzero for the known baseline defect. Evidence is retained separately from deployable files.

GitHub Actions must pass the full canonical Chromium/PWA and WebKit suites, plus exact normal-artifact operations at 440 and 1440 pixels in both engines. Mobile operations include actual worker upgrade from immutable 4.3.46 and rollback to it. A PR run cannot deploy; publication remains restricted to a reviewed main push after all gates pass.

Local results do not certify a physical iPhone, its native keyboard, VoiceOver or OS suspension. Route mutation reconciliation is scoped to the current runtime: a page reload or another tab cannot inherit an unknown prior request. Backend idempotency is not introduced by this frontend fix.

## Recovery

Retain the verified 4.3.61 release artifact and stable 4.3.46 archive/workflow. Do not remove the old version or invoke a restore during candidate QA. Any production release needs actual deployment and version/worker readback; a merge alone is not deployment evidence.
