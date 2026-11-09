# v4.3.46 / build 4346 — friend referral in an existing booking

Baseline: 03488a6c4ff1a647e8aba4110223946bbc6bbc08 / v4.3.45.

An existing unissued first rental can accept a friend code through an explicit «Застосувати код» action. The saved rental-price snapshot and referral use commit atomically; source, delivery, dates, deposits, payments and other draft inputs stay intact. The current booking is excluded from prior-rental validation. Self referrals, other active/completed rentals, repeated use, inactive codes, stronger discounts, attached promos and issued/completed rentals remain protected.

The existing create flow and −100 / −150 / 150-day referral rules are unchanged. The referrer reward is activated by the existing completion path, not by attaching the code. A referral is displayed separately from removable RETURN promos.

Rollout order: validate the additive SQL migration and actual HTTP handler against isolated PostgreSQL; run canonical static/browser/PWA and WebKit gates; apply the service-role-only RPC, deploy the reviewed active admin v4 with the existing internal-auth policy, verify deployed source/dependencies and RPC privileges, then publish the matching Pages artifact through a reviewed PR. Preserve the previous v12 function files for rollback. No VA HOME deployment, SMS send or direct production booking/customer financial edits.

QA: `test:booking-friend-referral` covers real HTTP TypeScript/JavaScript handlers plus actual PostgreSQL transaction rollback, concurrent state changes, snapshot pricing and role permissions. `test:booking-friend-referral-browser` uses shipped assets and synthetic API mutations at 320/390/430/768/1440 px in Chromium and WebKit; existing canonical gates remain required.
