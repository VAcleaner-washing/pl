#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSET_ROOT=DIST if (DIST/'assets'/'admin-v4327.css').exists() else ROOT
CSS=(ASSET_ROOT/'assets'/'admin-v4327.css').read_text(encoding='utf-8')
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

HTML=f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{{--text:#f4f4f2;--muted:#91999d;--line:#293338}}
*{{box-sizing:border-box}}html,body{{margin:0;background:#070b0e;color:var(--text);font-family:Arial,sans-serif}}
.wrap{{width:min(100%,820px);margin:auto;padding:14px}}.card{{border:1px solid var(--line);border-radius:20px;background:#10171a;padding-top:16px;margin-bottom:18px}}
.btn{{border:1px solid var(--line);border-radius:12px;background:#11191d;color:#ddd;padding:8px 12px}}
.upcoming-row{{border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:18px}}.upcoming-main{{display:grid;gap:5px}}
{CSS}
</style></head><body><div class="wrap">
<article class="card booking-card">
<button class="booking-document-warning" type="button"><span>⚠ Документи не отримані</span><small>Бронювання можна вести далі, але документи потрібно дозібрати до видачі.</small><b>Додати</b></button>
</article>
<article class="upcoming-row"><div class="upcoming-main"><strong>Клієнт</strong><button class="upcoming-doc-warning" type="button">⚠ Документи не отримані · додати</button></div></article>
<div class="issue-document-warning"><b>⚠ Документи ще не отримані</b><span>Бронювання вже підтверджене, але до видачі потрібно отримати й перевірити документ клієнта.</span><button class="btn subtle" type="button">Додати документи</button></div>
</div></body></html>'''

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
        card=page.locator('.booking-document-warning')
        upcoming=page.locator('.upcoming-doc-warning')
        issue=page.locator('.issue-document-warning')
        check(card.is_visible(),f'{width}: booking-card document reminder is visible')
        check(upcoming.is_visible(),f'{width}: upcoming document reminder is visible')
        check(issue.is_visible(),f'{width}: issue modal document reminder is visible')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: document reminders create no page overflow')
        cbox=card.bounding_box()
        ibox=issue.bounding_box()
        check(cbox is not None and cbox['width'] <= width-20,f'{width}: booking reminder stays inside viewport')
        check(ibox is not None and ibox['width'] <= width-20,f'{width}: issue reminder stays inside viewport')
        if width<=430:
            button=issue.locator('button')
            check(button.is_visible(),f'{width}: add-documents action remains visible on mobile')
            check(button.bounding_box()['width'] >= ibox['width']-30,f'{width}: mobile issue action is easy to tap')
        page.screenshot(path=str(OUT/f'admin-booking-v4327-documents-{width}.png'),full_page=False)
        page.close()
    browser.close()

failed=[label for passed,label in checks if not passed]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-v4327-pending-documents-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
