from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v439.js').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

v438=(ASSETS/'admin-v438.js').read_text(encoding='utf-8')
v439=(ASSETS/'admin-v439.js').read_text(encoding='utf-8')
legacy='VAcleaner: давно не освіжали дім? 😊 -10% на оренду. Активуйте бонус: {link} Діє 21 день. Стоп: vacleaner.pp.ua/s'
html=f'''<!doctype html><html><head><meta charset="utf-8"></head><body>
<textarea id="smsMessage">{legacy}</textarea>
<script>window.__smsInputEvents=0;document.addEventListener('input',e=>{{if(e.target?.id==='smsMessage')window.__smsInputEvents+=1;}});</script>
<script>{v438}</script><script>{v439}</script>
</body></html>'''

checks=[]
def check(ok,label):
    checks.append((bool(ok),label))
    print(('PASS' if ok else 'FAIL')+': '+label)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':390,'height':844})
    page.set_content(html,wait_until='load')
    page.wait_for_timeout(80)
    field=page.locator('#smsMessage')
    value=field.input_value()
    check(value.startswith('VAcleaner — оренда техніки для прибирання у Полтаві.'),'RETURN draft identifies VAcleaner and the rental service immediately')
    check('★' in value and '−10%' in value,'transport-safe symbols remain in the branded draft')
    check('😊' not in value and '????' not in value,'provider-broken supplementary emoji is absent')
    check('{link}' in value and 'Діє 21 день' in value and 'Відмова: vacleaner.pp.ua/s' in value,'personalized link, lifetime and opt-out remain intact')
    preview=value.replace('{link}','vacleaner.pp.ua/b#XXXXXXX')
    chars=len(preview)
    parts=1 if chars<=70 else (chars+66)//67
    check(parts==3 and 135<=chars<=201,f'preview occupies exactly three Unicode SMS parts ({chars} chars)')
    check(page.evaluate('window.__smsInputEvents')>=1,'runtime copy replacement emits input so counters and preview refresh')
    transported=page.evaluate("window.VACLEANER_SMS_TRANSPORT_TEXT('Тест ★ ✓ — 😊')")
    check('★' in transported and '✓' in transported and '—' in transported and '😊' not in transported,'transport sanitizer preserves supported BMP symbols while filtering broken emoji')
    check(page.evaluate("window.VACLEANER_SMS_BRAND_RETURN_TEXT('Звичайний ручний текст ★')")=='Звичайний ручний текст ★','branding helper does not rewrite unrelated/manual SMS text')
    field.fill('Мій ручний текст ★')
    page.evaluate("document.body.append(document.createElement('i'))")
    page.wait_for_timeout(30)
    check(field.input_value()=='Мій ручний текст ★','later DOM changes do not overwrite manager-edited SMS copy')
    page.close();browser.close()

failed=[label for ok,label in checks if not ok]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'sms-v439-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
