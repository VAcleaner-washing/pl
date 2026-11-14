# VAcleaner: перевірка та відновлення стабільної 4.3.46

Цей workflow надає окремий шлях frontend-відкату на **4.3.46 / build4346**, immutable source `15bf61dc4da4cf63405a25887353e6ec7178dce8`. Він перебудовує старий Pages artifact оригінальним build-script та перевіряє точний список270файлів, усі SHA256, release, CNAME, manifest і worker через `scripts/verify-stable-4346.mjs` проти `docs/stable-4346-manifest.json`. У deployment потрапляє artifact `rollback-pages-4346` з того самого запуску. Спільна concurrency-група `pages-${{ github.ref }}` послідовно виконує звичайний main release і manual rollback, не скасовуючи активний запуск.

Відновлення не запускалось під час підготовки цього workflow. PR до `main` лише будує, перевіряє та завантажує artifact; deployment job для PR пропускається. Manual mode за замовчуванням — `verify_only`.

## Перевірити можливість відкату без deployment

1. Відкрити GitHub Actions → **Verify or restore stable VAcleaner 4346** → Run workflow.
2. Обрати гілку `main`, mode **verify_only**; поле confirmation залишити порожнім.
3. Перевірити успішний job **Build and verify exact stable4346 artifact**. Job **Restore verified frontend4346** має статус skipped.
4. Зберегти URL запуску й artifact `rollback-pages-4346`. Зелений verify-only запуск підтверджує підготовку та контроль цілісності artifact, а не production deployment.

## Явно відновити frontend4346

Виконувати лише коли прийнято рішення про frontend-відкат і завершено відкриті незбережені операції адміністратора.

1. Запустити **Verify or restore stable VAcleaner4346** у репозиторії `VAcleaner-washing/pl`, саме з гілки `main`.
2. Обрати mode **restore_4346** і ввести confirmation **ROLLBACK-4346** без пробілів.
3. Дочекатися успішної перевірки270файлів, потім успішного deployment job в environment `github-pages`. Перед підготовкою artifact Node-preflight перевіряє mode, confirmation, branch, repository та event з точним урахуванням регістру. Порожня/інша confirmation, інший mode, branch, repository або event не дозволяють restore job; YAML-guard додатково вимагає успішний prepare.
4. Перевірити на фактичному production host `https://vacleaner.pp.ua/release.json`: version **4.3.46**, build **4346**. Перевірити нормальний manifest `/admin/manifest.webmanifest` зі scope/id `/admin/`, worker `/admin/sw.js`, і asset hashes за stable verifier. GitHub merge або лише зелений prepare job не підтверджують доставку.
5. У відкритій PWA завершити або закрити форми, прийняти запропоноване оновлення чи закрити й відкрити застосунок. Перевірити фактичну версію, вхід, навігацію, відкриття наявного бронювання та server readback. Worker допускає перехід з нового build на4346; вже відкриті windows не зобов’язані миттєво перезавантажитись.

Read-only перевірка після відновлення:

```sh
curl --fail --silent --show-error -A 'Mozilla/5.0' https://vacleaner.pp.ua/release.json
curl --fail --silent --show-error -A 'Mozilla/5.0' https://vacleaner.pp.ua/admin/manifest.webmanifest
curl --fail --silent --show-error -A 'Mozilla/5.0' 'https://vacleaner.pp.ua/admin/sw.js?v=4346'
```

HTTP200чи query `v=4346` самі по собі не засвідчують правильні bytes: потрібні release та hashes. Stable backup ZIP має SHA256 `1d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e`; його270файлів повторно перевірені проти manifest.

## Межа відкату

Це **тільки frontend deployment**. Workflow не викликає Supabase, не змінює database/schema/бронювання/клієнтів/платежі, не надсилає SMS/push/email і не виконує backend rollback. Бізнес-операції, виконані після нового релізу, залишаються в базі. Для окремого backend reporting rollback потрібні попередній function source та власне рішення; database restore не є частиною цього workflow.

Manifest identity, Auth storage та worker scope normal-збірки залишаються `/admin/` і `vacleaner_session`, без stage namespace. Приватні LAB/R4 мають інший origin; stable artifact не треба встановлювати на їхній private Site origin. Фізичні iPhone update/rollback, OS reclaim і нативна клавіатура не сертифікуються статичною перевіркою artifact.
