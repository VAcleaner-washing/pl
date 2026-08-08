# VAcleaner v3.0.57 — VA HOME ENTRY DEEP-LINK RESTORE

## Scope
Minimal correction on top of v3.0.56. No PWA shell, admin workflow, Supabase, pricing, rental, or VA HOME code changed.

## Fix
- Restored the intentional HOME RESET gift deep-link: `https://vahome.com.ua/catalog?collection=entry`.
- The `collection=entry` query parameter is intentional: the CTA should open VA HOME catalog in the Entry collection context, not the generic catalog.
- Updated static and E2E regression assertions so QA protects the filtered deep-link instead of rewriting it to the generic catalog.

## Archive hygiene
- Keeps the v3.0.56 technical-cleanup policy: only the current Release Report is included at root.

## Acceptance
- HOME RESET gift CTA resolves to the exact Entry collection deep-link.
- No unrelated functional changes.
