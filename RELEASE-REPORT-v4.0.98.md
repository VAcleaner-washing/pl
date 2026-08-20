# VAcleaner Release Report — v4.0.98 / build 4098

## Scope
Client-card quick-action balance after v4.0.97.

## Root cause
The v4.0.97 mobile grid reserved disproportionate width for “Нова оренда” (`0.9 / 0.95 / 1.15`), which made “Подзвонити” look noticeably smaller even though all three actions have equal priority.

## Change
- On 361–900 px, `Подзвонити`, `Telegram`, and `Нова оренда` use equal-width columns.
- “Нова оренда” remains one line without reducing font size.
- 320 px retains the two-column + full-width new-rental layout, where three equal columns would be physically too narrow.
- No booking, finance, database, or backend logic changed.

## QA
- Glass V4 client-card QA verifies equal action widths at 390/430 and no overflow at 320/390/430.

## Final verification
- `npm run check` — PASS (345 file checks)
- PWA static — PASS (82 assertions)
- UX static — PASS (24 scenarios)
- CSS architecture — PASS
- Targeted browser matrix 320 / 390 / 430 / 768: no overflow; “Нова оренда” stays one line; 390/430/768 quick actions are equal width.
- Supabase source is byte-for-byte unchanged from v4.0.97.
