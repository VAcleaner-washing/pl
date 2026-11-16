"""Fresh detail/peer-change and protected draft checks with intercepted APIs."""
import argparse
import json
import traceback
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--browser', choices=['chromium', 'webkit'], required=True)
    parser.add_argument('--width', type=int, default=440)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    out = Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    checks, errors, forbidden, external = [], [], [], []
    flags = {'fail': False, 'hold': False}
    pending, reads = [], []

    def check(name, passed, **evidence):
        checks.append({'name': name, 'passed': bool(passed), **evidence})
        assert passed, name
        print('PASS ' + name, flush=True)

    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        browser = getattr(pw, args.browser).launch(**options)
        device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'} if args.width <= 900 else {}
        device.update(viewport={'width': args.width, 'height': 956}, service_workers='block', timezone_id='Europe/Kyiv')
        context = browser.new_context(**device)
        context.add_init_script(smoke.session_script())
        if args.width <= 900:
            context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
        api = idle.fixtures(config, 21, 7, forbidden)

        def route_request(route):
            request, url = route.request, urlsplit(route.request.url)
            if request.url.startswith(base + '/'):
                return route.continue_()
            if url.scheme + '://' + url.netloc != smoke.SUPABASE_HOST:
                external.append({'host': url.hostname, 'path': url.path})
                return route.abort()
            if request.method == 'OPTIONS':
                return route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'})
            payload = request.post_data_json if request.post_data else {}
            if (payload or {}).get('action') == 'list':
                reads.append('list')
                if flags['hold']:
                    pending.append(route)
                    return
                if flags['fail']:
                    return route.fulfill(status=503, headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json', body='{"error":"service_error"}')
            if url.path.startswith('/auth/v1/'):
                return route.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json', body='{"id":"00000000-0000-4000-8000-000000000099"}')
            return api(route)

        context.route('**/*', route_request)
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        failure = None
        try:
            page.goto(base + '/admin/bronuvannia/')
            page.wait_for_selector('#view .booking-card,#view .upcoming-row')
            if args.width <= 900:
                page.evaluate("()=>{document.documentElement.style.setProperty('--pwa-safe-top','59px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')}")
            idle.navigate(page, 'bookings')
            booking = next(row for row in api.bookings if row['status'] == 'issued')
            card = page.locator(f'.booking-card[data-id="{booking["id"]}"]')
            card.locator('.lab-open-detail').click()
            expect(page.locator('.detail .hero-status')).to_have_attribute('data-status', 'issued')
            booking['total_amount'] = 1777
            page.evaluate("()=>window.dispatchEvent(new Event('focus'))")
            expect(page.locator('.detail')).to_contain_text('1 777')
            check('peer financial changes refresh the open read-only detail', len(reads) >= 2)
            page.screenshot(path=str(out / 'fresh-detail.png'))

            booking['status'] = 'completed'
            booking['deposit_returned'] = True
            page.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
            expect(page.locator('.detail .hero-status')).to_have_attribute('data-status', 'completed')
            check('peer completion replaces the issued presentation', True)

            flags['fail'] = True
            page.evaluate("()=>window.dispatchEvent(new Event('focus'))")
            notice = page.locator('[data-live-detail-notice]')
            expect(notice).to_be_visible()
            check('read failure announces stale data while keeping Back usable',
                  notice.get_attribute('role') == 'status' and page.locator('.detail .back').is_enabled())
            buttons = page.locator('.detail [data-action],.detail .lab-action-dock button')
            expect(page.locator('.detail [data-action]:enabled,.detail .lab-action-dock button:enabled')).to_have_count(0)
            check('stale business actions are blocked until a successful read', all(buttons.nth(i).is_disabled() for i in range(buttons.count())))
            dock = page.locator('.detail .lab-action-dock button')
            page.locator('.detail .lab-action-dock').evaluate('node=>node.remove()')
            expect(dock).to_have_count(1)
            expect(dock).to_be_disabled()
            check('a recreated delegated action inherits the stale protection', True)
            geometry = page.locator('.detail').evaluate('''detail=>{
              const r=s=>detail.querySelector(s)?.getBoundingClientRect().toJSON();
              return{head:r('.detail-top'),scroll:r('.detail-shell'),notice:r('[data-live-detail-notice]'),
                width:innerWidth,document:document.documentElement.scrollWidth};}''')
            check('stale notice fits its header without covering scroll content',
                  geometry['document'] <= args.width + 1 and geometry['notice']['right'] <= args.width + 1 and
                  (args.width > 900 or not geometry['scroll'] or geometry['scroll']['top'] >= geometry['head']['bottom'] - 1), geometry=geometry)
            page.screenshot(path=str(out / 'stale-read-notice.png'))
            flags['fail'] = False
            notice.locator('button').click()
            expect(notice).to_have_count(0)
            check('an explicit successful retry removes the stale notice', True)
            expect(dock).to_be_enabled()
            check('successful retry restores the delegated action availability', True)

            # Begin a real delayed fixture read, then navigate to a changed draft.
            flags['hold'] = True
            with page.expect_request(lambda request: request.post_data and (request.post_data_json or {}).get('action') == 'list'):
                page.evaluate("()=>window.dispatchEvent(new Event('focus'))")
            page.locator('.detail .back').click()
            page.locator('#mobileNewBooking:visible,#newBooking:visible').first.click()
            form = page.locator('#bookingForm')
            expect(form).to_be_visible()
            form.locator('[name=source]').select_option('telegram')
            check('the fixture captured the in-flight authoritative read', bool(pending))
            flags['hold'] = False
            for route in pending:
                api(route)
            pending.clear()
            page.wait_for_function("()=>document.querySelector('#bookingForm [name=source]')?.value==='telegram'")
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            check('a late read cannot replace the new form or its edited value',
                  form.is_visible() and form.locator('[name=source]').input_value() == 'telegram' and not page.locator('.detail').count())
            before = len(reads)
            page.evaluate("()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))}")
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            check('an open dirty form does not start a new live read', len(reads) == before)
            page.screenshot(path=str(out / 'protected-draft.png'))
            check('no business writes, external requests or runtime errors occurred', not forbidden and not external and not errors)
        except Exception as error:
            failure = {'message': str(error), 'traceback': traceback.format_exc()[-3500:]}
            page.screenshot(path=str(out / 'failure.png'))
        finally:
            for route in pending:
                route.abort()
            context.tracing.stop(path=str(out / 'trace.zip'))
            context.close()
            browser.close()
    result = {'browser': args.browser, 'width': args.width, 'checks': checks,
              'passed': sum(check['passed'] for check in checks),
              'failed': sum(not check['passed'] for check in checks) + int(bool(failure) and all(check['passed'] for check in checks)),
              'exception': failure, 'runtimeErrors': errors, 'forbiddenActions': forbidden,
              'externalRequests': external, 'productionWrites': 0, 'physicalIphoneTested': False}
    (out / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['browser', 'width', 'passed', 'failed', 'productionWrites']}))
    return int(bool(result['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
