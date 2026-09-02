#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import importlib.util
import shutil
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text(encoding='utf-8').split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-test.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-match.js']

passed=0; failed=[]
def check(ok,label):
    global passed
    if ok: passed+=1; print('PASS',label)
    else: failed.append(label); print('FAIL',label)

def boot(browser,width):
    page=browser.new_page(viewport={'width':width,'height':844},is_mobile=True)
    page.set_default_timeout(7000)
    page.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
    page.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test')}",INITIAL)
    page.evaluate(base.init_script(True,True))
    for f in CSS: page.add_style_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    for f in JS: page.add_script_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    page.wait_for_selector('.app'); page.wait_for_timeout(220)
    if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click(); page.wait_for_timeout(30)
    return page

def no_overflow(page):
    return page.evaluate("""()=>{const d=document.documentElement,b=document.body,m=document.querySelector('.main');return d.scrollWidth<=innerWidth+1&&b.scrollWidth<=innerWidth+1&&(!m||m.scrollWidth<=m.clientWidth+1)}""")

def open_view(page,view):
    direct=page.locator(f'.mobile-nav [data-mobile-view="{view}"]')
    if direct.count(): direct.click()
    else:
        page.locator('.mobile-nav .more-nav').click(); page.wait_for_selector('.mobile-more-menu'); page.locator(f'[data-more-view="{view}"]').click()
    page.wait_for_timeout(180)

with sync_playwright() as pw:
    try:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    except PlaywrightError:
        executable=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
        if not executable:
            raise
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=executable)
    for width in (320,390,430):
        page=boot(browser,width)
        try:
            for view in ('upcoming','bookings','calendar','equipment','clients','campaigns','finances','analytics','chemistry','settings'):
                if view!='upcoming': open_view(page,view)
                check(no_overflow(page),f'{width}px {view}: no page overflow')
                check(page.locator('.mobile-nav button:visible').evaluate_all('els=>els.every(e=>e.getBoundingClientRect().height>=44)'),f'{width}px {view}: nav touch targets 44+')
            # booking form
            page.locator('#mobileNewBooking').click(); page.wait_for_selector('.booking-form'); page.wait_for_timeout(80)
            check(no_overflow(page),f'{width}px booking form: no overflow')
            check(page.locator('.booking-form>footer .btn:visible').evaluate_all('els=>els.every(e=>e.getBoundingClientRect().height>=44)'),f'{width}px booking form: footer actions 44+')
        finally: page.close()

    # 390px critical modal / sheet surfaces
    page=boot(browser,390)
    page.locator('.upcoming-row .upcoming-actions .btn').first.click(); page.wait_for_selector('.detail'); page.wait_for_timeout(100)
    check(no_overflow(page),'390px booking detail: no overflow')
    check(page.locator('.native-detail-card').count()==1,'390px booking detail: native card exists')
    check(page.locator('.native-detail-card').evaluate("e=>getComputedStyle(e,'::before').width==='5px'"),'390px booking detail: status rail retained')
    page.close()

    page=boot(browser,390); page.locator('.mobile-nav .more-nav').click(); page.wait_for_selector('.mobile-more-menu')
    check(no_overflow(page),'390px More: no overflow')
    check(page.locator('.mobile-more-grid [data-more-view]').count()==7,'390px More: all seven secondary views present')
    page.close()

    page=boot(browser,390); open_view(page,'clients'); page.locator('[data-client-open]').first.locator('.client-name').click(); page.wait_for_selector('#clientEditor'); page.wait_for_timeout(120)
    check(no_overflow(page),'390px client card: no overflow')
    check(page.locator('#clientEditor>footer:visible').count()==0,'390px client card: unchanged save footer hidden')
    page.close()

    page=boot(browser,390); open_view(page,'campaigns'); page.locator('#smsCampaign').click(); page.wait_for_selector('.sms-campaign-modal'); page.wait_for_timeout(450)
    check(no_overflow(page),'390px SMS: no overflow')
    check(page.locator('.sms-campaign-modal .sms-recipient').count()>=3,'390px SMS: recipient workflow preserved')
    page.close()

    page=boot(browser,390); open_view(page,'bookings'); page.wait_for_timeout(100)
    cards=page.locator('.booking-card')
    check(cards.count()>=4,'390px Bookings: status cards rendered')
    if cards.count(): check(cards.first.evaluate("e=>getComputedStyle(e,'::before').width==='5px'"),'390px Bookings: status rail retained')
    page.close(); browser.close()

print(f'NATIVE FULL PWA QA: PASS {passed} · FAIL {len(failed)}')
if failed:
    for x in failed: print(' -',x)
    raise SystemExit(1)
