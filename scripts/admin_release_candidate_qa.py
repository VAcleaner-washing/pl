"""Normal-path candidate acceptance, with every remote request intercepted.

This is a remote-CI fixture test. It does not connect to production or stage,
install a physical PWA, send a message, or prove native iPhone behavior.
"""
import argparse
import datetime
import json
import os
import traceback
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
from admin_entrypoint_finance_qa import pages_server
from admin_idle_qa import navigate

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION_ORIGIN = 'https://yweluzclearwrazdkahu.supabase.co'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', choices=['chromium', 'webkit'], required=True)
    parser.add_argument('--width', type=int, choices=[440, 1440], required=True)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        parser.error('Run in the existing remote CI browser environment only')
    out = Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    fixture = json.loads((ROOT / 'staging/fixtures/mobile-layout.json').read_text())
    candidate = ROOT / 'release-candidate-test-results/dist'
    assert fixture['mode'] == 'synthetic-stage-layout-fixture'
    assert json.loads((candidate / 'release.json').read_text())['build'] == json.loads((ROOT / 'release.json').read_text())['build']
    first_day = datetime.datetime.fromisoformat(fixture['fixedTime']).date()
    calendar = [{'date': (first_day + datetime.timedelta(days=i)).isoformat(),
                 'resources': {key: {'label': key, 'capacity': 2, 'morning': 2, 'evening': 2}
                               for key in ['abir', 'jimmy', 'puzzi', 'sc2']}}
                for i in range(14)]
    results, calls, unexpected, errors = [], [], [], []

    def check(name, passed, **evidence):
        results.append({'name': name, 'passed': bool(passed), **evidence})
        print(('PASS: ' if passed else 'FAIL: ') + name, flush=True)

    def route_api(route):
        req = route.request
        url = urlsplit(req.url)
        if url.hostname in ['127.0.0.1', 'localhost']:
            return route.continue_()
        if url.scheme + '://' + url.netloc != PRODUCTION_ORIGIN:
            unexpected.append({'host': url.hostname, 'path': url.path, 'method': req.method})
            return route.abort()
        headers = {'Access-Control-Allow-Origin': '*',
                   'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
                   'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Cache-Control': 'no-store'}
        if req.method == 'OPTIONS':
            return route.fulfill(status=204, headers=headers)
        payload = req.post_data_json if req.method == 'POST' else {}
        payload = payload or {}
        action = payload.get('action')
        calls.append({'path': url.path, 'method': req.method, 'action': action})
        status = 200
        if url.path == '/auth/v1/token':
            assert payload.get('email') == 'vahome.aroma@gmail.com'
            body = {'access_token': 'candidate-synthetic-token', 'refresh_token': 'candidate-synthetic-refresh',
                    'expires_in': 3600, 'token_type': 'bearer',
                    'user': {'id': '00000000-0000-4000-8000-000000000061', 'email': 'fixture-only@invalid.example'}}
        elif url.path == '/auth/v1/settings':
            body = {'disable_signup': True}
        elif url.path == '/auth/v1/user':
            body = {'id': '00000000-0000-4000-8000-000000000061', 'email': 'fixture-only@invalid.example'}
        elif url.path.endswith('/vacleaner-settings'):
            body = fixture['settings'] if req.method == 'GET' else {'error': 'service_error'}
            if req.method != 'GET':
                status = 503
        elif action == 'list':
            body = {'bookings': fixture['bookings'], 'expenses': []}
        elif action == 'clients':
            body = {'customers': []}
        elif action == 'campaigns':
            body = {'campaigns': []}
        elif action == 'calendar':
            body = {'days': calendar}
        elif action == 'referrals_expiring':
            body = {'rewards': []}
        elif action == 'referral_analytics':
            body = {'messages': [], 'uses': [], 'rewards': [], 'customers': [], 'bookings': []}
        elif action == 'lookup_customer':
            body = {'customer': None}
        elif action == 'audit_log':
            body = {'entries': []}
        elif action == 'health':
            body = {'reservation': {'healthy': True}, 'push': {'healthy': False, 'activeSubscriptions': 0}}
        elif url.path.endswith(('/vacleaner-push', '/vacleaner-sms-v2', '/vacleaner-address-v1', '/vacleaner-reminders-v1')):
            body, status = {'error': 'fixture_integration_unavailable', 'delivered': False}, 503
        else:
            unexpected.append({'path': url.path, 'method': req.method, 'action': action})
            return route.abort()
        return route.fulfill(status=status, headers=headers, content_type='application/json', body=json.dumps(body))

    def capture(page, name):
        # Capture the completed visual state without disabling animations or
        # changing the original behavioral assertions. Infinite spinners remain.
        page.evaluate('''async()=>{
          await Promise.all(document.getAnimations().filter(a=>
            Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));
        }''')
        page.screenshot(path=str(out / (name + '.png')))

    def surface(page, name, selector='#view'):
        node = page.locator(selector)
        expect(node).to_be_visible()
        box = node.evaluate('''el=>({width:innerWidth,root:document.documentElement.scrollWidth,
          scroll:el.scrollWidth,client:el.clientWidth})''')
        check(name + ' remains within the real content width', box['root'] <= args.width + 1 and box['scroll'] <= box['client'] + 1, geometry=box)

    with pages_server(candidate) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        browser = getattr(pw, args.browser).launch(**options)
        device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'} if args.width == 440 else {}
        device.update(viewport={'width': args.width, 'height': 956}, timezone_id='Europe/Kyiv', service_workers='block')
        context = browser.new_context(**device)
        context.route('**/*', route_api)
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        if args.width == 440:
            context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.clock.set_fixed_time(datetime.datetime.fromisoformat(fixture['fixedTime']))
        try:
            page.goto(base + '/admin/bronuvannia/')
            expect(page.locator('#authForm')).to_be_visible()
            expect(page.locator('.lab-banner,.lab-tools')).to_have_count(0)
            expect(page.locator('#authForm [name=login]')).to_have_value('vacleaner')
            page.locator('#authForm [name=password]').fill('candidate-synthetic-fixture-password')
            page.locator('#authForm [type=submit]').click()
            expect(page.locator('.booking-card,.upcoming-row').first).to_be_visible()
            expect(page.locator('html')).to_have_attribute('data-admin-ui', 'operations')
            check('normal login uses canonical aliases and no test banner or transport', True)
            if args.width == 440:
                page.evaluate("()=>{document.documentElement.style.setProperty('--pwa-safe-top','59px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')}")
                rect = page.locator('.main').bounding_box()
                check('normal mobile main begins at its safe area without a reserved test-header gap', 58 <= rect['y'] <= 60, geometry=rect)
                nav = page.locator('.mobile-nav').bounding_box()
                targets = page.locator('.mobile-nav>button').evaluate_all('els=>els.map(el=>el.getBoundingClientRect().toJSON())')
                check('five navigation targets remain reachable above the viewport edge', len(targets) == 5 and all(t['height'] >= 44 and t['width'] >= 44 and t['bottom'] <= 957 for t in targets) and abs(nav['y'] + nav['height'] - 956) <= 1, targets=targets)
            for name in ['upcoming', 'bookings', 'calendar', 'equipment', 'clients', 'campaigns', 'finances', 'analytics', 'chemistry', 'settings']:
                navigate(page, name)
                surface(page, name)
            navigate(page, 'bookings')
            expect(page.locator('#labListMode')).to_be_visible()
            expect(page.locator('.booking-list')).to_have_class('booking-list lab-compact')
            page.locator('#labListMode [data-compact=false]').click()
            expect(page.locator('.booking-list')).not_to_have_class('booking-list lab-compact')
            page.locator('#labListMode [data-compact=true]').click()
            first = page.locator('.booking-card').first
            first.locator('.lab-open-detail').click()
            expect(page.locator('.detail')).to_be_visible()
            if args.width == 440:
                boxes = page.evaluate('''()=>{
                  const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
                  return {detail:rect('.detail'),head:rect('.detail-top'),back:rect('.detail-top .back'),
                    scroll:rect('.detail-shell'),dock:rect('.lab-action-dock')};}''')
                check('normal detail header owns safe top once and content excludes its action dock', boxes['detail']['top'] == 0 and boxes['back']['top'] >= 59 and boxes['scroll']['top'] >= boxes['head']['bottom'] - 1 and boxes['scroll']['bottom'] <= boxes['dock']['top'] + 1, geometry=boxes)
            expect(page.locator('.lab-ledger')).to_be_visible()
            capture(page, 'normal-detail')
            page.locator('.detail .back').click()
            expect(page.locator('.detail')).to_have_count(0)
            page.locator('#mobileNewBooking' if args.width == 440 else '#newBooking').click()
            form = page.locator('#bookingForm')
            expect(form).to_be_visible()
            pickup = form.locator('[name=pickupTime]')
            trigger = pickup.locator('..').locator('.admin-v4315-time-trigger')
            trigger.click()
            overlay = page.locator('.admin-v4315-time-overlay')
            values = []
            for period in ['morning', 'day', 'evening']:
                overlay.locator(f'[data-time-period={period}]').click()
                values += overlay.locator('.admin-v4315-time-option:not([hidden])').evaluate_all('els=>els.map(el=>el.dataset.time)')
            check('all29 canonical time choices survive normal production presentation', len(values) == len(set(values)) == 29 and values[0] == '07:00' and values[-1] == '21:00')
            overlay.locator('[data-time="21:00"]').click()
            expect(pickup).to_have_value('21:00')
            capture(page, 'normal-booking-form')
            form.locator('header [data-close]').click()
            expect(page.locator('#labLeaveDialog')).to_be_visible()
            page.locator('#labLeaveDialog [data-lab-keep]').click()
            expect(pickup).to_have_value('21:00')
            form.locator('header [data-close]').click()
            page.locator('#labLeaveDialog [data-lab-discard]').click()
            expect(form).to_have_count(0)
            check('normal candidate preserves and explicitly discards a real unsaved form', True)
            navigate(page, 'equipment')
            page.get_by_role('button', name='Редагувати ціни', exact=True).click()
            catalog = page.locator('#catalogForm')
            before = page.evaluate("localStorage.getItem('vacleaner_catalog')")
            catalog.locator('[name=puzzi_weekday]').fill('1000')
            catalog.locator('[type=submit]').click()
            expect(catalog.locator('[type=submit]')).to_be_enabled()
            expect(catalog.locator('[name=puzzi_weekday]')).to_have_value('1000')
            expect(page.locator('.toast').last).to_contain_text('Не вдалося зберегти налаштування')
            check('rejected canonical save retains its draft and last acknowledged cache', page.evaluate("localStorage.getItem('vacleaner_catalog')") == before)
            capture(page, 'normal-rejected-save')
        except Exception as error:
            check('candidate acceptance completed', False, error=str(error), trace=traceback.format_exc())
            try:
                capture(page, 'failure')
            except Exception:
                pass
        finally:
            check('no uncaught application error', not errors, errors=errors)
            check('no remote request was forwarded or unexpectedly requested', not unexpected, unexpected=unexpected)
            context.tracing.stop(path=str(out / 'trace.zip'))
            context.close()
            browser.close()
    summary = {'browser': args.browser, 'width': args.width, 'passed': sum(r['passed'] for r in results),
               'failed': sum(not r['passed'] for r in results), 'checks': results, 'requests': calls,
               'network': 'All remote requests intercepted; no production/stage forwarding',
               'productionWrites': 0, 'physicalDevice': False, 'serviceWorkers': 'blocked in fixture browser'}
    (out / 'result.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: summary[k] for k in ['browser', 'width', 'passed', 'failed']}), flush=True)
    return int(bool(summary['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
