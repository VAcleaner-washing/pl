from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ASSETS = DIST / 'assets' if (DIST / 'assets' / 'admin-v250.css').exists() else ROOT / 'assets'
OUT = ROOT / 'pwa-test-results'
OUT.mkdir(exist_ok=True)
css = (ASSETS / 'admin-v250.css').read_text(encoding='utf-8') + '\n' + (ASSETS / 'admin-v4315.css').read_text(encoding='utf-8')
js = (ASSETS / 'admin-v4316.js').read_text(encoding='utf-8')

markup = '''
<form id="bookingForm">
  <label class="field rental-moment"><span>Видача</span><div class="time-chip-picker admin-exact-time-picker"><input name="pickupTime" type="time" value="08:00"><small class="admin-time-tariff-hint">legacy hint</small></div></label>
  <label class="field rental-moment"><span>Повернення</span><div class="time-chip-picker admin-exact-time-picker"><input name="returnTime" type="time" value="06:30"><small class="admin-time-tariff-hint">legacy hint</small></div></label>
</form>
'''
html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
body{{background:#070b0e!important;color:#eef2f3!important;padding:18px!important}}#bookingForm{{max-width:760px;margin:auto;display:grid;gap:18px}}.field{{display:grid;gap:8px}}
</style></head><body>{markup}</body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label)); print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,height in ((390,844),(430,932)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        page.add_script_tag(content=js)
        page.wait_for_timeout(100)

        triggers=page.locator('.admin-v4315-time-trigger')
        check(triggers.count()==2,f'{width}: both exact-time controls upgraded')
        triggers.nth(0).click(); page.wait_for_timeout(60)
        options=page.locator('.admin-v4315-time-option')
        values=options.evaluate_all("els => els.map(el => el.dataset.time)")
        check(len(values)==29,f'{width}: picker exposes 29 daytime slots')
        check(values[0]=='07:00' and values[-1]=='21:00',f'{width}: range is inclusive 07:00–21:00')
        check('00:00' not in values and '06:30' not in values and '21:30' not in values,f'{width}: night/out-of-range times are not selectable')
        check(all(v.endswith(':00') or v.endswith(':30') for v in values),f'{width}: 30-minute step preserved')
        page.locator('.admin-v4315-time-option[data-time="20:30"]').click()
        check(page.locator('input[name="pickupTime"]').input_value()=='20:30',f'{width}: canonical pickupTime updates from daytime grid')

        triggers.nth(1).click(); page.wait_for_timeout(60)
        legacy=page.locator('.admin-v4315-current-off-grid')
        check(legacy.count()==1 and legacy.get_attribute('data-time')=='06:30',f'{width}: previously saved out-of-range time remains visible as legacy value')
        daytime=page.locator('.admin-v4315-time-option:not(.admin-v4315-current-off-grid)').evaluate_all("els => els.map(el => el.dataset.time)")
        check(daytime[0]=='07:00' and daytime[-1]=='21:00' and len(daytime)==29,f'{width}: legacy value does not expand selectable range')
        page.screenshot(path=str(OUT/f'admin-booking-v4316-time-range-{width}.png'),full_page=False)
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-v4316-time-range-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
