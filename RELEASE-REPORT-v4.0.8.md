# VAcleaner v4.0.8 — FULL-SITE VISUAL HARDENING & CI FIX

- Baseline: v4.0.7.
- Release date: 2026-08-09.
- Public: full-site consistency hardening, not a redesign.
- Booking: mobile 4-step isolation kept; progress navigation restored to satisfy browser behavior and CI.
- Smart Guide: no-JS/slow-JS fallback fixed; no blank black standalone page before quiz mount.
- Editorial pages: 901–1180 px hero geometry hardened; `/dostavka/` clipping fixed.
- Contrast: `/dostavka/` cream service cards explicitly use dark text.
- Booking fixed summary: deposit hint shortened; no intentional ellipsis.
- Header parity: `/bronuvannia/` CTA URL canonicalized across public pages.
- Hydration: stale React footer labels/links patched in referenced chunks.
- Generator: `make_v400.py` synchronized with current CSS/JS to prevent future reintroduction of old runtime patches.
- Admin: regression contracts added for desktop client-card, mobile non-override, customer lookup status and stored deposit snapshot.
- Structured data: stale 350 UAH minimum removed from public structured-data range.

See `FULL-SITE-AUDIT-v4.0.8.md` for the concrete findings and test scope.
