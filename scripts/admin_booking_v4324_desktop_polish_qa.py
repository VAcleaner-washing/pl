#!/usr/bin/env python3
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSETS=DIST/'assets' if (DIST/'assets'/'admin-v4324.css').exists() else ROOT/'assets'
OUT=ROOT/'final-desktop-test-results'
OUT.mkdir(exist_ok=True)

css='\n'.join((ASSETS/name).read_text(encoding='utf-8') for name in ('admin-v250.css','admin-v430.css','admin-v4323.css','admin-v4324.css'))
filters=[('all','Усі','2'),('pending','Нові','0'),('waiting_payment','Очікують','0'),('confirmed','Підтверджені','0'),('issued','Видані','2'),('completed','Повернені','7'),('finished','Завершені оренди','384'),('cancelled','Скасовані','0')]
chips=''.join(f'<button class="chip{" active" if key=="all" else ""}" data-filter="{key}"><span>{label}</span><b>{count}</b></button>' for key,label,count in filters)
ops=''.join(f'<button class="operation-card {cls}"><span>{label}</span><strong>0</strong><small>Відкрити розклад</small></button>' for cls,label in (('new','Нові заявки'),('waiting','Очікують оплату'),('issue','Видачі сьогодні'),('return','Повернення сьогодні')))
html=f'''<!doctype html><html class="native-test v43-prod v4323 v4324" data-admin-view="bookings"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
html,body{{margin:0;background:#070b0e}} .sidebar{{display:block}} .topbar{{display:block}} #fixture .main{{display:block}} #fixture .page-head{{height:92px}} #fixture .booking-list{{height:1200px}}
</style></head><body><div id="fixture"><aside class="sidebar"></aside><header class="topbar"></header><main class="main"><div class="page-head"><h1>Бронювання</h1></div><section class="operations-bar">{ops}</section><div class="toolbar booking-toolbar">{chips}</div><div class="booking-list"></div></main></div><script>document.querySelectorAll('.booking-toolbar .chip').forEach(btn=>btn.addEventListener('click',()=>{{document.querySelectorAll('.booking-toolbar .chip').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.body.dataset.clicked=btn.dataset.filter}}));</script></body></html>'''

checks=[]
def check(value,label):
    checks.append((bool(value),label))
    print(('PASS' if value else 'FAIL')+': '+label)

with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    if Path('/usr/bin/chromium').exists(): launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch)
    for width,height in ((1024,768),(1280,800),(1440,900),(1648,900)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='load')
        main=page.locator('.main')
        toolbar=page.locator('.booking-toolbar')
        chips_loc=page.locator('.booking-toolbar .chip')
        ops_loc=page.locator('.operations-bar')
        page.wait_for_selector('.booking-toolbar .chip.active')

        check(chips_loc.count()==8,f'{width}: all eight canonical desktop filters remain present')
        check(all(chips_loc.nth(i).is_visible() for i in range(8)),f'{width}: every desktop filter stays visible')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width}: no page-level horizontal overflow')
        check(toolbar.evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: desktop toolbar does not horizontally overflow')

        count_style=chips_loc.nth(0).locator('b').evaluate("el=>({position:getComputedStyle(el).position,bg:getComputedStyle(el).backgroundColor,pad:getComputedStyle(el).paddingLeft,radius:getComputedStyle(el).borderRadius})")
        check(count_style['position']=='static',f'{width}: count stays inline')
        check(count_style['bg'] in ('rgba(0, 0, 0, 0)','transparent'),f'{width}: count has no circular badge background')
        check(count_style['pad']=='0px',f'{width}: count badge padding is removed')

        active_style=chips_loc.nth(0).evaluate("el=>({bg:getComputedStyle(el).backgroundColor,radius:getComputedStyle(el).borderRadius,shadow:getComputedStyle(el).boxShadow})")
        check(active_style['bg'] not in ('rgba(0, 0, 0, 0)','transparent'),f'{width}: active filter has restrained fill')
        check(float(active_style['radius'].replace('px',''))<=12,f'{width}: desktop filter is not an oversized pill')

        main_box=main.bounding_box()
        ops_box=ops_loc.bounding_box()
        check(main_box is not None and ops_box is not None and ops_box['y']>=main_box['y']+20,f'{width}: operations row starts below the fixed header scroll boundary')

        main.evaluate('(el)=>{el.scrollTop=260}')
        page.wait_for_timeout(40)
        tb=toolbar.bounding_box()
        mb=main.bounding_box()
        check(tb is not None and mb is not None and tb['y']>=mb['y']+7,f'{width}: sticky filter never tucks under the top bar')

        chips_loc.nth(3).click()
        check(page.locator('body').get_attribute('data-clicked')=='confirmed',f'{width}: canonical filter click remains intact')
        check(chips_loc.nth(3).evaluate('el=>el.classList.contains("active")'),f'{width}: active state still switches normally')

        page.screenshot(path=str(OUT/f'admin-booking-desktop-v4324-{width}.png'),full_page=False)
        page.close()
    browser.close()

failed=[label for passed,label in checks if not passed]
result={'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
(OUT/'admin-booking-desktop-v4324-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if failed else 0)
