# QA evidence — v4.2.44 STABILIZATION / ACCEPTANCE

## Baseline

- Production frontend baseline: `e843b61af1565a9b3279b12cf59dec5c92f1068b` — `v4.2.43-CRITICAL-BOOKING-FIXES`.
- Production `vacleaner-address-v1`: **v13 ACTIVE**.
- Production `vacleaner-admin-bookings-v4`: **v8 ACTIVE**.
- Production `vacleaner-booking-v5`: **v27 ACTIVE**.
- This release adds **no new business feature**. It stabilizes recent UX/data contracts and their acceptance coverage.

## Acceptance matrix

| Scope | Required result | Evidence | Status |
| --- | --- | --- | --- |
| Admin booking delivery | `Доставка` left, amount right, address below on the actual booking card | exact PWA/browser checks at 320/390/430; stabilization browser suite | **VERIFIED** |
| Story reward | diffuser / 2 chemistry mutually exclusive | v4.2.44 static contract + return browser fixture | **VERIFIED** |
| Diffuser persistence | choose diffuser → Save → close/reload/reopen → diffuser remains selected | `stabilization_acceptance_qa.py`; `admin_return_gift_persistence_qa.py` | **VERIFIED** |
| Story chemistry accounting | diffuser gives 0 free packets; chemistry choice gives 2 free used packets | persisted fixture recalculates 2 used packets to 100 грн with diffuser | **VERIFIED** |
| Desktop return settlement | readable two-column workspace; Story block spans full left data grid; no squeezed gift labels/dead summary column | desktop 1440 screenshot + 1024/1280/1440/1650 modal geometry tests | **VERIFIED** |
| PWA return settlement | readable stacked gift choices, fixed actions, no horizontal overflow | mobile 390 stabilization screenshot/test | **VERIFIED** |
| Client card geometry | no left drift; centered/symmetric viewport use | client-card mobile QA + Glass QA | **VERIFIED** |
| Booking actions | secondary actions fill available row; no orphan third-column gap | v4.2.44 static guard + PWA visual QA | **VERIFIED** |
| Finance / Analytics controls | same period-control geometry, fill, x positions, gaps, states | admin control consistency **94/94 PASS** | **VERIFIED** |
| Promo | full-width secondary `Є промокод?` entry, explicit action, progressive open state | v4.2.42 promo contract retained by v4.2.44 static aggregate | **VERIFIED** |
| Public booking | 4-step flow, delivery summary, gifts, availability and manual-address resilience retained | public booking resilience + gift visual **48/48 PASS** | **VERIFIED** |
| Address fallback | valid street + house can proceed even when provider has no exact hit; no fake coordinates | address resilience contracts + public booking QA; address edge v13 ACTIVE | **VERIFIED** |
| Referral | client/referral modal, PWA layout, Instagram iOS launch and return state | referral modal **7/7**, admin mobile **5/5**, iOS **9/9** | **VERIFIED** |
| Navigation | booking → client → new booking / referral / search returns to exact prior context | route smoke **22/22**, context navigation **23/23** | **VERIFIED** |
| Finance visual | delivery / settlement finance surfaces remain readable across desktop widths | finance delivery visual **30/30 PASS**; desktop density **63/63** | **VERIFIED** |

## Exact stabilization acceptance

`npm run test:v4.2.44-stabilization` → **22 / 22 PASS**.

`npm run test:stabilization-acceptance-browser` → **20 / 20 PASS**.

The browser suite exercises the exact high-risk scenario rather than a similar component:

1. actual completed admin booking card;
2. delivery `250 грн` measured at the right edge with address below;
3. open `Попередній розрахунок` on desktop;
4. Story block uses the full left workspace and both gift names are readable;
5. choose `Аромадифузор VA HOME · 50 мл`;
6. Save and verify payload contains `storyGiftChoice=diffuser50`;
7. reload fixture / reopen modal;
8. diffuser remains selected;
9. two used Puzzi packets become **100 грн**, not a free chemistry reward;
10. repeat responsive acceptance on mobile 390.

Screenshots used for visual review:

- `desktop-1440-return-finance.png`
- `desktop-1440-diffuser-persisted.png`
- `mobile-390-return-finance.png`

## Canonical static gate

`npm run qa:static` → **102 / 102 PASS · 0 FAIL · FULL QA GREEN**.

This includes the entire historical static/regression suite plus the v4.2.44 stabilization contract.

## Browser / PWA coverage

All canonical browser suites that can execute in this environment were run individually after the aggregate runner hit the sandbox localhost policy.

**28 / 31 canonical browser suites PASS.** The remaining **3 are ENVIRONMENT BLOCKED, not product assertion failures**:

- `test:e2e` → `ERR_BLOCKED_BY_ADMINISTRATOR` on local `127.0.0.1` server;
- `test:home-mobile-density` → same localhost policy;
- `test:equipment-mobile-density` → same localhost policy.

Representative passes from the 28 executable suites:

- PWA visual QA: **903 assertions PASS**;
- campaign SMS UX: **336 PASS**;
- desktop final visual QA: **411 PASS**;
- admin typography: **185/185 PASS**;
- admin control consistency: **94/94 PASS**;
- desktop density: **63/63 PASS**;
- booking gift visual: **48/48 PASS**;
- finance delivery visual: **30/30 PASS**;
- Smart Guide fit: **32/32 PASS**;
- route smoke: **22/22 PASS**;
- stabilization exact-surface browser: **20/20 PASS**;
- referral iOS: **9/9 PASS**;
- calendar: **8/8 viewports PASS**;
- client completed stats: **8 viewports PASS**.

GitHub Actions remains the authoritative canonical browser/deploy gate after the archive is committed because its runner can open its localhost test server. Do not deploy Pages if that gate is not green.

## UX product review

The final acceptance screenshots were manually reviewed in addition to numeric assertions.

- Desktop return modal no longer reproduces the user-reported squeezed half-column Story cards.
- Both reward options have deliberate card geometry and readable unbroken labels.
- Summary uses content height instead of stretching into a large dead column.
- Modal footer remains visible while the work area scrolls.
- PWA gift options stack cleanly and remain touch-friendly.
- Client card is centered at 390 px without the previous left-offset geometry.
- Actual booking card displays delivery as a financial row: label left, `250 грн` right, route-safe address below.

## Preserved business truth

No changes to catalog prices, delivery tariffs, deposit policy, inventory capacities, booking statuses, promo/RETURN/referral economics, or VA HOME objects.
