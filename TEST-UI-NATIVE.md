# VAcleaner · Native UI Render Match Test

Тестовий візуальний шар для мобільної PWA.

- Production лишається: `/admin/bronuvannia/`
- Тестова версія: `/admin/bronuvannia-native-test/`
- Бізнес-логіка, Supabase, статуси, фінанси та дії не змінені.
- Тестова версія використовує окремі `admin-native-test.css` + `admin-native-match.js`.
- Візуальна ціль: узгоджений render-reference — великий заголовок, пошук під ним, 3 scope pills, пласкі темні картки, gold accent, native bottom bar, повноекранне «Ще» та спрощений detail.
- Production admin files збережені byte-for-byte відносно v4.2.47 CI Pipeline Hardening для ключових файлів `admin/bronuvannia/index.html`, `assets/admin-v250.css/js`, `assets/admin-glass-test.css/js`, `admin/manifest.webmanifest`, `admin/sw.js`.
- Static QA: 38/38 GREEN.


## v2.1
- Збережено ліва статусна смуга у вкладці «Найближчі».
- Додано ліву статусну смугу у детальному екрані «Бронювання».
- Оновлено cache-bust для test-only assets native route.
