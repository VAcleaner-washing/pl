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

VIEWS=['bookings','calendar','upcoming','equipment','clients','campaigns','analytics','chemistry','settings']

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
        if view=='upcoming' and width>=1280:
            sides=page.locator('.upcoming-row .upcoming-side').evaluate_all("""nodes=>nodes.map(side=>{const sr=side.getBoundingClientRect(),money=side.querySelector('.upcoming-money')?.getBoundingClientRect(),buttons=[...side.querySelectorAll('.upcoming-actions .btn')].map(b=>b.getBoundingClientRect());return{side:sr,money,buttons}})""")
            aligned=bool(sides) and all(row['money'] and abs(row['money']['x']-row['side']['x'])<=1.5 and abs(row['money']['width']-row['side']['width'])<=1.5 and all(abs(b['x']-row['side']['x'])<=1.5 and abs(b['width']-row['side']['width'])<=1.5 for b in row['buttons']) for row in sides)
            stacked=bool(sides) and all(all(row['buttons'][i]['y']+row['buttons'][i]['height']<=row['buttons'][i+1]['y']+1 for i in range(len(row['buttons'])-1)) for row in sides)
            qa.check(aligned,f'{width}: upcoming finance and actions share one aligned right column')
            qa.check(stacked,f'{width}: upcoming desktop actions stack vertically without overlap')
        if view=='bookings' and width>=1280:
            issued=page.locator('.booking-card').filter(has=page.locator('.status.issued')).first
            if issued.count()==0:
                issued=page.locator('.booking-card').filter(has_text='Видана').first
            dep=issued.locator('.booking-deposit-state') if issued.count() else page.locator('.booking-deposit-state.paid').first
            margin=issued.locator('.booking-margin-pill') if issued.count() else page.locator('.booking-margin-pill').first
            if dep.count():
                dep_style=dep.evaluate("el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el),strong=el.querySelector('strong')?.getBoundingClientRect();return{w:r.width,h:r.height,radius:parseFloat(cs.borderTopLeftRadius),display:cs.display,strongRight:strong?strong.right:null,right:r.right}}")
                qa.check(dep_style['radius']<=12 and dep_style['h']<=58 and dep_style['display'] in ('grid','inline-grid'),f'{width}: booking deposit uses compact rounded info-block geometry, not a capsule')
                qa.check(dep_style['strongRight'] is not None and dep_style['right']-dep_style['strongRight']<=12,f'{width}: booking deposit amount aligns cleanly to the right edge')
            if margin.count():
                margin_style=margin.evaluate("el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return{h:r.height,radius:parseFloat(cs.borderTopLeftRadius)}}")
                qa.check(margin_style['radius']<=12 and margin_style['h']<=42,f'{width}: booking margin badge uses the same restrained rounded-rectangle language')
        if view=='analytics':
            page_title=page.locator('#pageTitle').inner_text().strip(); sub_title=page.locator('.analytics-toolbar h2').inner_text().strip()
            qa.check(page_title!=sub_title and sub_title=='Показники',f'{width}: analytics hierarchy has no duplicated heading')
        if view=='settings':
            qa.check(page.locator('.settings-tabs').count()==1 and page.locator('.settings-tab').count()==5,f'{width}: settings exposes five task-focused tabs')
            qa.check(page.locator('.settings-shell').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: settings shell stays inside main column')
            for tab in ['rental','delivery','equipment','notifications','system']:
                page.locator(f'[data-settings-tab="{tab}"]').click();page.wait_for_timeout(20)
                panel=page.locator(f'[data-settings-panel="{tab}"]:visible')
                qa.check(page.locator('.settings-panel:visible').count()==1 and panel.count()==1,f'{width}: settings {tab} owns one visible workspace')
                qa.check(panel.evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: settings {tab} workspace has no horizontal overflow')
                if tab=='rental':
                    qa.check(page.locator('#depositRulesForm:visible').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: deposit table fits rental workspace')
                if tab=='delivery':
                    qa.check(page.locator('.delivery-economics:visible').count()==0,f'{width}: delivery profitability is not mixed into settings')
                if tab=='system':
                    qa.check(page.locator('.operational-health-card:visible').count()==1,f'{width}: production health lives in system tab')
            page.locator('[data-settings-tab="rental"]').click();page.wait_for_timeout(20)
        if view=='clients':
            qa.check(page.locator('.clients-table').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: clients stay readable without horizontal table scrolling')
        if view=='campaigns':
            campaign_layout=page.locator('.campaign-panel').evaluate("""el=>{const head=el.querySelector('.campaign-panel-head'),summary=el.querySelector('.campaign-summary'),row=el.querySelector('.campaign-row');return{head:getComputedStyle(head).display,summary:getComputedStyle(summary).display,summaryCols:getComputedStyle(summary).gridTemplateColumns.split(' ').filter(Boolean).length,row:row?getComputedStyle(row).display:'none',name:parseFloat(getComputedStyle(el.querySelector('.campaign-main>strong')).fontSize),sub:parseFloat(getComputedStyle(el.querySelector('.campaign-main>small')).fontSize),kpi:parseFloat(getComputedStyle(el.querySelector('.campaign-summary b')).fontSize),metric:parseFloat(getComputedStyle(el.querySelector('.campaign-metrics b')).fontSize),action:parseFloat(getComputedStyle(el.querySelector('.campaign-actions .btn')).fontSize)}}""")
            qa.check(campaign_layout['head']=='flex',f'{width}: campaigns desktop header uses styled flex layout')
            expected_kpi_cols=2 if 901<=width<=1180 else 4
            qa.check(campaign_layout['summary']=='grid' and campaign_layout['summaryCols']==expected_kpi_cols,f'{width}: campaigns desktop KPI summary uses responsive {expected_kpi_cols}-column grid')
            qa.check(campaign_layout['row']=='grid',f'{width}: campaigns desktop row uses styled grid layout')
            qa.check(campaign_layout['name']>=17 and campaign_layout['sub']>=11 and campaign_layout['kpi']>=18 and campaign_layout['metric']>=14 and campaign_layout['action']>=12,f'{width}: campaigns typography stays readable instead of shrinking to fit')
        qa.shot(page,f'{width}-{view}.png')
    qa.check(not runtime_errors,f'{width}: all 8 desktop views render without JavaScript errors' + (f' ({runtime_errors[0]})' if runtime_errors else ''))

def search_state(page:Page,qa:QA,width:int):
    page.locator('.nav button[data-view="bookings"]').click();page.locator('#globalSearch').fill('НЕІСНУЮЧИЙ-КЛІЄНТ-999');page.wait_for_timeout(50)
    qa.check(page.locator('#pageTitle').inner_text().strip()=='Пошук' and page.locator('.global-search-card').count()==4,f'{width}: global search hub renders all four result groups')
    qa.check(page.locator('.global-search-card .ops-empty').count()==4,f'{width}: global search empty state is explicit in every group')
    qa.check(pwa.no_overflow(page),f'{width}: global search empty state has no overflow')
    page.locator('#globalSearch').fill('Анна');page.wait_for_timeout(50)
    row=page.locator('.search-result-row').first
    if row.count():
        row.hover();page.wait_for_timeout(40)
        hover=row.evaluate("""el=>{const s=getComputedStyle(el);return{boxShadow:s.boxShadow,transform:s.transform,filter:s.filter,backgroundImage:s.backgroundImage}}""")
        qa.check(hover['boxShadow']=='none' and hover['transform']=='none' and hover['filter']=='none',f'{width}: global search hover stays calm without generic button halo or movement')
        qa.check('gradient' in hover['backgroundImage'].lower(),f'{width}: global search hover uses a subtle surface tint instead of an outline box')
        if width==1440: qa.shot(page,'1440-global-search-hover.png')
    else:
        qa.check(False,f'{width}: global search exposes a hoverable result row')
    page.locator('#clearSearch').click();page.wait_for_timeout(30)
    qa.check(page.locator('.booking-card').count()>=1,f'{width}: clearing global search restores the current admin view')

def detail_suite(page:Page,qa:QA,width:int):
    page.locator('.nav button[data-view="bookings"]').click();page.wait_for_timeout(30)
    target=pwa.BOOKINGS[0]['id'];page.locator(f'.booking-card[data-id="{target}"] .booking-row-head').click();page.wait_for_selector('.detail');page.wait_for_timeout(70)
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
    page.locator('#newBooking').click();page.wait_for_selector('#bookingForm');page.wait_for_timeout(50)
    date_state=page.locator('#bookingForm .date-control').first.evaluate("""el=>{const input=el.querySelector('input[type=date]'),display=el.querySelector('.date-display'),r=el.getBoundingClientRect(),ir=input.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{display:getComputedStyle(el).display,opacity:parseFloat(getComputedStyle(input).opacity),pointer:getComputedStyle(input).pointerEvents,hit:hit===input||input.contains(hit),sameBox:Math.abs(r.x-ir.x)<1&&Math.abs(r.y-ir.y)<1&&Math.abs(r.width-ir.width)<1&&Math.abs(r.height-ir.height)<1,displayText:display?.innerText?.trim()||'',interactiveDisplay:display?.tagName==='BUTTON'}}""")
    qa.check(date_state['display']=='block' and date_state['sameBox'],f'{width}: desktop date input fills exactly one visual date field')
    qa.check(date_state['opacity']<=0.01 and date_state['pointer']=='auto' and date_state['hit'],f'{width}: desktop date field click reaches only the native input')
    qa.check(date_state['displayText'] and not date_state['interactiveDisplay'],f'{width}: desktop date has one noninteractive display layer without duplicate native text')
    modal_check(page,qa,width,'new-booking','#bookingForm')
    # v4.2.22: customer address belongs to the client profile and stays editable for every booking.
    # Switching to pickup hides only delivery pricing; address + entrance/orientation helper remain available.
    delivery_id=pwa.BOOKINGS[1]['id']
    page.locator(f'.booking-card[data-id="{delivery_id}"] [data-action="edit"]').click();page.wait_for_selector('#bookingForm');page.wait_for_timeout(90)
    fulfillment=page.locator('#bookingForm .fulfillment-field')
    fulfillment_select=fulfillment.locator('select[name="fulfillment"]')
    address=page.locator('#bookingForm .delivery-address-field')
    pricing=page.locator('#bookingForm .delivery-pricing-field')
    if fulfillment_select.count() and address.count():
        qa.check(fulfillment_select.input_value()=='delivery' and address.is_visible() and pricing.is_visible(),f'{width}: delivery booking shows customer address and delivery pricing')
        fulfillment_select.select_option('pickup');page.wait_for_timeout(30)
        qa.check(address.is_visible(),f'{width}: pickup keeps customer address editable')
        address_input=address.locator('input[name="deliveryAddress"]')
        qa.check(address_input.count() and not address_input.is_disabled(),f'{width}: pickup keeps customer address enabled for the client profile')
        qa.check(not pricing.is_visible(),f'{width}: pickup hides only delivery pricing')
    page.locator('#bookingForm .close').click();page.wait_for_timeout(30)
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
        # v4.1.41: click the explicit client-name target, never row center.
        page.locator('.nav button[data-view="clients"]').click();page.wait_for_timeout(30)
        first=page.locator('.client-row').first
        if first.count() and first.locator('.client-name').count():
            page.locator('.client-row').first.locator('.client-name').click();page.wait_for_timeout(40)
            if page.locator('.client-card-form').count():
                qa.check(pwa.no_overflow(page),f'{width}: client modal opened from client name without widening app')
                close=page.locator('.client-card-form .close')
                if close.count():close.click();page.wait_for_timeout(20)
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
            run_size(browser,qa,1650,760);run_size(browser,qa,1440,1000);run_size(browser,qa,1280,900);run_size(browser,qa,1024,768)
        except Exception as exc:
            qa.failed.append(f'Unhandled final desktop QA error: {exc}');print('FAIL:',qa.failed[-1])
        finally:browser.close()
    result={'passed':qa.passed,'failed':qa.failed,'status':'passed' if not qa.failed else 'failed'};art.mkdir(parents=True,exist_ok=True);(art/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False));return 0 if not qa.failed else 1
if __name__=='__main__':raise SystemExit(main())
