"""Profile the shipped admin shell and all views with synthetic, read-only data."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import pages_server


PROBE = r'''
window.__idle={frames:0,frameMs:0,mutations:0,targets:{}};
const originalFrame=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=function(callback){return originalFrame(time=>{
  const start=performance.now();try{return callback(time)}finally{
    window.__idle.frames++;window.__idle.frameMs+=performance.now()-start;
  }
})};
new MutationObserver(records=>{for(const r of records){
  window.__idle.mutations++;
  const el=r.target.nodeType===1?r.target:r.target.parentElement;
  const key=el?.id||el?.className||el?.tagName||'unknown';
  if(typeof key==='string')window.__idle.targets[key]=(window.__idle.targets[key]||0)+1;
}}).observe(document,{subtree:true,childList:true});
'''


def fixtures(config, count, customers, forbidden):
    rows = []
    calls = []
    for i in range(count):
        status = ['completed', 'completed', 'completed', 'confirmed', 'issued', 'waiting_payment', 'pending'][i % 7]
        start = -(i % 365) if status == 'completed' else i % 14
        row = smoke.booking(f'00000000-0000-4000-8000-{i+1:012}', f'VAC-SCALE-{i+1:04}', status, start, start + 1)
        row.update(customer_name=f'Тестовий клієнт {i % customers + 1}', customer_phone=f'+38095{i % customers + 1:07}')
        rows.append(row)
    profiles = [{'phone': f'+38095{i+1:07}', 'name': f'Тестовий клієнт {i+1}', 'address': 'Полтава, тестова вулиця, 1'} for i in range(customers)]
    fallback = smoke.make_api_handler(config)

    def handle(route):
        request = route.request
        data = request.post_data_json if request.post_data else {}
        action = (data or {}).get('action')
        calls.append(action or 'settings')
        headers = {'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store'}
        if '/vacleaner-settings' in request.url and request.method == 'GET':
            fallback(route)
            return
        if '/vacleaner-customer-documents-v1' in request.url and parse_qs(urlsplit(request.url).query).get('action') == ['view']:
            body = {'document': None}
        else:
            expenses = [{'id': f'qa-expense-{i}', 'spent_on': smoke.iso(-i), 'category': 'fuel', 'cost_type': 'operating', 'amount': 100+i,
                         'vendor': 'QA', 'note': 'Тестова витрата', 'archived': False} for i in range(9)]
            campaigns = [{'id': f'qa-campaign-{i}', 'name': f'Тестова кампанія {i}', 'code': f'QA-{i}',
                          'status': 'active', 'campaign_type': 'return', 'discount_type': 'percent', 'discount_value': 10,
                          'dormant_days': 180, 'activation_days': 21} for i in range(3)]
            reads = {'list': {'bookings': rows, 'expenses': expenses}, 'calendar': {'days': smoke.calendar_days()},
                     'clients': {'customers': profiles}, 'campaigns': {'campaigns': campaigns},
                     'referrals_expiring': {'rewards': []}, 'audit_log': {'entries': []},
                     'lookup_customer': {'customer': None}, 'referral_summary': {'referral': None},
                     'customer_sms_history': {'consent': 'explicit', 'history': []},
                     'referral_analytics': {'messages': [], 'uses': [], 'rewards': [], 'customers': [], 'bookings': []},
                     'health': {'reservation': {'healthy': True}, 'push': {'healthy': True, 'activeSubscriptions': 1}},
                     'pending_bonus': {'bonus': None}}
            if action not in reads:
                forbidden.append({'url': request.url, 'action': action})
                route.fulfill(status=409, content_type='application/json', body='{"error":"qa_write_forbidden"}', headers=headers)
                return
            body = reads[action]
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body), headers=headers)
    handle.bookings = rows
    handle.calls = calls
    return handle


def navigate(page, view):
    nav = page.locator(f'.nav [data-view="{view}"]')
    if not nav.is_visible():
        nav = page.locator(f'.mobile-nav [data-mobile-view="{view}"]')
        if not nav.is_visible():
            page.locator('.mobile-nav .more-nav').click()
            nav = page.locator(f'.mobile-more-menu [data-more-view="{view}"]')
    nav.click()
    page.wait_for_function('(v)=>document.documentElement.dataset.adminView===v', arg=view)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/idle')
    parser.add_argument('--baseline', action='store_true')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--widths', default='390,1440')
    parser.add_argument('--views', default='upcoming,bookings,calendar,equipment,clients,campaigns,finances,analytics,chemistry,settings')
    parser.add_argument('--bookings', type=int, default=414)
    parser.add_argument('--customers', type=int, default=322)
    parser.add_argument('--standalone', action='store_true')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    samples = []
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        if exe := os.environ.get(f'PLAYWRIGHT_{args.browser.upper()}_EXECUTABLE'):
            options['executable_path'] = exe
        browser = getattr(pw, args.browser).launch(**options)
        for width in map(int, args.widths.split(',')):
            context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block')
            context.add_init_script(smoke.session_script() + PROBE + ("Object.defineProperty(navigator,'standalone',{value:true});" if args.standalone else ''))
            forbidden, errors = [], []
            api = fixtures(config, args.bookings, args.customers, forbidden)
            smoke.install_routes(context, base, api)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base + '/admin/bronuvannia/', wait_until='domcontentloaded')
            page.wait_for_selector('#view .booking-card,#view .upcoming-row')
            samples.append({'width': width, 'view': 'startup', 'document_ready_ms': round(page.evaluate('performance.now()'))})
            for view in args.views.split(','):
                started = page.evaluate('performance.now()')
                navigate(page, view)
                navigation = page.evaluate('performance.now()') - started
                page.wait_for_timeout(600)
                page.evaluate('window.__idle={frames:0,frameMs:0,mutations:0,targets:{}}')
                page.wait_for_timeout(1000)
                sample = page.evaluate('window.__idle')
                sample.update(width=width, view=view, navigation_ms=round(navigation))
                samples.append(sample)
                print(json.dumps(sample), flush=True)
                if not args.baseline:
                    checks.check(sample['mutations'] <= 4, f'{width}/{view}: DOM settles while idle')
                    checks.check(sample['frames'] <= 6, f'{width}/{view}: no perpetual enhancement frame loop')
                checks.check(not forbidden, f'{width}/{view}: no business mutations {forbidden}')
                checks.check(not errors, f'{width}/{view}: no runtime errors {errors}')
                checks.check(smoke.no_horizontal_overflow(page), f'{width}/{view}: no overflow')
            navigate(page, 'bookings')
            # A real API refresh must still update display text and the alert count.
            api.bookings[6].update(customer_phone='+380952222222', updated_at=smoke.iso()+'T15:00:00Z')
            api.bookings[1].update(status='pending', updated_at=smoke.iso()+'T15:00:00Z')
            page.evaluate("window.dispatchEvent(new Event('focus'))")
            card = page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000007"]')
            try:
                page.wait_for_function("() => document.querySelector('.booking-card[data-id=\"00000000-0000-4000-8000-000000000007\"] a[href=\"tel:+380952222222\"]')", timeout=5000)
            except Exception:
                print('REFRESH DIAGNOSTICS', api.calls, page.evaluate("({visibility:document.visibilityState,layer:document.querySelector('#layer')?.innerHTML.slice(0,200),phones:[...document.querySelectorAll('.booking-card a')].slice(0,4).map(a=>a.getAttribute('href'))})"), flush=True)
                checks.capture_failure(page, f'{width}-refresh')
                raise
            if width <= 900:
                page.wait_for_function("() => [...document.querySelectorAll('.booking-card a')].some(el=>el.textContent==='+380 95 222 22 22')")
                expected = sum(row['status'] == 'pending' for row in api.bookings)
                page.wait_for_function('(n)=>document.querySelector(".native-alert-button b")?.textContent===String(n)', arg=expected)
            checks.check(True, f'{width}: later authoritative refresh still formats new phones and alert counts')
            for modal in ['detail', 'finance', 'client', 'booking']:
                if modal == 'detail':
                    page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000005"] .booking-row-head').click()
                    page.locator('.detail').wait_for(state='visible')
                elif modal == 'finance':
                    page.locator('.detail [data-action="finance"]:visible').click()
                    page.locator('#financeForm').wait_for(state='visible')
                elif modal == 'client':
                    page.locator('[data-native-detail-client]:visible,.detail [data-client-card]:visible').first.locator('strong,h2').first.click()
                    page.locator('#clientEditor').wait_for(state='visible')
                else:
                    page.locator('#clientCreateBooking').click()
                    page.locator('#bookingForm').wait_for(state='visible')
                page.wait_for_timeout(600)
                page.evaluate('window.__idle={frames:0,frameMs:0,mutations:0,targets:{}}')
                page.wait_for_timeout(1000)
                sample = page.evaluate('window.__idle')
                sample.update(width=width, view=modal)
                samples.append(sample)
                print(json.dumps(sample), flush=True)
                if not args.baseline:
                    checks.check(sample['mutations'] <= 4 and sample['frames'] <= 6, f'{width}/{modal}: no idle enhancement loop')
                checks.check(not forbidden and not errors, f'{width}/{modal}: no writes or runtime errors')
                if modal == 'finance':
                    page.locator('#financeForm').get_by_role('button', name='Закрити', exact=True).click()
            checks.screenshot(page, f'{args.browser}-{width}-booking.png')
            context.close()
        browser.close()
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    result = {'browser': args.browser, 'bookings': args.bookings, 'customers': args.customers,
              'samples': samples, 'passed': checks.passed, 'failed': checks.failed}
    (checks.artifacts / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'passed': checks.passed, 'failed': checks.failed}))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
