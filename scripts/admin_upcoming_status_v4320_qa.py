#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v4320.css').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v4320.css'))
markup='''
<section class="upcoming-list">
  <article class="upcoming-row issue native-v25-upcoming">
    <div class="upcoming-time"><strong>10:00</strong><span>ВИДАЧА</span></div>
    <div class="upcoming-main">
      <div class="upcoming-title"><h3>Puzzi + Jimmy + робот</h3><span class="status confirmed">Підтверджена</span></div>
      <div class="upcoming-extra"><i>+</i><span>Neutralix 250 мл</span></div>
      <div class="upcoming-client-info"><strong>Грінченко Марія Миколаївна</strong></div>
    </div>
  </article>
</section>
'''
html=f'''<!doctype html><html class="native-test native-v2 native-v21 native-v22 native-v23 native-v24 native-v25 native-v26 native-v27 native-v28 v43-prod v4320"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>{css}\nbody{{margin:0;padding:16px;background:#070b0e}}</style></head><body>{markup}</body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label)); print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): opts['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**opts)
    for width,height in ((390,844),(430,932)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        page.wait_for_timeout(50)
        title=page.locator('.upcoming-title')
        h3=title.locator('h3')
        status=title.locator('.status')
        tb=title.bounding_box(); hb=h3.bounding_box(); sb=status.bounding_box()
        check(tb is not None and hb is not None and sb is not None,f'{width}: title/status are rendered')
        if tb and hb and sb:
            check(abs(hb['y']-sb['y'])<=4,f'{width}: status starts on the same top row as equipment title')
            check(sb['x']>hb['x'],f'{width}: status remains to the right of equipment title')
            check(sb['x']+sb['width']<=tb['x']+tb['width']+1,f'{width}: status stays inside title row')
            check(hb['x']+hb['width']<=sb['x']-6,f'{width}: title and status do not overlap')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: no horizontal overflow')
        page.screenshot(path=str(OUT/f'admin-upcoming-status-v4320-{width}.png'),full_page=False)
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-upcoming-status-v4320-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
