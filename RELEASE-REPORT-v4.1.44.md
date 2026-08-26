# VAcleaner v4.1.44 — BOOKING HARDENING + SMART ENTRY

## Що змінилось
- Generic booking більше не показує 9 рівноправних варіантів одразу: спочатку людина обирає задачу.
- Диван / крісла: основна рекомендація — Kärcher Puzzi; Puzzi + Jimmy показується як глибший варіант із сухим етапом.
- Матрац / ліжко: основна рекомендація — Puzzi + Jimmy; Puzzi лишається простішим варіантом.
- Кухня / ванна, вікна та весь дім показують тільки релевантні рішення.
- Прямі переходи з product pages, Smart Guide, promo/RETURN та preset-посилань не змушують проходити новий task selector повторно.
- Draft бронювання зберігається в sessionStorage 60 хвилин і відновлюється після refresh / interruption.
- Mobile browser Back повертає по кроках бронювання, а не одразу викидає з funnel.
- Поле промокоду сховане під «Є промокод?», автоматичні персональні бонуси залишаються сумісними.
- «Орієнтовно» у booking summary замінено на «Вартість бронювання» / «Вартість».
- Доданий route loader у public-experience.js, тому hardening підтягується і при client-side переході в бронювання.

## Не змінювалось
- server-side availability / inventory reservation;
- тарифи й rental-day policy;
- deposit rules;
- delivery address / Poltava + suburbs flow;
- RETURN / loyalty / promo backend;
- Supabase schema та Edge Functions.

## Перевірено
- JS syntax: OK.
- Build check: 370 file checks OK.
- Pages artifact: 215 files / ~6.8 MiB.
- Public booking resilience: PASS.
- Booking CTA / date / deposit / stabilization / PWA static: PASS.
- RETURN v4.1.30 regression: 23/23.
- Address v4.1.34–v4.1.37 regressions: PASS.
- Admin visual v4.1.39 and fulfillment v4.1.41 regressions: PASS.
- v4.1.44 static regression: PASS.
- Targeted Chromium mock: smart task → mattress recommendation, Puzzi+Jimmy selection, draft restore, mobile Back, promo disclosure, direct preset bypass — PASS.
- Public step-order browser test: 1 → 2 → 3 → 4 enforced — PASS.

Note: full localhost E2E navigation cannot run in this container because its Chromium policy blocks page.goto(http://127.0.0.1). The same browser engine was used with isolated DOM fixtures for the new v4.1.44 behavior; GitHub Actions is still configured to run the full URL-based E2E suite on deploy.
