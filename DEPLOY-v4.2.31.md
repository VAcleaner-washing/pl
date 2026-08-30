# DEPLOY v4.2.31

1. Розпакувати архів у окрему QA-гілку `qa/v4.2.31-delivery-road-visual`.
2. Не використовувати `main` як тестову гілку.
3. Запустити GitHub Actions.
4. Перевірити `Static / build gate` — має бути GREEN.
5. Перевірити `Browser QA aggregate gate` — усі canonical browser/PWA suites мають бути GREEN.
6. Якщо є FAIL — дивитися конкретний suite/log; не merge до повного GREEN.
7. Після GREEN — squash в один release commit і merge у `main`.
8. Після deploy перевірити вручну:
   - Finance → `Доставка по факту`;
   - Passat CC / Fiesta не стискаються і не злипаються;
   - `Середня відстань до клієнта` показує км в один бік;
   - картка `VAC-260829-4489C` показує близько 5.2 км до клієнта і ~20.8 км повного пробігу;
   - `VAC-260830-06DA9` більше не показує `Пальне доставки — Не розраховано`, якщо route вже збережено.
