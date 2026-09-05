from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v4311.css').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)
css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v4311.css'))
js=(ASSETS/'admin-v4311.js').read_text(encoding='utf-8')
markup='''<form class="modal-form process-form"><div class="process-grid"><section class="modal-section process-contact-section">
<div class="process-actions">
<a class="btn primary" id="sendInstagram" href="https://instagram.com/example">Instagram</a>
<a class="btn telegram-btn" id="sendTelegram" href="https://t.me/example"><span>Telegram</span></a>
<button class="btn" type="button">Скопіювати текст</button>
<a class="btn" href="tel:+380664924882">Подзвонити</a>
</div></section></div></form>'''
html=f'''<!doctype html><html class="native-test native-v28 v43-prod"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}\nbody{{padding:24px!important;background:#070b0e!important}}</style></head><body>{markup}<script>{js}</script></body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label)); print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,height in ((390,844),(430,932)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load'); page.wait_for_timeout(80)
        insta=page.locator('#sendInstagram')
        telegram=page.locator('#sendTelegram')
        call=page.locator('.process-actions a[href^="tel:"]')
        check(call.inner_text().strip()=='Зателефонувати',f'{width}: call action uses Зателефонувати')
        check(insta.evaluate("el=>getComputedStyle(el).textDecorationLine")=='none',f'{width}: Instagram has no link underline')
        check(call.evaluate("el=>getComputedStyle(el).textDecorationLine")=='none',f'{width}: call CTA has no link underline')
        for locator,name in ((insta,'Instagram'),(telegram,'Telegram'),(call,'Call')):
            style=locator.evaluate("el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {display:s.display,align:s.alignItems,justify:s.justifyContent,w:r.width,h:r.height,left:r.left,right:r.right}}")
            check(style['display']=='flex',f'{width}: {name} uses flex button layout')
            check(style['align']=='center' and style['justify']=='center',f'{width}: {name} label is centered')
            check(style['left']>=0 and style['right']<=width+0.5,f'{width}: {name} stays inside viewport')
        buttons=page.locator('.process-actions > *')
        boxes=[buttons.nth(i).bounding_box() for i in range(buttons.count())]
        check(all(box and box['width']>0 and box['height']>=42 for box in boxes),f'{width}: all process actions keep usable touch geometry')
        page.screenshot(path=str(OUT/f'process-contact-v4311-{width}.png'),full_page=True)
        page.close()
    browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'process-contact-v4311-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
