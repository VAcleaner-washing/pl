from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ASSETS = DIST / 'assets' if (DIST / 'assets' / 'admin-v250.css').exists() else ROOT / 'assets'
OUT = ROOT / 'pwa-test-results'
OUT.mkdir(exist_ok=True)
css = (ASSETS / 'admin-v250.css').read_text(encoding='utf-8')

markup = '''
<form id="bookingForm">
  <section class="form-section">
    <div class="section-title"><span>1</span><div><h3>Оренда</h3><p>Адмінка · точний час</p></div></div>
    <div class="fields">
      <label class="field rental-moment"><span>Видача</span><input type="date" value="2026-09-06"><div class="time-chip-picker admin-exact-time-picker"><input type="time" value="14:00"><small class="admin-time-tariff-hint">Будь-який час · тарифний момент: вихідний · межа вечора 17:30</small></div></label>
      <label class="field rental-moment"><span>Повернення</span><input type="date" value="2026-09-07"><div class="time-chip-picker admin-exact-time-picker"><input type="time" value="14:00"><small class="admin-time-tariff-hint">Будь-який час · тарифний момент: будній · межа вечора 17:30</small></div></label>
    </div>
  </section>
  <section class="form-section">
    <div class="section-title"><span>4</span><div><h3>Видача та оплата</h3><p>Логістика окремо в обидва боки</p></div></div>
    <div class="fields">
      <div class="admin-logistics-grid wide">
        <article class="admin-logistics-card"><div><strong>На початку</strong><small>Передача клієнту</small></div><div class="admin-logistics-toggle"><button type="button">Клієнт забирає</button><button type="button" class="active">Доставляємо</button></div></article>
        <article class="admin-logistics-card"><div><strong>Повернення</strong><small>Як техніка повертається</small></div><div class="admin-logistics-toggle"><button type="button" class="active">Клієнт повертає</button><button type="button">Забираємо</button></div></article>
        <p class="admin-logistics-note">1 напрямок VAcleaner · тариф доставки 50%</p>
      </div>
      <div class="field delivery-pricing-field wide"><span>Доставка за адресою клієнта</span><div class="delivery-quote-editor"><span>Тариф доставки</span><div><input value="125"><em>грн</em></div><small>125 грн · 1 напрямок із 2 · 50% від повного тарифу 250 грн · локальна зона.</small></div></div>
    </div>
  </section>
</form>
'''

html = f'''<!doctype html><html class="native-test native-v28 v43-prod"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
body{{background:#070b0e!important;color:#eef2f3!important;padding:18px!important}}
#bookingForm{{max-width:760px;margin:auto;display:grid;gap:16px}}
.form-section{{background:#10161a;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px}}
.fields{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
.field{{display:grid;gap:8px}}
@media(max-width:680px){{.fields{{grid-template-columns:1fr}}}}
</style></head><body>{markup}</body></html>'''

checks = []
def check(ok, label):
    checks.append((bool(ok), label))
    print(('PASS' if ok else 'FAIL') + ': ' + label)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width, height in ((390, 844), (430, 932)):
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.set_content(html, wait_until='load')
        time_control = page.locator('.admin-exact-time-picker input').first
        box = time_control.bounding_box()
        check(box and box['width'] > 250 and box['height'] >= 42, f'{width}: exact time is a usable full-width control')
        cards = page.locator('.admin-logistics-card')
        check(cards.count() == 2, f'{width}: start and return logistics are separate cards')
        buttons = page.locator('.admin-logistics-toggle button')
        check(buttons.count() == 4 and all((buttons.nth(i).bounding_box() or {}).get('height', 0) >= 40 for i in range(4)), f'{width}: four logistics actions keep touch geometry')
        check(page.locator('.admin-logistics-note').inner_text().strip().startswith('1 напрямок'), f'{width}: one-way 50% rule is explicit')
        check(page.locator('.delivery-quote-editor input').input_value() == '125', f'{width}: local one-way example is 125 UAH from 250')
        page.screenshot(path=str(OUT / f'admin-booking-v4312-{width}.png'), full_page=True)
        page.close()
    browser.close()

failed = [label for ok, label in checks if not ok]
result = {'passed': len(checks) - len(failed), 'failed': len(failed), 'failures': failed}
(OUT / 'admin-booking-v4312-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
