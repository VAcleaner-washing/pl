# v4.3.40 / build 4340 — PWA startup and cache

Settings no longer delay the start of five independent business reads. Their results still wait for settings before calendar calculation and first rendering. Focus/pageshow while loading joins the existing startup instead of launching another read; subsequent live refresh remains active.

The admin service worker reuses only exact current-build JS/CSS. HTML stays network-first, API/mutations bypass the cache, and an update still waits for the manager's existing consent flow. A failed cache write cannot hide a successful network response.

Validation requires isolated real-runtime startup/cache tests, shipped-asset repeated timing samples, real worker offline/update coverage, full Static/build and Browser/PWA gates and responsive screenshot review. These are laboratory checks, not physical iPhone or production mutation tests.

Frontend-only rollout; no Edge Function, database, tariff or saved finance changes. Rollback reference: main 118dc5221d321c35590a31c3179a36423c067046 (v4.3.39); the existing controlled worker update must also be verified after rollback.
