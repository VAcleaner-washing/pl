#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, sys
from pathlib import Path
from typing import Any
from playwright.sync_api import sync_playwright, Page

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pwa_visual_qa as pwa  # noqa: E402

# Stress realistic content: long legal name, Telegram handle, address and comment.
pwa.BOOKINGS[0]['customer_name']='Олександра-Вікторія Коваленко-Петренко'
pwa.BOOKINGS[0]['customer_telegram']='@duzhe_dovgyi_telegram_username_manager_client'
pwa.BOOKINGS[0]['fulfillment']='delivery'
pwa.BOOKINGS[0]['fulfillment_address']='Полтава, вулиця Героїв України, будинок 123-А, під’їзд 4, квартира 158, домофон 3478'
pwa.BOOKINGS[0]['customer_comment']='Дуже довгий коментар клієнта: потрібно почистити великий кутовий диван, два матраци, кілька крісел та килим у вітальні; доступ до квартири через другий під’їзд.'

VIEWS=['bookings','calendar','upcoming','equipment','clients','analytics','chemistry','settings']

class QA:
    def __init__(self, artifacts: Path): self.artifacts=artifacts; self.passed=0; self.failed=[]
    def check(self, cond: bool, label: str):
        if cond: self.passed+=1; print('PASS:',label)
        else: self.failed.append(label); print('FAIL:',label)
    def shot(self,page:Page,name:str): self.artifacts.mkdir(parents=True,exist_ok=True); page.screenshot(path=str(self.artifacts/name),full_page=True)

def no_visible_overflow(page: Page, selector='#view') -> list[dict[str,Any]]:
    return page.locator(selector).evaluate('''root=>{
      const vp=innerWidth;
      return [...root.querySelectorAll('*')].filter(el=>{
        const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
        if(r.width<=1||r.height<=1||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;
        return r.left < -2 || r.right > vp + 2;
      }).slice(0,12).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,cls:String(el.className||''),text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,80),left:r.left,right:r.right}})
    }''')

def inside_viewport(page:Page, selector:str, margin=10):
    b=page.locator(selector).bounding_box();
    if not b:return False
    w=page.viewport_size['width'];h=page.viewport_size['height']
    return b['x']>=margin-1 and b['x']+b['width']<=w-margin+1 and b['y']>=margin-1 and b['y']+b['height']<=h-margin+1

def view_suite(page:Page,qa:QA,width:int):
    runtime_errors=[]
    page.on('pageerror',lambda exc: runtime_errors.append(str(exc)))
    for view in VIEWS:
        page.locator(f'.nav button[data-view="{view}"]').click();page.wait_for_timeout(70)
        qa.check(pwa.no_overflow(page),f'{width}: {view} has no page/main horizontal overflow')
        bad=no_visible_overflow(page)
        qa.check(not bad,f'{width}: {view} has no visible element outside viewport' + (f' ({bad[0]})' if bad else ''))
        head=page.locator('.page-head').bounding_box(); top=page.locator('.topbar').bounding_box()
        qa.check(head is not None and top is not None and head['y']>=top['y']+top['height']+12,f'{width}: {view} heading clears topbar')
        if view=='analytics':
            page_title=page.locator('#pageTitle').inner_text().strip(); sub_title=page.locator('.analytics-toolbar h2').inner_text().strip()
            qa.check(page_title!=sub_title and sub_title=='Показники',f'{width}: analytics hierarchy has no duplicated heading')
        if view=='settings':
            main=page.locator('.main').bounding_box(); deposit=page.locator('#depositRulesForm').bounding_box(); grid=page.locator('.settings-grid')
            qa.check(grid.evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: settings grid stays inside main column')
            qa.check(page.locator('#depositRulesForm').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: deposit settings card has no internal horizontal overflow')
            if width==1024:
                cols=grid.evaluate("el=>getComputedStyle(el).gridTemplateColumns")
                qa.check(' ' not in cols.strip(),f'{width}: settings use one-column tablet-desktop layout')
        if view=='clients':
            qa.check(page.locator('.clients-table').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: clients stay readable without horizontal table scrolling')
        qa.shot(page,f'{width}-{view}.png')
    qa.check(not runtime_errors,f'{width}: all 8 desktop views render without JavaScript errors' + (f' ({runtime_errors[0]})' if runtime_errors else ''))

def search_state(page:Page,qa:QA,width:int):
    page.locator('.nav button[data-view="bookings"]').click();page.locator('#globalSearch').fill('НЕІСНУЮЧИЙ-КЛІЄНТ-999');page.wait_for_timeout(50)
    qa.check(page.locator('.empty-action').count()==1,f'{width}: search empty state renders once')
    qa.check(pwa.no_overflow(page),f'{width}: search empty state has no overflow')
    btn=page.locator('.empty-action .btn').bounding_box();qa.check(btn is not None and btn['height']>=44,f'{width}: empty-state action remains 44px+')
    page.locator('#clearSearch').click();page.wait_for_timeout(30)

def detail_suite(page:Page,qa:QA,width:int):
    page.locator('.nav button[data-view="bookings"]').click();page.wait_for_timeout(30)
    target=pwa.BOOKINGS[0]['id'];page.locator(f'.booking-card[data-id="{target}"]').click();page.wait_for_selector('.detail');page.wait_for_timeout(70)
    qa.check(pwa.no_overflow(page),f'{width}: stressed booking detail has no horizontal overflow')
    qa.check(not no_visible_overflow(page,'.detail'),f'{width}: stressed booking detail stays inside viewport')
    name=page.locator('.detail').get_by_text('Олександра-Вікторія Коваленко-Петренко',exact=True).first
    qa.check(name.count()==1 and name.bounding_box()['height']>20,f'{width}: long customer name remains visible/wrapped')
    address=page.locator('.detail').get_by_text('Полтава, вулиця Героїв України, будинок 123-А, під’їзд 4, квартира 158, домофон 3478',exact=True).first
    qa.check(address.count()==1 and address.bounding_box()['height']>20,f'{width}: long delivery address remains visible/wrapped')
    page.locator('.detail').evaluate('el=>el.scrollTop=el.scrollHeight');page.wait_for_timeout(50)
    qa.check(pwa.no_overflow(page),f'{width}: detail bottom remains stable')
    qa.shot(page,f'{width}-detail-stress.png')
    page.locator('.back').click();page.wait_for_timeout(30)

def modal_check(page:Page,qa:QA,width:int,name:str,selector:str):
    page.wait_for_selector(selector);page.wait_for_timeout(50)
    card=page.locator('.modal-card').bounding_box();footer=page.locator(f'{selector}>footer').bounding_box()
    qa.check(card is not None and card['x']>=10 and card['x']+card['width']<=width-10,f'{width}: {name} modal has balanced horizontal margins')
    qa.check(card is not None and card['y']>=10 and card['y']+card['height']<=page.viewport_size['height']-10,f'{width}: {name} modal stays inside viewport')
    qa.check(footer is not None and footer['y']+footer['height']<=page.viewport_size['height']-10,f'{width}: {name} footer is not clipped')
    qa.check(pwa.no_overflow(page),f'{width}: {name} modal does not widen document/main')
    bad=no_visible_overflow(page,'.modal-card');qa.check(not bad,f'{width}: {name} modal has no visible child outside viewport' + (f' ({bad[0]})' if bad else ''))
    qa.shot(page,f'{width}-modal-{name}.png')
    page.locator(f'{selector} .close').click();page.wait_for_timeout(30)

def modal_suite(page:Page,qa:QA,width:int):
    page.locator('.nav button[data-view="bookings"]').click();page.wait_for_timeout(30)
    page.locator('#newBooking').click();modal_check(page,qa,width,'new-booking','#bookingForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[0]["id"]}"] [data-action="process"]').click();modal_check(page,qa,width,'process','#processForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[2]["id"]}"] [data-action="issue"]').click();modal_check(page,qa,width,'issue','#issueForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[3]["id"]}"] [data-action="complete"]').click();modal_check(page,qa,width,'complete','#financeForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[3]["id"]}"] [data-action="finance"]').click();modal_check(page,qa,width,'finance','#financeForm')
    page.locator('.nav button[data-view="equipment"]').click();page.wait_for_timeout(30);page.locator('#editPrices').click();modal_check(page,qa,width,'catalog','#catalogForm')

def run_size(browser,qa,width,height):
    page=pwa.render_page(browser,width,height)
    try:
        page.locator('.pwa-update-later').click();page.wait_for_timeout(30)
        qa.check(pwa.no_overflow(page),f'{width}: app shell starts without horizontal overflow')
        view_suite(page,qa,width)
        search_state(page,qa,width)
        detail_suite(page,qa,width)
        modal_suite(page,qa,width)
    finally:page.close()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--artifacts',default='final-desktop-test-results');args=ap.parse_args();art=Path(args.artifacts).resolve();qa=QA(art)
    with sync_playwright() as pw:
        opts={'headless':True,'args':['--no-sandbox']};ex=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if ex:opts['executable_path']=ex
        elif Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
        browser=pw.chromium.launch(**opts)
        try:
            run_size(browser,qa,1440,1000);run_size(browser,qa,1280,900);run_size(browser,qa,1024,768)
        except Exception as exc:
            qa.failed.append(f'Unhandled final desktop QA error: {exc}');print('FAIL:',qa.failed[-1])
        finally:browser.close()
    result={'passed':qa.passed,'failed':qa.failed,'status':'passed' if not qa.failed else 'failed'};art.mkdir(parents=True,exist_ok=True);(art/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False));return 0 if not qa.failed else 1
if __name__=='__main__':raise SystemExit(main())
