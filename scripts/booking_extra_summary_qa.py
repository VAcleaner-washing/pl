#!/usr/bin/env python3
from pathlib import Path
import sys, json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa

EXTRAS=[
    {'code':'spot_lifter','label':'VA SPOT FIX · 50 мл','price':100,'payment_mode':'upfront'},
    {'code':'stain_exit','label':'VA STAIN OX · 30 мл','price':100,'payment_mode':'upfront'},
    {'code':'neutralix','label':'Neutralix · 250 мл','price':200,'payment_mode':'upfront'},
]
for b in pwa.BOOKINGS:
    if b.get('source')!='historical_import':
        b.setdefault('extras',{})['selected_items']=EXTRAS
        b['extras']['selected_items_amount']=400
        b['extras_amount']=400

def dismiss(page):
    if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click();page.wait_for_timeout(25)
def check(results,condition,label):
    results.append((bool(condition),label));print(('PASS' if condition else 'FAIL')+': '+label,flush=True)
def overlap(a,b):
    return not (a['x']+a['width']<=b['x']+1 or b['x']+b['width']<=a['x']+1 or a['y']+a['height']<=b['y']+1 or b['y']+b['height']<=a['y']+1)

results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    for w,h in [(320,800),(390,844),(430,932),(768,1024),(1024,768),(1280,900),(1650,760),(1920,1080)]:
        page=pwa.render_page(browser,w,h);dismiss(page)
        if w<=900:pwa.open_mobile_view(page,'bookings')
        else:page.locator('.nav button[data-view="bookings"]').click()
        page.wait_for_timeout(60)
        first=page.locator('.booking-card').first
        extra=first.locator('.booking-identity-extras')
        text=extra.inner_text().replace('\n',' ').replace('\u00a0',' ').strip()
        check(results,all(x in text for x in ['SPOT FIX 50 мл','STAIN OX 30 мл','Neutralix 250 мл']),f'{w}: booking header shows all selected extra names')
        font=float(extra.evaluate("el=>parseFloat(getComputedStyle(el).fontSize)"))
        check(results,font>=11,f'{w}: booking header extra names stay readable ({font}px)')
        identity=first.locator('.booking-identity').bounding_box(); status=first.locator('.status').bounding_box()
        check(results,identity is not None and status is not None and not overlap(identity,status),f'{w}: extra summary does not collide with status badge')
        check(results,pwa.no_overflow(page),f'{w}: booking list has no horizontal overflow with three extras')
        if w<=900:
            flags=first.locator('.booking-mobile-flags').inner_text() if first.locator('.booking-mobile-flags').count() else ''
            check(results,'Додатково' not in flags,f'{w}: mobile does not duplicate extras as a generic badge')
        first.locator('.booking-row-head').click();page.wait_for_selector('.detail');page.wait_for_timeout(30)
        detail=page.locator('.extras-panel').inner_text()
        check(results,'VA SPOT FIX · 50 мл' in detail and 'VA STAIN OX · 30 мл' in detail and 'Neutralix · 250 мл' in detail,f'{w}: detail keeps full extra labels and prices')
        page.locator('.back').click();page.wait_for_timeout(25)
        if w<=900:pwa.open_mobile_view(page,'upcoming')
        else:page.locator('.nav button[data-view="upcoming"]').click()
        page.wait_for_timeout(50)
        up=page.locator('.upcoming-extra').first
        up_text=up.inner_text().replace('\u00a0',' ').replace('\n',' ').strip() if up.count() else ''
        check(results,up.count()==1 and all(x in up_text for x in ['SPOT FIX 50 мл','STAIN OX 30 мл','Neutralix 250 мл']),f'{w}: upcoming mirrors booking extra names')
        check(results,'грн' not in up_text and 'Дод. хімія' not in up_text,f'{w}: upcoming identity extras do not duplicate price or generic chemistry label')
        check(results,pwa.no_overflow(page),f'{w}: upcoming stays inside viewport with extra names')
        page.close()
    browser.close()
failed=[label for ok,label in results if not ok]
print(json.dumps({'passed':sum(1 for ok,_ in results if ok),'failed':failed},ensure_ascii=False),flush=True)
raise SystemExit(1 if failed else 0)
