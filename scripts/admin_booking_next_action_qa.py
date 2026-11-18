"""Read-only real-shell regression: bookings sort by next pickup/return, in both mobile card modes."""
import argparse
import json
from datetime import datetime,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',default='release-candidate-test-results/dist')
    parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--artifacts',default='booking-queue-qa-results')
    args=parser.parse_args()
    root=Path(args.root).resolve()
    artifact=Path(args.artifacts).resolve();artifact.mkdir(parents=True,exist_ok=True)
    config=json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
    today=datetime.now(ZoneInfo('Europe/Kyiv')).date()
    issue_day=today.isoformat();return_day=(today+timedelta(days=1)).isoformat()
    rows=[
        smoke.booking('00000000-0000-4000-8000-000000000871','VAC-SCREEN-ISSUED','issued',0,1),
        smoke.booking('00000000-0000-4000-8000-000000000872','VAC-SCREEN-CONFIRMED','confirmed',0,1),
    ]
    for row in rows:
        row.update(start_date=issue_day,return_date=return_day,
                   start_at=f'{issue_day}T08:30:00.000Z',
                   end_at=f'{return_day}T08:30:00.000Z')
        row['extras'].update(pickup_time='08:30',return_time='08:30')
    rows[1]['extras']['pickup_time']='18:00'
    results=[]
    with pages_server(root) as base,sync_playwright() as pw:
        browser=getattr(pw,args.browser).launch(headless=True,**({'args':['--no-sandbox']} if args.browser=='chromium' else {}))
        for width in (390,440):
            forbidden=[];errors=[]
            handler=idle.fixtures(config,2,2,forbidden)
            handler.bookings[:]=rows
            context=browser.new_context(viewport={'width':width,'height':860},service_workers='block',timezone_id='Europe/Kyiv',is_mobile=True,has_touch=True)
            context.add_init_script(smoke.session_script())
            smoke.install_routes(context,base,handler)
            page=context.new_page()
            # Keep today's 18:00 pickup in the future even when CI runs at night.
            page.clock.set_fixed_time(datetime.now(ZoneInfo('Europe/Kyiv')).replace(hour=12,minute=0,second=0,microsecond=0))
            page.on('pageerror',lambda e:errors.append(str(e)))
            try:
                page.goto(base+'/admin/bronuvannia/',wait_until='domcontentloaded')
                # The default upcoming view may legitimately have no visible rows
                # for these fixtures. Wait for navigation, then assert the bookings
                # list explicitly rather than requiring an unrelated view's cards.
                page.locator('.nav [data-view="bookings"],.mobile-nav [data-mobile-view="bookings"]').first.wait_for(state='attached')
                idle.navigate(page,'bookings')
                expect(page.locator('html')).to_have_attribute('data-admin-ui','operations')
                expect(page.locator('#view .booking-list .booking-card')).to_have_count(2,timeout=10000)
                expect(page.locator('#labListMode [data-compact=false]')).to_be_visible(timeout=5000)
                page.locator('#labListMode [data-compact=false]').click()
                ids=lambda:page.locator('.booking-list .booking-card').evaluate_all('nodes=>nodes.map(n=>n.dataset.id)')
                expected=[rows[1]['id'],rows[0]['id']]
                expect(page.locator('.booking-list .booking-card')).to_have_count(2)
                assert ids()==expected,f'{width}px default order: {ids()} expected {expected}'
                assert 'Видача сьогодні' in page.locator('.booking-card').first.inner_text()
                assert 'Повернення завтра' in page.locator('.booking-card').nth(1).inner_text()
                page.locator('#labListMode [data-compact=true]').click()
                assert 'lab-compact' in (page.locator('.booking-list').get_attribute('class') or '')
                assert ids()==expected,f'{width}px compact order: {ids()} expected {expected}'
                page.screenshot(path=str(artifact/f'{args.browser}-{width}-next-action.png'),full_page=True)
                assert not errors,errors
                assert not forbidden,forbidden
                results.append({'width':width,'passed':True,'ids':ids(),'writes':len(forbidden)})
                print('PASS '+args.browser+' '+str(width)+'px: issued return tomorrow below confirmed issue today, both card modes',flush=True)
            except Exception as error:
                diagnostic=page.evaluate('''() => ({view:document.documentElement.dataset.adminView,lab:document.documentElement.dataset.adminLab,ui:document.documentElement.dataset.adminUi,viewText:document.querySelector('#view')?.innerText?.slice(0,1800),listCount:document.querySelectorAll('#view .booking-list').length,cardCount:document.querySelectorAll('#view .booking-card').length,toggleCount:document.querySelectorAll('#labListMode').length,bodyClasses:document.body.className})''')
                print('DIAGNOSTIC '+args.browser+' '+str(width)+'px: '+json.dumps(diagnostic,ensure_ascii=False),flush=True)
                results.append({'width':width,'passed':False,'error':str(error),'diagnostic':diagnostic,'errors':errors,'writes':forbidden})
                page.screenshot(path=str(artifact/f'{args.browser}-{width}-failure.png'),full_page=True)
                print('FAIL '+args.browser+' '+str(width)+'px: '+str(error),flush=True)
            finally:
                context.close()
        browser.close()
    (artifact/'result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    return int(any(not r['passed'] for r in results))


if __name__=='__main__':
    raise SystemExit(main())
