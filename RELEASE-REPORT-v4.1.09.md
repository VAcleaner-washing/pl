# VAcleaner v4.1.09 / build 4109

Release label: **PUZZI CHEMISTRY + STORY GIFT CHOICE**  
Date: **2026-08-23**

## Scope

This release fixes the Puzzi chemistry entitlement across bundles and turns the Stories reward into an explicit customer choice instead of an implicit chemistry-only bonus.

## Root causes

1. Public booking used a hard-coded product-code helper for the Puzzi chemistry block and omitted `puzzi_abir`, even though that bundle physically reserves a Puzzi resource. Backend resource logic and frontend presentation could therefore disagree.
2. The Stories checkbox was coupled directly to “2 Puzzi portions free”. That made the reward impossible to model cleanly when the customer should be able to choose a 50 ml VA HOME diffuser instead.
3. HOME RESET already includes a VA HOME diffuser, so applying the same generic Stories reward could create a duplicate-gift ambiguity.
4. Admin settlement logic treated the Stories checkbox as equivalent to the chemistry reward. After adding a diffuser choice, that would risk granting both the diffuser and two free chemistry portions unless the finance workflow was guarded by the saved reward choice.

## Fix

- Every public booking whose product contains the Puzzi resource now shows the same **8 sealed Puzzi portions** block, including `puzzi_abir` / “Текстиль + вікна”.
- Copy is unified: all 8 portions are issued; after return the customer pays only for used portions at 50 UAH each; unused portions return with the machine.
- Stories reward eligibility is based on the rental base of the equipment being **at least 1000 UAH**. Delivery and paid extras do not artificially unlock the reward.
- Eligible Puzzi bookings let the customer choose one Stories reward:
  - VA HOME diffuser · 50 ml; or
  - 2 used Puzzi chemistry portions free.
- Eligible bookings without Puzzi offer the diffuser only, because a Puzzi chemistry reward would be irrelevant.
- HOME RESET keeps its included VA HOME diffuser as a separate tariff benefit and lets the customer choose the fragrance immediately or defer it until confirmation.
- For HOME RESET, the Stories reward becomes 2 free Puzzi chemistry portions instead of offering a second diffuser.
- Gift choice and fragrance selection are persisted in `vacleaner_bookings.extras.gifts` without creating new tables and without affecting rental revenue or extras revenue.
- Admin/PWA surfaces the chosen gift in Upcoming, booking details and the customer confirmation message.
- Finance settlement grants the 2-free-portions rule only when the saved Stories reward is actually `chemistry2`; choosing a diffuser no longer silently grants free chemistry too. Legacy bookings without gift metadata retain backward-compatible behavior.

## Backend

Production `vacleaner-booking-v5` was updated and verified as **version 16 / ACTIVE**. The function stores gift metadata only inside VAcleaner booking data. No VA HOME table, function, policy, storage bucket or auth configuration was modified.

## Verification

- `npm run check` after stamp: **339 file checks PASS**
- `npm run test:booking-gifts`: **12/12 PASS**
- `npm run test:booking-gifts-visual`: **40/40 PASS** across 320, 390, 430, 768, 1024, 1280, 1650×760 and 1920
- `npm run test:booking-extras`: **11/11 PASS**
- `npm run test:booking-cta`: **14/14 PASS**
- `npm run test:issue-workflow`: **18/18 PASS**
- `npm run test:process-metadata`: **29/29 PASS**
- `npm run test:admin-labels`: **36/36 PASS**
- `npm run test:pwa-static`: **82/82 PASS**
- `npm run test:public-visual-contract`: **205/205 PASS**
- `npm run test:desktop-final`: **319/319 PASS**
- `npm run test:public-booking`: PASS; unavailable flow remains 409 and nearest-available suggestion remains stable.
- `npm run test:financial-control`: PASS.

The final local `npm run test:pwa` produced no failure before the execution window ended, but it did not return its final suite summary. This report therefore does **not** claim that the entire PWA suite completed.

## Release state

- Frontend/PWA build in this archive: **4.1.09 / 4109**.
- Frontend archive is **not claimed live**.
- Production booking backend gift logic: **live as `vacleaner-booking-v5 v16 ACTIVE`**.
