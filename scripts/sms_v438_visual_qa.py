from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ASSETS = DIST / 'assets' if (DIST / 'assets' / 'admin-v438.css').exists() else ROOT / 'assets'
OUT = ROOT / 'pwa-test-results'
OUT.mkdir(exist_ok=True)

css = '\n'.join((ASSETS / name).read_text(encoding='utf-8') for name in (
    'admin-v250.css', 'admin-glass-test.css', 'admin-v430.css', 'admin-v438.css'
))
js = (ASSETS / 'admin-v438.js').read_text(encoding='utf-8')

rows = ''.join(
    f'''<article data-sms-dispatch-row="{i}"><div><b>RETURN · 180+ днів</b><small>04.09.2026, 16:{30+i:02d}</small></div><div><span class="sms-dispatch-status sent">Надіслано</span><button class="btn subtle">Кому</button><button class="btn subtle">↻</button></div></article>'''
    for i in range(8)
)
markup = f'''
<div class="modal" style="display:flex">
  <div class="modal-card">
    <div class="sms-campaign-modal history-mode">
      <header class="sms-workspace-header">
        <div class="sms-heading"><small>SendPulse</small><h2>SMS · RETURN · 180+ днів</h2></div>
        <div class="sms-header-actions"><button class="sms-history-open">Журнал <span>8</span></button><button class="close">×</button></div>
        <div class="sms-header-meta"><span class="sms-meta-item"><small>Відправник</small><b>VACLEANER</b></span><span class="sms-meta-item"><small>Пауза</small><b>90 днів</b></span><span class="sms-meta-item"><small>Баланс</small><b>247.48 UAH</b></span></div>
      </header>
      <div class="sms-workspace-body">
        <nav class="sms-stepper"><button>1 Клієнти</button><button>2 Текст</button><button>3 Перевірка</button></nav>
        <div class="sms-stage">
          <section class="sms-history-panel active" id="smsHistoryPanel">
            <div class="sms-history-head"><div><small>Журнал</small><h3>Останні SMS</h3><p>8 останніх записів</p></div><button class="btn subtle">← До розсилки</button></div>
            <div class="sms-history-list" id="smsHistory">{rows}</div>
          </section>
        </div>
      </div>
      <footer class="sms-workspace-footer"><button>Назад</button><button>Далі</button></footer>
    </div>
  </div>
</div>
<textarea id="smsMessage">VAcleaner: давно не освіжали дім? 😊 -10% на оренду.</textarea>
'''
html = f'''<!doctype html><html class="glass-test native-test native-v25 native-v26 native-v27 native-v28 v43-prod"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>{css}\nhtml,body{{margin:0;width:100%;height:100%;background:#070b0e}}</style></head><body>{markup}<script>{js}</script></body></html>'''

checks = []
def check(ok, label):
    checks.append((bool(ok), label))
    print(('PASS' if ok else 'FAIL') + ': ' + label)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width, height in ((390, 844), (430, 932)):
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.set_content(html, wait_until='load')
        page.wait_for_timeout(100)

        card = page.locator('.modal-card:has(.sms-campaign-modal)')
        panel = page.locator('#smsHistoryPanel')
        history = page.locator('#smsHistory')
        footer = page.locator('.sms-workspace-footer')
        card_box = card.bounding_box()
        panel_box = panel.bounding_box()
        history_box = history.bounding_box()

        check(card_box is not None and abs(card_box['y']) <= 1 and abs((card_box['y'] + card_box['height']) - height) <= 1,
              f'{width}: SMS modal fills the mobile viewport without a dead bottom strip')
        check(panel_box is not None and panel_box['height'] > height * .45,
              f'{width}: journal panel reclaims the workflow footer space')
        check(history_box is not None and history_box['height'] > height * .32,
              f'{width}: journal list owns a substantial scroll viewport')
        check(footer.evaluate("el=>getComputedStyle(el).display") == 'none',
              f'{width}: journal mode hides inactive workflow footer')

        last = history.locator('article').last
        last.scroll_into_view_if_needed()
        page.wait_for_timeout(30)
        last_box = last.bounding_box()
        history_box = history.bounding_box()
        check(last_box is not None and history_box is not None and last_box['y'] + last_box['height'] <= history_box['y'] + history_box['height'] + 1,
              f'{width}: final SMS journal card can scroll fully into view')

        field = page.locator('#smsMessage')
        check('😊' not in field.input_value() and 'давно не освіжали дім?' in field.input_value(),
              f'{width}: default RETURN copy removes provider-broken emoji but keeps Ukrainian text')
        normalized = page.evaluate("window.VACLEANER_SMS_TRANSPORT_TEXT('Тест 😊 повідомлення')")
        check(normalized == 'Тест повідомлення',
              f'{width}: SMS transport normalizer strips unsupported pictographs deterministically')

        if width == 390:
            page.screenshot(path=str(OUT / 'mobile-390-sms-journal-v438.png'), full_page=True)
        else:
            page.screenshot(path=str(OUT / 'mobile-430-sms-journal-v438.png'), full_page=True)
        page.close()
    browser.close()

failed = [label for ok, label in checks if not ok]
result = {'passed': len(checks) - len(failed), 'failed': len(failed), 'failures': failed}
(OUT / 'sms-v438-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
