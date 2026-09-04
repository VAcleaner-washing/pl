from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v437.css').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)
css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v436.css','admin-v437.css'))
js=(ASSETS/'admin-v437.js').read_text(encoding='utf-8')

def finance(kind):
    classes='booking-finance'
    dep_class='paid'
    dep_state='· отримано'
    received='2 200 грн'
    if kind=='preissue':
        classes+=' pre-issue'; dep_class='pending'; dep_state='· при видачі'; received='200 грн'
    elif kind=='exception':
        dep_class='pending'; dep_state='· при видачі'; received='200 грн'
    return f'''<article class="card booking-card"><div class="booking-row-body"><div class="{classes}">
      <small>Фінанси</small>
      <strong class="booking-finance-expenses"><span>Разом витрати</span><b>1 650 грн</b></strong>
      <span class="booking-finance-received-summary"><span>Отримано</span><strong>{received}</strong></span>
      <span>отримано {received} · передоплата + залоговий платіж</span>
      <em class="refund"><span>Попередньо повернути</span><strong>550 грн</strong></em>
      <span class="booking-deposit-state {dep_class}"><span>Залоговий платіж</span><strong>2 000 грн</strong><small>{dep_state}</small></span>
    </div></div></article>'''

markup=f'''<main class="qa-v437">
<section data-case="paid">{finance('paid')}</section>
<section data-case="preissue">{finance('preissue')}</section>
<section data-case="exception">{finance('exception')}</section>
</main>'''
html=f'''<!doctype html><html class="native-test native-v28 v43-prod"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}\nbody{{padding:20px!important;background:#070b0e!important}}.qa-v437{{max-width:760px;margin:auto;display:grid;gap:24px}}.qa-v437 section{{min-width:0}}</style></head><body>{markup}<script>{js}</script></body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label)); print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,height in ((390,844),(1440,1000)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load'); page.wait_for_timeout(80)
        paid=page.locator('[data-case="paid"] .booking-finance')
        helper=paid.locator('.booking-finance-received-breakdown')
        check(helper.inner_text().strip()=='Передоплата 200 грн · залог 2 000 грн',f'{width}: paid received row shows one compact prepayment/deposit breakdown')
        paid_dep=paid.locator('.booking-deposit-state')
        check(paid_dep.evaluate("el=>getComputedStyle(el).display")=='none',f'{width}: paid deposit row is removed as redundant')
        legacy=paid.locator('.booking-finance-received-legacy')
        check(legacy.count()==1 and legacy.evaluate("el=>getComputedStyle(el).display")=='none',f'{width}: legacy received sentence is hidden')
        paid_text=paid.inner_text()
        check(paid_text.count('Отримано')==1,f'{width}: paid booking card has one visible received label')
        check('2 200 грн' in paid_text and 'Попередньо повернути' in paid_text,f'{width}: received total and settlement result remain visible')

        pre=page.locator('[data-case="preissue"] .booking-finance')
        check(pre.locator('.booking-deposit-state').evaluate("el=>getComputedStyle(el).display")=='none',f'{width}: expected pre-issue deposit does not create a second row')
        check('залог 2 000 грн при видачі' in pre.locator('.booking-finance-received-breakdown').inner_text(),f'{width}: pre-issue helper explains when deposit is due')

        exc=page.locator('[data-case="exception"] .booking-finance')
        exc_dep=exc.locator('.booking-deposit-state')
        check(exc_dep.evaluate("el=>getComputedStyle(el).display")!='none',f'{width}: missing post-issue deposit remains visible')
        check('Залог не отримано' in exc_dep.inner_text() and 'потрібна перевірка' in exc_dep.inner_text(),f'{width}: exceptional deposit state is explicit')

        if width==390:
            paid.screenshot(path=str(OUT/'mobile-390-booking-finance-v437.png'))
        else:
            paid.screenshot(path=str(OUT/'desktop-1440-booking-finance-v437.png'))
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'finance-card-v437-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
