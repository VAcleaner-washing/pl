# Candidate4.3.64 / build4364

Back navigation uses one shared header control: the same arrow,44px touch target and top-left safe-area anchor. Booking detail, nested client cards and all modal forms use it. Existing close/cancel controls remain available.

In the booking wizard, header Back returns through steps4→3→2→1 without losing values or showing a leave prompt. At step1 it exits through the existing dirty/pending guard. Nested client/referral/new-booking flows preserve the original parent chain. SMS uses the same anchor for its steps, history and recipient detail; internal Back retains text, selected recipients and route and does not dispatch or preflight a message.

The existing renderers and action callbacks still own navigation and saving. A small shared header helper adds no global listeners or observers. The new screen-exit control is included in the existing form policy; step navigation is distinguished from leaving a form.

Regression coverage uses the exact supplied normal artifact with intercepted read-only fixtures:320/390/440portrait,956landscape and1440desktop, safe areas, all4booking steps, exact parent returns, dirty cancellation, referral, finance/extension/process/issue/expense forms, campaign and SMS drill-down. Full existing Chromium/WebKit/exact-artifact gates remain required. Browser emulation does not certify a physical iPhone.

Prepared from verified production4.3.63 commit e76f8a133032eb09ac739d12b49711729101e0a7. Production remains4.3.63 until a separate publication decision. Financial formulas, statuses, availability, API payloads, public booking/draft fixes, owner-required pinch blocking and recovery archives are preserved. No backend deploy or production data changes are part of this candidate.

Back retains the exact parent-route accessible name. After long detail scrolling the header remains below the mobile safe area; the SMS desktop header retains its existing density limits.

The candidate must pass navigation, visible-icon, Close-bounds, sticky safe-area and parent-route checks on the pinned273-file artifact, plus canonical static, candidate-boundary and promotion guards. Legacy rules opt out of the shared header explicitly; the existing base CSS budget stays at5with no added!important declarations. Full remote gates remain required before readiness.

Local validation of the final candidate:541navigation checks,1017PWA checks,22search-return checks and the full existing Glass CRM suite passed. Canonical static67/67, candidate boundary19/19 and promotion guards7/7 passed. Existing SMS density/safe-area assertions were retained; route tests now inspect the icon control's accessible name and click the shared Back control.
