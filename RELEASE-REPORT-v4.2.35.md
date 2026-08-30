# VAcleaner v4.2.35 — FINANCE BADGE GEOMETRY + PWA QA STABILITY

## FIXED

- Desktop booking `Залоговий платіж` is now a compact rounded information block instead of the oversized capsule seen in v4.2.34. The amount is right-aligned and the state stays secondary.
- `Попередня маржа` uses the same restrained rounded-rectangle language.
- GitHub `test:pwa` false-negative `mobile-320: active booking list height follows the number of visible cards` no longer depends on the entire `.main.scrollHeight`. The canonical check now validates the actual rendered booking-list height (card heights + row gaps) and separately validates that the trailing space equals only the intentional PWA bottom safe-area padding.

## ROOT CAUSE OF THE GITHUB FAIL

The v4.2.34 card itself still satisfied the 320px density contract (`708.47px <= 708.96px`). The failed assertion used a hard-coded whole-page threshold. GitHub font/layout metrics made two cards about 15px taller than the local run, pushing `.main.scrollHeight` a few pixels over that indirect threshold even though the booking list had no phantom whitespace. v4.2.35 measures the element that the assertion actually describes.

## PRESERVED

- v4.2.34 edge-to-edge PWA behavior: initial content begins below search; after scroll it passes behind Liquid Glass search; bottom content continues behind floating navigation.
- Mobile booking-card density and 320 / 390 / 430 geometry.
- Referral confirmation, retry-safe journal/dedupe and restored production phone constraint.
- Settings `З / До` time-slot geometry, delivery/finance formulas, status flow and VA HOME isolation.

## QA COMPLETED BEFORE ARCHIVE

- Static/build aggregate: **93/93 PASS**.
- Final desktop browser audit: **403/403 PASS** across 1024 / 1280 / 1440 / 1650.
- Admin typography browser audit: **185/185 PASS**.
- Finance/delivery visual audit: **30/30 PASS**.
- Referral admin mobile: **5/5 PASS**.
- Referral modal visual: **7/7 PASS**.
- PWA v4.2.4 focus: **8/8 PASS**.
- Targeted PWA geometry on 320 / 390 / 430: booking-list delta **0px**; trailing-space delta within **0.33px** of intentional bottom padding; max booking-card heights remain inside the canonical limits.
- Reviewed visual screenshots at 320 / 390 / 430 / 768 / 1024 / 1280 / 1440 / 1650, including issued-booking finance state.

Canonical full GitHub Browser QA still remains the final post-commit gate. Transient screenshots/test-results are intentionally excluded from the release ZIP.
