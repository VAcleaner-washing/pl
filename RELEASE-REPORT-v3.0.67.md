# VAcleaner v3.0.67 — PAGES RELEASE JSON DEPLOY FIX

## Причина
GitHub Pages деплоїть каталог `dist`, а `scripts/build-pages.mjs` помилково виключав кореневий `release.json` із Pages artifact. Через це файл був у репозиторії, але `https://vacleaner.pp.ua/release.json` повертав 404.

## Виправлення
- `release.json` більше не виключається з `dist`.
- Build тепер падає, якщо `dist/release.json` відсутній.
- Build також перевіряє, що `version` і `build` у deployed release збігаються з source release.
- Бізнес-логіка, адмінка, Supabase, GA4/GTM tracking та public UX не змінювались.
