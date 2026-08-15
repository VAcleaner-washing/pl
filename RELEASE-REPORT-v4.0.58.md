# VAcleaner v4.0.58 — PIDBIR QUIZ PHOTO UPDATE

## Scope
Replaced the Smart Guide / `/pidbir/` visual with the new warm living-room photo provided in chat.

## Updated
- `assets/quiz-cleaning-guide-v4058.webp` — new primary quiz visual
- `assets/public-quiz.js` — both quiz media blocks now use the new image
- public HTML references now load `public-quiz.js?v=4058` to avoid stale browser cache

## Where the new visual appears
- `/pidbir/` standalone Smart Guide page
- the quiz intro / guide card rendered by `public-quiz.js`
- the first quiz step side visual (`zones` question)

## Notes
Only the public quiz image was changed. Booking, packages, admin and pricing logic were not modified.
