#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import importlib.util, shutil
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('baseqa',ROOT/'scripts/pwa_visual_qa.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);base.ROOT=ROOT
INITIAL=(ROOT/'admin/bronuvannia/index.html').read_text(encoding='utf-8').split('<body>',1)[1].split('<noscript>',1)[0]
CSS=['admin-v250.css','admin-glass-test.css','address-autocomplete.css','admin-native-v2.css']
JS=['vacleaner-core.js','admin-v250.js','admin-glass-test.js','address-autocomplete.js','admin-native-v2.js']
passed=0; failed=[]
def check(ok,label):
    global passed
    if ok: passed+=1; print('PASS',label)
    else: failed.append(label); print('FAIL',label)

def boot(browser,width=390,height=844):
    page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True)
    page.set_default_timeout(7000)
    page.evaluate("document.head.innerHTML='<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">'")
    page.evaluate("html=>{document.body.innerHTML=html;document.documentElement.classList.add('glass-test','native-test','native-v2')}",INITIAL)
    page.evaluate(base.init_script(True,True))
    for f in CSS: page.add_style_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    for f in JS: page.add_script_tag(content=(ROOT/'assets'/f).read_text(encoding='utf-8'))
    page.wait_for_selector('.app'); page.wait_for_timeout(260)
    if page.locator('.pwa-update-later').count():
        page.locator('.pwa-update-later').click(); page.wait_for_timeout(30)
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
    try: browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    except PlaywrightError:
        executable=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
        if not executable: raise
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],executable_path=executable)

    for width in (320,390,430):
        page=boot(browser,width)
        try:
            for view in ('upcoming','bookings','calendar','equipment','clients','campaigns','finances','analytics','chemistry','settings'):
                if view!='upcoming': open_view(page,view)
                check(no_overflow(page),f'{width}px {view}: no page overflow')
                check(page.locator('.mobile-nav button:visible').evaluate_all('els=>els.every(e=>e.getBoundingClientRect().height>=44)'),f'{width}px {view}: nav 44+')
        finally: page.close()

    # More navigation state.
    page=boot(browser,390); page.locator('.mobile-nav .more-nav').click(); page.wait_for_selector('.mobile-more-menu'); page.wait_for_timeout(80)
    check(page.locator('.mobile-nav .more-nav.active').count()==1,'More: bottom navigation state active')
    page.close()

    # Settings exact visual-contract checks.
    page=boot(browser,390); open_view(page,'settings')
    check(page.locator('.settings-slot-editor .slot-editor-row').count()>=2,'Settings: slot rows rendered')
    check(page.locator('.settings-slot-editor .slot-editor-row label small').evaluate_all("els=>els.slice(0,4).map(e=>e.textContent.trim()).join('|')==='Початок|Кінець|Початок|Кінець'"),'Settings: human range labels')
    check(page.locator('.settings-slot-editor .premium-control select').evaluate_all("els=>els.every(e=>getComputedStyle(e).borderTopWidth==='0px')"),'Settings: no nested select border')
    check(page.locator('.settings-slot-editor .premium-control').evaluate_all("els=>els.every(e=>parseFloat(getComputedStyle(e).borderTopWidth)===1)"),'Settings: one control shell')
    page.locator('[data-settings-tab="rental"]').click(); page.wait_for_timeout(80)
    check(no_overflow(page),'Settings rental: no overflow')
    page.close()

    # Booking action hierarchy and More sheet.
    page=boot(browser,390); open_view(page,'bookings'); page.wait_for_timeout(100)
    card=page.locator('.booking-card').filter(has=page.locator('.primary-action[data-action="process"]')).first
    check(card.count()==1,'Bookings: pending card exists')
    if card.count():
        more=card.locator('.booking-action-more')
        check(more.count()==1,'Bookings: More exists')
        if more.count():
            h=more.locator('summary').evaluate('e=>e.getBoundingClientRect().height')
            check(43<=h<=50,'Bookings: More summary compact')
            more.locator('summary').click(); page.wait_for_timeout(80)
            sheet=page.locator('.native-v2-action-sheet:visible')
            check(sheet.count()==1,'Bookings: More opens visible sheet')
            check(sheet.locator('.native-v2-sheet-action:visible').count()>=1,'Bookings: More has real action')
            check(sheet.locator('.native-v2-sheet-close:visible').count()==1,'Bookings: More sheet closable')
    page.close()

    # Detail duplicate + icon cleanup.
    page=boot(browser,390)
    page.locator('.upcoming-row .upcoming-actions .btn').first.click(); page.wait_for_selector('.detail'); page.wait_for_timeout(100)
    check(page.locator('.native-detail-card').count()==1,'Detail: native card exists')
    check(page.locator('.native-detail-card .native-detail-info-row[data-v2-date="1"]:visible').count()==0,'Detail: duplicate date row hidden')
    check(page.locator('.native-detail-info-row>i svg').count()>=3,'Detail: SVG icons used')
    check(no_overflow(page),'Detail: no overflow')
    page.close()

    # Client display-only name normalization.
    page=boot(browser,390); open_view(page,'clients'); page.locator('[data-client-open]').first.locator('.client-name').click(); page.wait_for_selector('#clientEditor'); page.wait_for_timeout(100)
    title=page.locator('.client-card-v245>header h2').inner_text().strip()
    check(not (title and title==title.upper() and any(ch.isalpha() for ch in title)),'Client card: no all-caps display name')
    check(no_overflow(page),'Client card: no overflow')
    page.close()

    browser.close()

print(f'NATIVE V2 QA: PASS {passed} · FAIL {len(failed)}')
if failed:
    for x in failed: print(' -',x)
    raise SystemExit(1)
