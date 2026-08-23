# VAcleaner v4.1.06 / build 4106

## Scope

Two focused fixes on top of v4.1.05:

1. **Upcoming desktop action hierarchy** — the financial state, `Відкрити`, optional Telegram action and the primary issue/return action now share one aligned right-side stack on wide desktop. The 901–1180 bridge and mobile/tablet keep their compact responsive layouts instead of inheriting the wide-desktop stack.
2. **GitHub E2E reviews CTA regression** — `/vidhuky/` was intentionally rebuilt in v4.1.05, but `e2e_smoke.py` still waited for the retired `.vx-proof__cta`. The test now targets the actual `.social-proof .button-gold` CTA and verifies visibility, VAcleaner styling and the live Instagram destination instead of extending the timeout.

## Root causes

- Upcoming used separate grid columns for finance and actions, so the right edge read as three unrelated controls instead of one operational column.
- The failed GitHub Actions run `32629129034` was not a page crash: the old E2E selector no longer existed after the honest social-proof redesign. Static/growth visual checks for `/vidhuky/` were green in that same run.

## QA

- `npm run check` — **337 file checks PASS**.
- `npm run test:pwa-static` — **82/82 PASS**.
- `npm run test:stabilization` — **172/172 PASS**.
- `npm run test:desktop-final` — **319/319 PASS** across 1650×760, 1440×1000, 1280×900 and 1024×768. Wide desktop explicitly asserts one aligned Upcoming right column and vertically stacked actions.
- Dedicated Upcoming mobile/tablet browser probe — **4/4 PASS** at 320, 390, 430 and 768; no horizontal overflow, action controls remain 44px+.
- `npm run test:public-visual-contract` — **203/203 PASS**.
- `npm run test:growth-content` — PASS.
- `npm run test:growth-visual` — completed before the subsequent full-PWA timeout and kept `/vidhuky/` green across its visual matrix.
- Dedicated browser check for `.social-proof .button-gold` — PASS: 52px high, gold gradient, dark text, correct Instagram URL.
- Full `npm run test:pwa` progressed through 320/390/430 with all executed assertions PASS, then exceeded the local execution window. No full-suite PASS is claimed.
- Local full `test:e2e` could not start in this runtime because Chromium was blocked from the temporary `127.0.0.1` server with `ERR_BLOCKED_BY_ADMINISTRATOR`; therefore GitHub Actions is the source of truth for confirming this exact E2E selector fix after commit. The failing assertion itself was reproduced from the GitHub log and corrected structurally; timeout was not increased.

## Backend

No Supabase schema, table, policy, storage, auth or Edge Function deployment is part of v4.1.06.

## Release state

Packaged only. Do not call v4.1.06 live or CI-green until it is deployed/committed and a new GitHub Actions run succeeds.
