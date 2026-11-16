# Candidate 4.3.63 / build 4363

The public booking fulfillment step showed pickup selected while its actual React state was empty. The exported HTML now starts with neither choice selected, matching the existing explicit-choice behavior. The hydration normalizer keeps this parity on every build. A first delivery selection highlights only delivery; pickup advances without an address, and delivery retains its existing address requirement.

Browser regression also found that startup autosave could erase an existing draft before delayed restoration. Persistence now waits for the initial restoration decision. A current trusted edit cancels pending replay so older values cannot overwrite new input. Pickup/delivery, dates, contact, comment and address details are tested through real reloads. Draft schema2, one-hour TTL and explicit URL preset priority remain unchanged; no old drafts are deleted or migrated.

Local evidence: canonical static67/67; public hydration63/63 across all existing routes, desktop/mobile and delayed JavaScript; actual-function bootstrap timing9/9; candidate boundary19/19 and promotion guards7/7. A retained62 artifact fails the new exported-markup and three browser choice cases. The intermediate markup-only fix also exposed the draft overwrite, whose timed storage evidence is retained separately.

All nonlocal test traffic is intercepted. No booking creation or production business-data write is part of verification. Admin/PWA behavior, owner-required pinch blocking, financial calculations, discounts, deposits, availability and backend payloads are preserved. Generated backend configuration changes only stamp the release identifier; no backend deployment is included.

The configured full Chromium/WebKit/exact-artifact gates remain required. This candidate is prepared from production commit `c180af6e4043386960f6f57cccceee1170ceab9f`; it does not publish or change live4.3.62. Physical iPhone behavior is not certified by browser emulation.
