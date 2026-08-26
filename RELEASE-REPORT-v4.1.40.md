# VAcleaner v4.1.40 — Address resilience + cache bust

- Backend `vacleaner-address-v1` already updated in Supabase to v4: retry, server cache and diagnostic logging for provider failures.
- Frontend address helper remains a quiet fallback: `Введіть адресу вручну.` without the old yellow `Підказки тимчасово недоступні…` warning and without the OpenStreetMap attribution on fallback.
- Build/cache version bumped from `4139` to `4140` so browsers cannot keep serving the older `address-autocomplete.js?v=4139` after the fix.
- Existing v4.1.39 admin visual-polish changes are preserved.
