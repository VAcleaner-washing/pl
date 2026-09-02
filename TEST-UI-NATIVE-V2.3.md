# VAcleaner · Native UI V2.3 Functional Parity / Final RC

Routes:
- Production: `/admin/bronuvannia/`
- Native V2.2: `/admin/bronuvannia-native-v22/`
- Native V2.3: `/admin/bronuvannia-native-v23/`

V2.3 keeps the V2.2 visual direction and restores operational parity with the production v4.2.47 PWA.

## Functional parity fixes
- Detail restores `Історія бронювання` as a compact disclosure with the original audit reload/content nodes and handlers.
- Detail restores `Ще` and uses the same underlying production actions (`Виправити статус`, `Скасувати`) through the existing V2 action sheet proxy.
- Finance restores `Категорія` filtering for the expense ledger.
- Compact completed/cancelled cards retain deposit state and comment presence while staying dense; verbose comment text remains in Detail.
- Mobile `Ще` exposes current Online/Offline state without re-cluttering the topbar.
- Native V2.3 has its own manifest and scoped service worker fallback/deep-links, so offline navigation and pushes do not intentionally fall back to the production visual route.

## Preserved
- Production route/CSS/JS/SW/manifest are unchanged.
- Supabase contracts, pricing, deposits, delivery, availability, booking transitions, SMS, campaigns, RETURN/referral and finance calculations are unchanged.
- Action handlers are not forked; V2.3 surfaces invoke the production handlers.
