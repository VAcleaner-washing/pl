# DEPLOY v4.2.32

1. Розпакувати архів у QA-гілку `qa/v4.2.32-admin-typography-audit`.
2. Не використовувати `main` як тестову гілку.
3. Запустити GitHub Actions.
4. `Static / build gate` має бути GREEN.
5. `Browser QA aggregate gate` має бути повністю GREEN; якщо mobile card-height guard або інший suite падає — не merge.
6. Після GREEN зробити squash в один release commit і merge у `main`.
7. Після deploy вручну перевірити:
   - booking status `Видана` / інші statuses;
   - `Попередньо повернути 250 грн` та `Залоговий платіж 1 500 грн` — label спокійний, сума акцентна;
   - client card → `Regular · N завершених оренд · −5% базова знижка` має три рівні акценту;
   - `Основний канал` та `Під’їзд / поверх / домофон / орієнтир` не виглядають жирнішими за введені значення;
   - buttons / quick actions / glass layer не повертають 700+ weight.
