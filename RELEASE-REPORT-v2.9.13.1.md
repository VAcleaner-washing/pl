# VAcleaner v2.9.13.1 — Homepage emergency hotfix

## P0 fixed

- Stopped an infinite MutationObserver/text-replacement loop on public pages.
- The label `ABIR WD8` is now converted only once to `Робот для вікон · ABIR WD8`.
- Removed `characterData` observation because inserted nodes are already covered by `childList + subtree`; the script no longer reacts to its own text edits.
- Bumped `public-experience.js` cache key from `29130` to `29131` in exported HTML.

## Root cause

The previous replacement produced text that still contained the source fragment `ABIR WD8`. Every MutationObserver pass prepended `Робот для вікон ·` again, creating thousands of text fragments and destroying the homepage layout.
