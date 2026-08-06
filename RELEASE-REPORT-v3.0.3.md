# VAcleaner v3.0.3 — GitHub Pages deployment fix

## Що виправлено

- У кастомний workflow додано офіційний крок `actions/configure-pages@v5`.
- Збережено чистий build через `npm run stamp`, `npm run check`, `npm run build`.
- Публікується лише каталог `dist` через `actions/upload-pages-artifact@v3`.
- Deployment виконується через `actions/deploy-pages@v5`.

## Важлива одноразова дія в GitHub

У репозиторії одночасно запускаються два механізми Pages: старий автоматичний `pages build and deployment` і кастомний `Deploy VAcleaner Pages`.

Відкрийте: `Settings → Pages → Build and deployment → Source` і виберіть **GitHub Actions**. Після цього старий dynamic workflow більше не запускатиметься, а залишиться лише кастомний workflow зі збіркою `dist`.

## Перевірки

- YAML workflow перевірено структурно.
- `npm run stamp` пройдено.
- `npm run check` пройдено.
- `npm run build` пройдено.
