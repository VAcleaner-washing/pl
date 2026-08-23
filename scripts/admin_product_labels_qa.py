#!/usr/bin/env python3
from pathlib import Path
import sys, json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa
PUBLIC='Текстиль + кухня та ванна'; INTERNAL='Puzzi + SC 2'
for b in pwa.BOOKINGS:
    if b.get('source')!='historical_import': b['product_code']='combo'; b['product_label']=PUBLIC

def dismiss(page):
    if page.locator('.pwa-update-later').count(): page.locator('.pwa-update-later').click();page.wait_for_timeout(30)
def record(results,cond,label):
    results.append((bool(cond),label)); print(('PASS' if cond else 'FAIL')+': '+label,flush=True)
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for w,h in [(320,800),(390,844),(430,932),(768,1024),(1024,768),(1280,900),(1650,760),(1920,1080)]:
        page=pwa.render_page(browser,w,h);dismiss(page)
        if w<=900:pwa.open_mobile_view(page,'bookings')
        else:page.locator('.nav button[data-view="bookings"]').click()
        page.wait_for_timeout(50)
        titles=page.locator('.booking-identity h2').all_inner_texts()
        record(results,INTERNAL in titles and PUBLIC not in titles,f'{w}: booking list resolves public label to internal name')
        record(results,pwa.no_overflow(page),f'{w}: booking list remains inside viewport')
        page.locator('.booking-card .booking-row-head').first.click();page.wait_for_selector('.detail')
        record(results,page.locator('.detail-title-row h1').inner_text().strip()==INTERNAL,f'{w}: detail resolves public label to internal name')
        page.locator('.back').click();page.wait_for_timeout(30)
        if w<=900:pwa.open_mobile_view(page,'upcoming')
        else:page.locator('.nav button[data-view="upcoming"]').click()
        page.wait_for_timeout(40)
        ups=page.locator('.upcoming-title h3').all_inner_texts()
        record(results,bool(ups) and PUBLIC not in ups and INTERNAL in ups,f'{w}: upcoming resolves public label to internal name')
        if w==1024:
            page.locator('.nav button[data-view="clients"]').click();page.wait_for_timeout(50)
            page.locator('[data-client-open]').first.click();page.wait_for_selector('.client-card-form')
            rental_titles=page.locator('.client-rental-history article>div:first-child>strong').all_inner_texts()
            record(results,PUBLIC not in rental_titles,f'{w}: client rental history never shows public package label')
            page.locator('.client-card-form .close').click();page.wait_for_timeout(20)
            page.locator('.nav button[data-view="equipment"]').click();page.wait_for_timeout(30)
            equipment=page.locator('.equipment-card h3').all_inner_texts()
            record(results,INTERNAL in equipment and PUBLIC not in equipment,f'{w}: equipment page uses internal names')
            page.locator('#editPrices').click();page.wait_for_selector('#catalogForm')
            editor=page.locator('.catalog-item-copy strong').all_inner_texts()
            record(results,INTERNAL in editor and PUBLIC not in editor,f'{w}: price editor uses internal names')
            page.locator('#catalogForm .close').click();page.wait_for_timeout(20)
            page.locator('.nav button[data-view="campaigns"]').click();page.wait_for_timeout(30)
            page.locator('#newCampaign').click();page.wait_for_selector('#campaignForm')
            opts=page.locator('#campaignForm select[name="productCode"] option').all_inner_texts()
            record(results,INTERNAL in opts and PUBLIC not in opts,f'{w}: PRODUCT campaign picker uses internal names')
            page.locator('#campaignForm .close').click();page.wait_for_timeout(20)
            page.locator('.nav button[data-view="bookings"]').click();page.wait_for_timeout(30)
            confirmed=next(x for x in pwa.BOOKINGS if x['status']=='confirmed')
            page.locator(f'.booking-card[data-id="{confirmed["id"]}"] [data-action="issue"]').click();page.wait_for_selector('#issueForm')
            record(results,page.locator('#issueForm .issue-booking-head strong').first.inner_text().strip()==INTERNAL,f'{w}: issue modal uses internal name')
            page.locator('#issueForm .close').click();page.wait_for_timeout(20)
            issued=next(x for x in pwa.BOOKINGS if x['status']=='issued')
            page.locator(f'.booking-card[data-id="{issued["id"]}"] [data-action="finance"]').click();page.wait_for_selector('#financeForm')
            record(results,page.locator('#financeForm .issue-booking-head strong').first.inner_text().strip()==INTERNAL,f'{w}: finance modal uses internal name')
            page.locator('#financeForm .close').click();page.wait_for_timeout(20)
        page.close()
    browser.close()
failed=[label for ok,label in results if not ok]
print(json.dumps({'passed':sum(1 for ok,_ in results if ok),'failed':failed},ensure_ascii=False),flush=True)
raise SystemExit(1 if failed else 0)
