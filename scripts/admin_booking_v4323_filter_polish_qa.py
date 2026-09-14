#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v4323.css').exists() else ROOT/'assets'
OUT=ROOT/'pwa-test-results'
OUT.mkdir(exist_ok=True)

css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v4323.css'))
markup='''
<div class="booking-toolbar" role="group" aria-label="Статуси бронювань">
  <button class="chip active" data-filter="all"><span>Усі</span><b>0</b></button>
  <button class="chip" data-filter="new"><span>Нові</span><b>0</b></button>
  <button class="chip" data-filter="pending"><span>Очікують</span><b>0</b></button>
  <button class="chip" data-filter="confirmed"><span>Підтверджені</span><b>0</b></button>
</div>
'''
html=f'''<!doctype html><html class="v43-prod v4323" data-admin-view="bookings"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>{css}\nhtml,body{{margin:0;background:#070b0e}}body{{padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}</style></head><body>{markup}<script>document.querySelectorAll('.booking-toolbar .chip').forEach(btn=>btn.addEventListener('click',()=>{{document.querySelectorAll('.booking-toolbar .chip').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.body.dataset.clicked=btn.dataset.filter}}));</script></body></html>'''

checks=[]
def check(value,label):
    checks.append((bool(value),label))
    print(('PASS' if value else 'FAIL')+': '+label)

with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch)
    for width,height in ((320,720),(390,844),(430,932)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        rail=page.locator('.booking-toolbar')
        chips=page.locator('.booking-toolbar .chip')
        page.wait_for_selector('.booking-toolbar .chip.active')

        check(chips.count()==4,f'{width}: four canonical booking filters remain present')
        check(all(chips.nth(i).is_visible() for i in range(4)),f'{width}: all four booking filters stay visible')
        rb=rail.bounding_box()
        check(rb is not None and rb['height']<=58,f'{width}: filter rail stays compact')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: no page-level horizontal overflow')
        check(rail.evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: filter rail itself does not need horizontal scrolling')

        active=chips.nth(0)
        active_style=active.evaluate("el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth,shadow:getComputedStyle(el).boxShadow})")
        check(active_style['border']=='0px',f'{width}: active segment has no heavy border')
        check(active_style['bg']!='rgba(0, 0, 0, 0)' and active_style['bg']!='transparent',f'{width}: active segment uses a soft fill')
        check(active_style['shadow']!='none',f'{width}: active segment keeps a restrained inset definition')

        second_border=chips.nth(1).evaluate("el=>getComputedStyle(el).borderLeftWidth")
        check(second_border=='0px',f'{width}: legacy vertical dividers are removed')
        count_style=chips.nth(0).locator('b').evaluate("el=>({position:getComputedStyle(el).position,bg:getComputedStyle(el).backgroundColor,pad:getComputedStyle(el).paddingLeft})")
        check(count_style['position']=='static',f'{width}: count is inline instead of floating in the corner')
        check(count_style['bg'] in ('rgba(0, 0, 0, 0)','transparent'),f'{width}: count has no noisy circular badge')
        check(count_style['pad']=='0px',f'{width}: count stays visually lightweight')

        labels=[chips.nth(i).locator('span').inner_text().strip() for i in range(4)]
        check(labels==['Усі','Нові','Очікують','Підтверджені'],f'{width}: canonical filter labels are unchanged')
        chips.nth(1).click()
        check(page.locator('body').get_attribute('data-clicked')=='new',f'{width}: filter remains directly clickable')
        check(chips.nth(1).evaluate('el=>el.classList.contains("active")'),f'{width}: active state still switches normally')

        page.screenshot(path=str(OUT/f'admin-booking-filter-v4323-{width}.png'),full_page=True)
        page.close()
    browser.close()

failed=[label for passed,label in checks if not passed]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-filter-v4323-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
