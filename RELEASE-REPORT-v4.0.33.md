# VAcleaner v4.0.33

## Client-facing stain remover clarity

- Public booking cards now lead with the purpose of each product instead of the internal VA product name.
- `VA SPOT FIX` is presented as an universal stain remover for food, grease, cosmetics and unknown stains.
- `VA STAIN OX` is presented as a stain remover for old coffee, tea, wine, berry and juice marks.
- The redundant “Швидкий вибір” block was removed.
- Quiz questions, result cards, marketing cards and related blog guidance use the same client-first wording.

## Quiz result interaction

- Adding or removing a recommended extra preserves the current inner scroll position.
- The selected button updates to `Додано ✓` and the total is recalculated without jumping to the top.
- Question changes and quiz restart still reset the inner scroll intentionally.

## Verification

- Static build contract: 312 checks passed.
- DOM interaction regression: scroll remained 420 px before and after adding a product; the button and client-facing label updated correctly.
- Browser Playwright coverage for this scenario is included in `scripts/test-smart-guide-fit.py` for GitHub Actions.
