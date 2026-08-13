# VAcleaner v4.0.34

## Visual fixes

- Booking add-on cards use a stable two-column content layout with an anchored price.
- The long `Плямовивідник від кави, вина та ягід · 30 мл` title stays on one line on wide desktop screens.
- VA SPOT FIX uses the same client-facing explanation in booking and quiz results.
- Quiz recommendation cards now have a contained border, radius and a dedicated 144 px action column.
- `+100 грн` and `Додано ✓` are separated and aligned consistently.
- The admin chemistry page gives the product catalogue the wider column.
- The Puzzi chemistry card no longer stretches to the height of the complete catalogue.
- Chemistry prices are protected from line wrapping.

## Verification

- Build: 314 file checks.
- Public visual contract: 165 assertions.
- Stabilization contract: 170 assertions.
- Rental/deposit/slot policy: 46 assertions.
- Peer admin push and analytics layout: 26 assertions.
- Finance: selected extras are charged immediately.

Browser rendering was attempted, but the Chromium binary available in this workspace exits before page launch. The new visual geometry is covered by explicit CSS contracts and desktop PWA geometry assertions for CI.
