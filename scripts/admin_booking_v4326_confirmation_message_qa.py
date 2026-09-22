#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSET_ROOT=DIST if (DIST/'assets'/'admin-v4326.css').exists() else ROOT
CSS=(ASSET_ROOT/'assets'/'admin-v4326.css').read_text(encoding='utf-8')
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

HTML=f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{{--text:#f5f5f5;--muted:#8f989c;--line:#273238}}
*{{box-sizing:border-box}}html,body{{margin:0;background:#070b0e;color:var(--text);font-family:Arial,sans-serif}}
.wrap{{width:min(100%,760px);margin:auto;padding:16px}}
.btn{{border:1px solid var(--line);border-radius:12px;background:#11191d;color:#ddd}}
{CSS}
</style></head><body><div class="wrap"><div class="confirm-message-editor">
<div class="confirm-message-editor-head"><div><b>Текст для клієнта</b><small>Можна відредагувати перед копіюванням.</small></div><button class="btn subtle" type="button" id="resetConfirmMessage">Відновити шаблон</button></div>
<textarea class="confirm-preview confirm-message-textarea" id="confirmPreview" rows="18">Вітаю! Вашу заявку отримано.\n\nУмови оренди...</textarea>
<small class="confirm-message-editor-note">Редагування змінює лише текст для відправки й не змінює дані бронювання.</small>
</div></div>
<script>
const preview=document.querySelector('#confirmPreview'),reset=document.querySelector('#resetConfirmMessage'),template=preview.value;
let dirty=false;
preview.addEventListener('input',()=>dirty=true);
reset.addEventListener('click',()=>{{dirty=false;preview.value=template;}});
</script></body></html>'''

checks=[]
def check(value,label):
    checks.append((bool(value),label))
    print(('PASS' if value else 'FAIL')+': '+label)

with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists():
        launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch)
    for width,height in ((320,720),(390,844),(430,932),(1024,768)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(HTML,wait_until='load')
        textarea=page.locator('#confirmPreview')
        reset=page.locator('#resetConfirmMessage')
        check(textarea.is_visible(),f'{width}: editable message is visible')
        check(textarea.is_editable(),f'{width}: confirmation message is actually editable')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: editor creates no page overflow')
        box=textarea.bounding_box()
        check(box is not None and box['width'] <= width-24,f'{width}: textarea stays inside viewport')
        textarea.fill('Мій відредагований текст')
        check(textarea.input_value()=='Мій відредагований текст',f'{width}: manager edit is retained')
        reset.click()
        check(textarea.input_value().startswith('Вітаю! Вашу заявку'),f'{width}: restore-template action works')
        if width<=430:
            check(box is not None and box['height']>=350,f'{width}: mobile editor has comfortable height')
        page.screenshot(path=str(OUT/f'admin-booking-v4326-message-{width}.png'),full_page=False)
        page.close()
    browser.close()

failed=[label for passed,label in checks if not passed]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-v4326-confirmation-message-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
