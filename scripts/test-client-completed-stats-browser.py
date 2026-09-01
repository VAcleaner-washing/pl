#!/usr/bin/env python3
from pathlib import Path
import re, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa

PHONE='+380507352687'; NAME='Куцевол Тетяна'
def mk(idx,status,start,total):
    row=pwa.booking(idx,status)
    row.update({'customer_phone':PHONE,'customer_name':NAME,'start_date':start,'return_date':start,'total_amount':total,'base_amount':total,'product_code':'puzzi','product_label':'Kärcher Puzzi 8/1','booking_code':f'TEST-{idx}'})
    return row
pwa.BOOKINGS[:]=[mk(1,'confirmed','2026-08-24',950),mk(2,'completed','2025-08-10',700),mk(3,'completed','2025-01-10',600)]
def norm(value): return re.sub(r'\s+',' ',value.replace('\xa0',' ')).strip()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    try:
        for width,height in [(320,800),(390,844),(430,932),(768,1024),(1024,768),(1280,900),(1650,760),(1920,1080)]:
            page=pwa.render_page(browser,width,height)
            if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click()
            if width<=900: pwa.open_mobile_view(page,'clients')
            else: page.locator('.nav button[data-view="clients"]').click()
            page.wait_for_timeout(100)
            row=page.locator('[data-client-open]').filter(has_text=NAME).first
            text=norm(row.inner_text())
            direct=row.locator(':scope > strong')
            assert direct.count()>=2 and norm(direct.nth(0).inner_text())=='2' and norm(direct.nth(1).inner_text())=='1 300 грн', text
            assert norm(row.locator('.client-last-date').inner_text())=='10.08.2025' and '24.08.2026' not in text, text
            row.evaluate('el=>el.click()'); page.wait_for_selector('#clientEditor');page.wait_for_timeout(50)
            summary=norm(page.locator('.client-editor-summary').inner_text())
            assert 'ОРЕНД 2' in summary and 'ВИТРАЧЕНО 1 300 грн' in summary and 'ОСТАННЯ ОРЕНДА 10.08.2025' in summary, summary
            history=norm(page.locator('.client-rental-history').inner_text())
            assert '24.08.2026' in history and 'Підтверджена' in history, history
            assert pwa.no_overflow(page), f'{width}: client card has horizontal overflow'
            page.close()
    finally: browser.close()
print('Client completed-stats browser regression passed 8 viewports.')
