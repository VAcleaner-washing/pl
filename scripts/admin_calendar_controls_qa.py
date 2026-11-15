"""Read-only calendar containment and named time controls on a built artifact.

All nonlocal traffic is intercepted. No production data or provider is used.
Viewport/device flags are emulation, not physical iPhone certification.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',default='dist')
    parser.add_argument('--artifacts',default='pwa-test-results/calendar-controls')
    parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--widths',default='320,440,956,1024,1280,1440,1648')
    parser.add_argument('--baseline',action='store_true',help='Require the immutable61 956px containment counterexample')
    args=parser.parse_args()
    root=Path(args.root).resolve();out=Path(args.artifacts).resolve();out.mkdir(parents=True,exist_ok=True)
    config=json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
    results=[]
    with pages_server(root) as base,sync_playwright() as pw:
        browser=getattr(pw,args.browser).launch(**({'headless':True,'args':['--no-sandbox']} if args.browser=='chromium' else {'headless':True}))
        for width in map(int,args.widths.split(',')):
            forbidden=[];outside=[];errors=[]
            context=browser.new_context(viewport={'width':width,'height':956 if width<=440 else 440 if width==956 else 700},service_workers='block',timezone_id='Europe/Kyiv')
            context.add_init_script(smoke.session_script())
            api=idle.fixtures(config,28,8,forbidden)
            def handle(route):
                request=route.request;url=urlsplit(request.url)
                if request.url.startswith(base+'/'):return route.continue_()
                if url.scheme+'://'+url.netloc!=smoke.SUPABASE_HOST:
                    outside.append({'host':url.hostname,'path':url.path});return route.abort()
                if request.method=='OPTIONS':return route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'})
                if url.path.startswith('/auth/v1/'):
                    return route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{"id":"00000000-0000-4000-8000-000000000099"}')
                return api(route)
            context.route('**/*',handle)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.set_default_timeout(10000)
            record={'width':width,'passed':False}
            try:
                page.goto(base+'/admin/bronuvannia/');page.wait_for_selector('#view .booking-card,#view .upcoming-row')
                idle.navigate(page,'calendar')
                geometry=page.locator('.day-card').evaluate_all('''cards=>cards.map(card=>{
                  const c=card.getBoundingClientRect();return{width:c.width,client:card.clientWidth,scroll:card.scrollWidth,
                    slots:[...card.querySelectorAll('.slot')].map(slot=>{const r=slot.getBoundingClientRect();return{
                      rightOverflow:r.right-c.right,leftOverflow:c.left-r.left,width:r.width,height:r.height,
                      scroll:slot.scrollWidth,client:slot.clientWidth}})};})''')
                assert len(geometry)==14 and all(len(card['slots'])==8 for card in geometry),'All14days/four equipment rows must remain present'
                overflow=max([max(slot['rightOverflow'],slot['leftOverflow']) for card in geometry for slot in card['slots']]+[0])
                contained=overflow<=1 and all(card['scroll']<=card['client']+1 for card in geometry)
                if args.baseline:
                    assert width==956 and not contained and overflow>=11,'Immutable61 must reproduce real calendar overflow'
                else:
                    assert contained,f'{width}: slot/card overflow {overflow}px'
                    assert all(slot['height']>=44 for card in geometry for slot in card['slots']),f'{width}: slots need44px targets'
                page.screenshot(path=str(out/f'{width}-calendar.png'))
                record={'width':width,'passed':True,'calendarContained':contained,'maxSlotOverflowPx':overflow,'days':len(geometry),'geometry':geometry}
                if not args.baseline:
                    idle.navigate(page,'campaigns')
                    buttons=page.locator('.campaign-head-actions .btn,.campaign-actions .btn,.campaign-more>summary').evaluate_all('''els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height}).map(el=>({name:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))''')
                    assert buttons and all(b['width']>=44 and b['height']>=44 for b in buttons),f'{width}: campaign touch targets {buttons}'
                    page.locator('.campaign-more').first.evaluate('el=>el.open=true')
                    menu=page.locator('.campaign-more[open] .campaign-more-menu button').evaluate_all('els=>els.map(el=>({name:el.textContent.trim(),height:el.getBoundingClientRect().height}))')
                    assert menu and all(b['height']>=44 for b in menu),f'{width}: campaign menu touch targets'
                    page.locator('.campaign-more').first.evaluate('el=>el.open=false')
                    page.screenshot(path=str(out/f'{width}-campaigns.png'))
                    idle.navigate(page,'bookings')
                    pending=next(row for row in api.bookings if row['status']=='pending')
                    card=page.locator(f'.booking-card[data-id="{pending["id"]}"]')
                    detail=card.locator('.lab-open-detail,[data-action="detail"]')
                    if detail.count():detail.first.click()
                    else:card.locator('.booking-row-head h2').click()
                    pill=page.locator('.detail .hero-status')
                    expect(pill).to_have_attribute('data-status','pending')
                    color=pill.evaluate('el=>getComputedStyle(el).color')
                    assert color=='rgb(121, 181, 255)',f'{width}: pending detail must use the same informational blue, got {color}'
                    page.screenshot(path=str(out/f'{width}-pending-status.png'))
                    record.update(pendingStatusColor=color)
                    page.locator('.detail .back').click()
                    page.locator('#mobileNewBooking:visible,#newBooking:visible').first.click()
                    form=page.locator('#bookingForm');expect(form).to_be_visible()
                    pickup=form.locator('[name=pickupTime]').locator('..').locator('.admin-v4315-time-trigger')
                    returned=form.locator('[name=returnTime]').locator('..').locator('.admin-v4315-time-trigger')
                    assert pickup.get_attribute('aria-label').startswith('Час видачі, ')
                    assert returned.get_attribute('aria-label').startswith('Час повернення, ')
                    pickup.click()
                    evening=page.locator('.admin-v4315-time-overlay [data-time-period=evening]')
                    if page.locator('html').get_attribute('data-admin-ui')=='operations':expect(evening).to_be_visible()
                    if evening.count():evening.click()
                    page.locator('.admin-v4315-time-overlay [data-time="21:00"]').click()
                    assert pickup.get_attribute('aria-label')=='Час видачі, 21:00'
                    record.update(campaignButtons=buttons,campaignMenuButtons=menu,pickupName=pickup.get_attribute('aria-label'),returnName=returned.get_attribute('aria-label'))
                assert not errors and not outside and not forbidden,(errors,outside,forbidden)
                record.update(runtimeErrors=errors,outsideRequests=outside,forbiddenSyntheticActions=forbidden)
            except Exception as error:
                record.update(passed=False,error=str(error),runtimeErrors=errors,outsideRequests=outside,forbiddenSyntheticActions=forbidden)
                try:
                    page.screenshot(path=str(out/f'{width}-failure.png'))
                    (out/f'{width}-failure.html').write_text(page.content())
                except Exception as capture_error:record['failureCaptureError']=str(capture_error)
            finally:
                results.append(record);context.close()
        browser.close()
    receipt={'baselineCounterexample':args.baseline,'browser':args.browser,'root':str(root),'cases':results,'passed':sum(row['passed'] for row in results),'failed':sum(not row['passed'] for row in results),'productionWrites':0,'physicalIphoneTested':False}
    (out/'result.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'passed':sum(row['passed'] for row in results),'failed':sum(not row['passed'] for row in results),'artifacts':str(out)}))
    return int(bool(receipt['failed']))


if __name__=='__main__':raise SystemExit(main())
