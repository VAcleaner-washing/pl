# QA evidence — v4.2.43

## Exact user-reported surfaces

### Admin booking card / delivery
Verified on mobile widths 320, 390 and 430 px:
- `Доставка` stays on the left;
- `250 грн` is a separate value on the right edge;
- address/route is a separate readable row underneath.

### Return finance / Story gift
Focused browser regression starts from a legacy completed Puzzi booking with two used packets and old chemistry Story state, then:
1. selects `Аромадифузор VA HOME · 50 мл`;
2. saves finance;
3. verifies request payload contains `storyGiftChoice=diffuser50`;
4. reloads server fixture;
5. reopens finance and confirms diffuser remains selected;
6. confirms chemistry does not regain the two-free-portions reward and two used packets calculate as 100 грн.

Result: **9 / 9 PASS**.

### Public booking / promo
The promo entry is a full-width secondary control with a visible border/background, helper copy and explicit `Додати +` action. It remains visually secondary to booking completion.

## Static aggregate
`npm run qa:static` → **101 PASS / 0 FAIL**.
