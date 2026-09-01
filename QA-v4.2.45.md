# VAcleaner v4.2.45 · QA / ACCEPTANCE

## Scope

Client-card UX hierarchy + clarity of received money in preliminary/final settlement. No catalog, tariff, deposit-policy, capacity, RETURN/referral economics or VA HOME changes.

## Acceptance result

- System Spec / build contract: PASS · v4.2.45 · build 4245.
- Canonical static components: 103/103 PASS (stamp + 101 static suites + build).
- v4.2.45 client-card regression: 12/12 PASS.
- Client-card exact browser acceptance: 23/23 PASS (desktop 1440 + PWA 390).
- Stabilization / return-finance exact surface: 20/20 PASS.
- Mobile client-card compatibility: 3/3 PASS (320 / 390 / 430).
- Admin typography browser QA: 185/185 PASS.
- Admin context navigation: 23/23 PASS, including client → referral → back context.
- PWA v4.24 focus QA: 8/8 PASS.
- Glass V4 QA printed FULL GLASS V4 QA GREEN; local Playwright runner remained alive past the tool timeout after printing the completed green result, so GitHub Actions remains the canonical aggregate Browser gate.

## Verified UX

- Default client card is read-first, not a permanent edit form.
- Desktop core is 2 columns: Contacts / Rental history.
- Primary actions fill the available row; on mobile an odd last action spans the full row instead of leaving an empty cell.
- Referral is removed from the primary action row but remains available under `Бонуси й referral` via `Переглянути програму`.
- `Бонуси й referral`, `Документ`, `SMS` are collapsed by default.
- Contacts switch to edit mode only after `Редагувати`.
- Latest 3 rentals are shown first; older history is behind `Показати всі`.
- Client SMS status labels are Ukrainian (`Доставлено`, `Не доставлено`, `Надіслано`, `Очікує`).
- `Отримано разом` explicitly shows `Передоплата + фактичний залоговий платіж`.
- Bottom settlement hint explicitly states the factual deposit received.
- Story gift persistence, delivery amount alignment and return-finance geometry remain green from stabilization acceptance.

## CI contract repair after first GitHub Browser run

GitHub run `33449986879` exposed two stale browser expectations after the intentional v4.2.45 client-card redesign. Product code was not reverted.

- `test:referral-ios-launch` still expected the removed top-level `#clientOpenReferral` action. The test now opens `Бонуси й referral` and verifies the real `#clientOpenReferralDetails` action, then checks the iOS Instagram launch flow. Exact result: 10/10 PASS.
- `test:pwa` still tried to fill `customerName` while the new read-first contact editor was intentionally hidden. The test now verifies read-first mode, clicks `Редагувати`, verifies edit fields become visible, edits the client, and verifies the dirty save footer appears. Exact read → edit → dirty acceptance: PASS.
- Canonical static gate after the test-contract repair: 103/103 PASS.
- Product behavior remains the approved v4.2.45 UX; only outdated QA expectations were aligned with the System Spec.

## Release rule

Production deployment is accepted only after GitHub Actions Static / build gate and Browser QA aggregate gate are both GREEN.

## CI correction · 2026-09-01
- GitHub Browser QA run 33451399413 reached 33/34; referral iOS and PWA suites passed after the v4.2.45 contract update.
- The only remaining failure was `test:e2e`: Playwright called `.check()` on the nested native add-on checkbox while the customer-facing clickable surface is the enclosing add-on card/label. Sticky mobile UI could intercept that synthetic input hit target.
- E2E now drives the visible add-on card, centers it in the viewport, clicks the real touch target, and then asserts that the nested checkbox became checked. Product UI/logic was not rolled back.
- Static gate after this correction: 103/103 PASS. Referral iOS: 10/10 PASS. Client-card visual: 23/23 PASS.
