# VAcleaner v4.0.27

Release date: 2026-08-11  
Build: 4027

## Changes

- Restored the stronger gold phone treatment in mobile `Найближчі` cards.
- Formatted the phone visually as `+38 (0XX) XXX-XX-XX` on screens up to 767 px.
- Kept the desktop phone text, sizing, spacing, and card geometry unchanged.
- Preserved the same clickable `tel:` target on both layouts.

## Regression protection

- Mobile and desktop phone text use separate responsive spans, so a mobile visual change cannot alter the desktop presentation.
- The existing admin, PWA, public, push, analytics, and stabilization checks remain enabled.
