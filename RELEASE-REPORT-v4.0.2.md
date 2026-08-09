# VAcleaner v4.0.2 — SMART GUIDE UX FIX

- Smart Guide reveals a −5% rental bonus only on the result screen.
- Booking CTA carries `PIDBIR5`; the booking form fills it automatically.
- Promo applies only to rental base through existing promo/loyalty best-discount logic; delivery, chemistry and extras are not discounted.
- If loyalty is better, the existing best-discount rule keeps loyalty.
- Supabase campaign type `quiz` added; campaign `Підбір рішення · −5%` / `PIDBIR5` is active.
- Campaign is visible in Manager → Кампанії as QUIZ and can be paused/archived like other campaigns.
- Usage limit: 1 per customer; global code cap: 10,000 uses.
- No advance mention of the bonus in hero/navigation/quiz entry; it appears after completion only.


## QA
- Build check: 286 file checks PASS.
- Rental/deposit/slot policy: 46/46 PASS.
- Retention/campaign rules: 18/18 PASS.
- Stabilization contract: 159/159 PASS.
- CSS architecture: PASS.
- Public booking resilience: PASS.
- PWA visual/static QA: 551/551 PASS.
- `public-quiz.js` and `admin-v250.js`: syntax PASS.
- Production Supabase verified: campaign type `quiz`, active `PIDBIR5`, 5%, one use per customer.


## Smart Guide UX fix
- Dedicated /pidbir/ now opens against an isolated opaque standalone layer; site footer/header cannot bleed into the quiz.
- /bronuvannia/ keeps exactly one quiz escape hatch.
- Final “Запитати менеджера” is a real aligned secondary CTA, not loose inline text.

- Quiz hero/media image remains the previous stable asset for this release.
