# v4.3.41 / build 4341 — PWA update lifecycle

An installation that began before register() resolved could be missed by the updatefound listener, leaving a waiting update without a prompt. The runtime now observes the current installing worker immediately and watches each worker once. An offline registration failure reuses the existing exact admin registration so online recovery keeps update listeners.

The same race was reproduced in v4.3.39 and v4.3.40. This follow-up gives the fix a new immutable build identity for already-cached devices. Updates still require the existing explicit consent; active forms remain protected.

Real registration-function regressions and the full first-offline/online/next-build browser sequence are required alongside the canonical QA gates. No backend deployment, financial data, schema, price or VA HOME change. Previous main/build rollback reference: fedd5815874bbfa83b6a492f0b2ab5afcc783f45 / 4340.
