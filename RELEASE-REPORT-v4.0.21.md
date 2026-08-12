# VAcleaner v4.0.21 — Puzzi Landing Audit & Hero Image Fix

## Що змінено

- Hero-фото на `/tekhnika/karcher-puzzi-8-1/` заповнює всю праву панель через `object-fit: cover` без внутрішніх полів і без деформації техніки.
- Фото отримало фіксовані intrinsic-розміри, щоб зменшити зсув макета під час завантаження.
- Верхня CTA Puzzi-сторінки тепер відкриває бронювання з уже вибраним `puzzi`.
- Breadcrumb спрощено до реальної структури сайту без неіснуючої сторінки `/tekhnika/`.
- Текст тарифів у FAQ та умовах зроблено природнішим і точнішим.
- `Offer.availability` змінено з постійного `InStock` на `LimitedAvailability`.

## Що знайшов аудит сайту

- Точна адреса самовивозу була випадково опублікована лише в JSON-LD нової Puzzi-сторінки. Її прибрано; у structured data залишено Полтаву як місто обслуговування.
- Вісім старих public-сторінок усе ще використовували versioned favicon URL. Усі favicon-посилання тепер стабільні й без `?v=`.
- Open Graph URL на восьми сторінках помилково вів на головну. Тепер кожен `og:url` збігається зі своїм canonical.
- Meta description сторінки комплектів був закоротким; опис розширено під реальний зміст сторінки.
- Додано окремий SEO-аудит усіх 22 URL із sitemap та повторні regression-перевірки для Puzzi landing.

## Перевірки

- Production build: PASS, 216 файлів у GitHub Pages artifact.
- Основний build contract: 301 PASS.
- Public visual contract: 154 PASS.
- Public SEO audit: 180 PASS.
- Issue workflow: 12 PASS.
- Booking CTA: 14 PASS.
- Process metadata / push copy: 29 PASS.
- Retention rules: 18 PASS.

Повний Playwright E2E локально не завершено: середовище не надало Chromium-бінарник. Тест не позначено як PASS. GitHub workflow зберігає обов’язковий браузерний gate перед публікацією Pages.
