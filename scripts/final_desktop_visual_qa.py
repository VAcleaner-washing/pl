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

VIEWS=['bookings','calendar','upcoming','equipment','clients','campaigns','finances','analytics','chemistry','settings']

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
            if 761<=width<=1100:
                client_layout=page.locator('.client-row').first.evaluate("""el=>{const arrow=el.querySelector('.client-open-indicator'),stats=el.querySelector('.client-mobile-stats'),last=el.querySelector('.client-last-date'),r=el.getBoundingClientRect();return{height:r.height,arrowBefore:getComputedStyle(arrow,'::before').content,statsDisplay:getComputedStyle(stats).display,lastSize:parseFloat(getComputedStyle(last).fontSize)}}""")
                qa.check(client_layout['height']<160,f'{width}: intermediate client rows stay compact instead of stretching into pseudo-label cards')
                qa.check(client_layout['arrowBefore'] in ('none','normal','""'),f'{width}: client chevron has no injected “Остання оренда” pseudo-label')
                qa.check(client_layout['statsDisplay']!='none' and client_layout['lastSize']<=12,f'{width}: intermediate client stats use explicit compact metadata')
        if view=='finances':
            qa.check(page.locator('.finance-kpis').count()==1 and page.locator('.finance-dashboard').count()==1,f'{width}: finances render KPI and decision sections')
            qa.check(page.locator('.finance-ledger').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),f'{width}: finance ledger stays inside the main column')
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
    qa.check(page.locator('.empty-action').count()==1,f'{width}: search empty state renders once')
    qa.check(pwa.no_overflow(page),f'{width}: search empty state has no overflow')
    btn=page.locator('.empty-action .btn').bounding_box();qa.check(btn is not None and btn['height']>=44,f'{width}: empty-state action remains 44px+')
    page.locator('#clearSearch').click();page.wait_for_timeout(30)

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
    # Production parity: address helper is loaded and mutates the edit form after render.
    # Verify that this async wrapper cannot stretch the sibling fulfillment field.
    delivery_id=pwa.BOOKINGS[1]['id']
    page.locator(f'.booking-card[data-id="{delivery_id}"] [data-action="edit"]').click();page.wait_for_selector('#bookingForm');page.wait_for_timeout(90)
    step4=page.locator('#bookingForm [data-mobile-step="4"]')
    fulfillment=step4.locator('.fulfillment-field')
    fulfillment_select=fulfillment.locator('select[name="fulfillment"]')
    address=step4.locator('.delivery-address-field')
    gap=fulfillment.evaluate("""el=>{const label=el.querySelector(':scope>span'),select=el.querySelector('select'),lr=label.getBoundingClientRect(),sr=select.getBoundingClientRect();return sr.top-lr.bottom}""")
    field_metrics=fulfillment.evaluate("""el=>{const r=el.getBoundingClientRect(),s=el.querySelector('select').getBoundingClientRect();return{height:r.height,selectBottom:s.bottom,fieldBottom:r.bottom}}""")
    qa.check(gap>=4 and gap<=14,f'{width}: booking fulfillment label/select keep one compact 8px rhythm after address helper attaches')
    qa.check(field_metrics['fieldBottom']-field_metrics['selectBottom']<4,f'{width}: booking fulfillment field no longer stretches to address-helper height')
    qa.check(fulfillment_select.input_value()=='delivery' and address.is_visible(),f'{width}: delivery booking shows delivery address controls')
    qa.check(address.locator('.vac-address-status').count()==1 and address.locator('.vac-address-details').count()==1,f'{width}: address helper remains present without breaking booking layout')
    fulfillment_select.select_option('pickup');page.wait_for_timeout(30)
    qa.check(not address.is_visible(),f'{width}: pickup hides address, entrance and address-helper UI completely')
    qa.check(address.locator('input[name="deliveryAddress"]').is_disabled(),f'{width}: pickup disables hidden delivery address so it is not submitted accidentally')
    pickup_gap=fulfillment.evaluate("""el=>{const label=el.querySelector(':scope>span'),select=el.querySelector('select'),lr=label.getBoundingClientRect(),sr=select.getBoundingClientRect();return sr.top-lr.bottom}""")
    qa.check(pickup_gap>=4 and pickup_gap<=14,f'{width}: pickup fulfillment stays compact with no empty address-column height')
    fulfillment_select.select_option('delivery');page.wait_for_timeout(30)
    qa.check(address.is_visible() and not address.locator('input[name="deliveryAddress"]').is_disabled(),f'{width}: switching back to delivery restores address controls without losing the helper')
    address.locator('input[name="deliveryAddress"]').fill('Богдана');page.wait_for_timeout(520)
    manual=address.locator('.vac-address-status').evaluate("el=>({text:el.textContent.trim(),hasLink:!!el.querySelector('a'),cls:el.className})")
    qa.check('введіть' in manual['text'].lower() and 'вручн' in manual['text'].lower() and not manual['hasLink'] and 'manual' in manual['cls'],f'{width}: unavailable/no-result address assist falls back quietly without yellow OSM warning clutter')
    qa.shot(page,f'{width}-modal-booking-edit-address.png')
    page.locator('#bookingForm .close').click();page.wait_for_timeout(30)
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[0]["id"]}"] [data-action="process"]').click();modal_check(page,qa,width,'process','#processForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[2]["id"]}"] [data-action="issue"]').click();modal_check(page,qa,width,'issue','#issueForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[3]["id"]}"] [data-action="complete"]').click();modal_check(page,qa,width,'complete','#financeForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[3]["id"]}"] [data-action="finance"]').click();modal_check(page,qa,width,'finance','#financeForm')
    page.locator('.nav button[data-view="equipment"]').click();page.wait_for_timeout(30);page.locator('#editPrices').click();modal_check(page,qa,width,'catalog','#catalogForm')
    page.locator('.nav button[data-view="clients"]').click();page.wait_for_selector('[data-client-open]',timeout=5000);page.locator('[data-client-open]').first.locator('.client-name').click();modal_check(page,qa,width,'client','#clientEditor')
    page.locator('.nav button[data-view="finances"]').click();page.wait_for_timeout(40);page.locator('#addExpense').click();modal_check(page,qa,width,'expense','#expenseForm')
    page.locator('.nav button[data-view="bookings"]').click();page.wait_for_timeout(40)
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[1]["id"]}"] [data-action="status"]').click();modal_check(page,qa,width,'status-correction','#statusCorrectForm')
    page.locator(f'.booking-card[data-id="{pwa.BOOKINGS[3]["id"]}"] [data-action="extend"]').click();modal_check(page,qa,width,'extend-rental','#extendRentalForm')
    page.locator('.nav button[data-view="campaigns"]').click();page.wait_for_timeout(40);page.locator('#smsCampaign').click();page.wait_for_selector('.sms-workspace-footer',timeout=5000);modal_check(page,qa,width,'sms-campaign','.sms-campaign-modal')

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
            run_size(browser,qa,1650,760);run_size(browser,qa,1440,1000);run_size(browser,qa,1280,900);run_size(browser,qa,1024,768)
        except Exception as exc:
            qa.failed.append(f'Unhandled final desktop QA error: {exc}');print('FAIL:',qa.failed[-1])
        finally:browser.close()
    result={'passed':qa.passed,'failed':qa.failed,'status':'passed' if not qa.failed else 'failed'};art.mkdir(parents=True,exist_ok=True);(art/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False));return 0 if not qa.failed else 1
if __name__=='__main__':raise SystemExit(main())
