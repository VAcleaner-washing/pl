"""Exercise route refresh timeout/reconciliation in the real UI; API fixtures only."""
import argparse
import json
import traceback
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect, Error as PlaywrightError
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--browser', choices=['chromium', 'webkit'], required=True)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    out = Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    checks, errors, forbidden, external, writes, held = [], [], [], [], [], []
    mode = {'address': 'hang'}

    def check(name, passed):
        checks.append({'name': name, 'passed': bool(passed)})
        assert passed, name
        print('PASS ' + name, flush=True)

    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        browser = getattr(pw, args.browser).launch(**options)
        device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'}
        device.update(viewport={'width': 440, 'height': 956}, service_workers='block', timezone_id='Europe/Kyiv')
        context = browser.new_context(**device)
        context.add_init_script(smoke.session_script() + "Object.defineProperty(navigator,'standalone',{value:true});")
        api = idle.fixtures(config, 21, 7, forbidden)
        completed = [row for row in api.bookings if row['status'] == 'completed']
        for row in completed:
            row.update(fulfillment='delivery', fulfillment_address='Полтава, Тестова, 1', delivery_amount=250)
            row.setdefault('extras', {})['delivery'] = {}
        headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}

        def handle(route):
            request, url = route.request, urlsplit(route.request.url)
            if request.url.startswith(base + '/'):
                return route.continue_()
            if url.scheme + '://' + url.netloc != smoke.SUPABASE_HOST:
                external.append({'host': url.hostname, 'path': url.path})
                return route.abort()
            if request.method == 'OPTIONS':
                return route.fulfill(status=204, headers=headers)
            payload = request.post_data_json if request.post_data else {}
            if url.path.endswith('/vacleaner-address-v1'):
                if mode['address'] == 'hang':
                    held.append(route)
                    return
                body = {'routeKm': 6.5, 'pricingDistanceKm': 0, 'distanceSource': 'road_city'} if (payload or {}).get('action') == 'quote' else {
                    'suggestions': [{'address': 'Полтава, Тестова, 1', 'houseNumber': '1', 'lat': 49.5, 'lon': 34.5, 'approximateCoordinates': False}]}
                return route.fulfill(status=200, headers=headers, content_type='application/json', body=json.dumps(body))
            if (payload or {}).get('action') == 'save_delivery_route':
                writes.append(payload)
                held.append(route)
                return
            if url.path.startswith('/auth/v1/'):
                return route.fulfill(status=200, headers=headers, content_type='application/json', body='{"id":"00000000-0000-4000-8000-000000000099"}')
            return api(route)

        context.route('**/*', handle)
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        failure = None
        try:
            page.goto(base + '/admin/bronuvannia/')
            page.wait_for_selector('#view .booking-card,#view .upcoming-row')
            idle.navigate(page, 'finances')
            buttons = page.locator('.delivery-route-backfill')
            expect(buttons.first).to_be_visible()
            page.clock.install()
            with page.expect_request(lambda request: '/vacleaner-address-v1' in request.url):
                buttons.first.click()
            expect(buttons.first).to_be_disabled()
            expect(buttons.first).to_contain_text('Оновлюємо')
            page.clock.run_for(16000)
            expect(buttons.first).to_be_enabled()
            expect(page.locator('[data-delivery-route-status]').first).to_contain_text('надто довго')
            check('a stalled route provider has a bounded visible recovery and no save request', len(writes) == 0)
            page.screenshot(path=str(out / 'provider-timeout.png'))

            mode['address'] = 'ready'
            with page.expect_request(lambda request: request.post_data and (request.post_data_json or {}).get('action') == 'save_delivery_route'):
                buttons.first.click()
            page.clock.run_for(16000)
            expect(buttons.first).to_be_enabled()
            expect(buttons.first).to_have_text('Перевірити збереження')
            check('a lost save acknowledgement restores the button in read-only review mode', len(writes) == 1)
            page.screenshot(path=str(out / 'save-awaiting-review.png'))

            saved = writes[0]
            booking = next(row for row in api.bookings if row['id'] == saved['bookingId'])
            original = {key: booking.get(key) for key in ['status', 'total_amount', 'delivery_amount', 'deposit_amount']}
            booking['extras']['delivery'] = {'route_km': saved['routeKm'], 'pricing_distance_km': saved['pricingDistanceKm'], 'distance_source': saved['distanceSource']}
            buttons.first.click()
            expect(page.locator('[data-delivery-route-status]').first).to_contain_text('підтверджено')
            check('explicit reconciliation reads the canonical result without repeating the save', len(writes) == 1)
            check('route recovery leaves all financial/status fields intact', original == {key: booking.get(key) for key in original})
            page.screenshot(path=str(out / 'save-confirmed-by-read.png'))
            check('all traffic stayed synthetic with no runtime errors or unrecognized actions', not errors and not forbidden and not external)
        except Exception as error:
            failure = {'message': str(error), 'traceback': traceback.format_exc()[-3500:]}
            page.screenshot(path=str(out / 'failure.png'))
        finally:
            for route in held:
                try:
                    route.abort()
                except PlaywrightError as error:
                    if 'already handled' not in str(error) and 'Target page, context or browser has been closed' not in str(error):
                        raise
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(resolve))')
            context.tracing.stop(path=str(out / 'trace.zip'))
            context.close()
            browser.close()
    result = {'browser': args.browser, 'checks': checks, 'passed': sum(row['passed'] for row in checks),
              'failed': sum(not row['passed'] for row in checks) + int(bool(failure)), 'exception': failure,
              'fixtureSaves': len(writes), 'productionWrites': 0, 'runtimeErrors': errors,
              'forbiddenActions': forbidden, 'externalRequests': external, 'physicalIphoneTested': False}
    (out / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['browser', 'passed', 'failed', 'productionWrites']}))
    return int(bool(result['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
