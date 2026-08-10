# VAcleaner v4.0.20 — 1024 ISSUE MODAL CONTAINMENT FIX

## Зміни

- Виправлено desktop overflow у модалці «Видача техніки» на 1024 px.
- Причина: права grid-колонка `.modal-summary` мала implicit `min-width:auto`, а суми всередині `.live strong` — `white-space:nowrap`; на Chrome 149 це розширювало рядок «Передоплата за бронювання · 200 грн» за viewport приблизно на 5 px.
- Додано коректне width containment: `min-width:0` для issue modal grid items/live rows та wrapping для label-частини без обрізання контенту.
- Бізнес-логіка видачі/фінансів не змінювалась.
- Збережено SEO landing Kärcher Puzzi 8/1 та Google verification файл у корені.

## QA

- `npm run check`: 302 PASS
- issue workflow: 12/12 PASS
- rental/deposit/slot policy: 46 PASS
- finance: 23 PASS
- stabilization: 159 PASS
- desktop density: 60/60 PASS
- targeted browser regression, issue modal: 1440 / 1280 / 1024 PASS
- 1024 problem row after fix: right = 978 px in 1024 px viewport
- full local PWA runner: not completed due environment Playwright `EPIPE`; no code change made to hide that failure

## Production

Local release only until GitHub Actions completes and production `release.json` returns `4.0.20`.
