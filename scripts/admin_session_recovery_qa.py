"""Exercise shipped admin assets with isolated Auth/API routes; no live writes."""
import argparse
import json
import os
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import api_handler, pages_server


def exercise(browser, base, config, checks, width, scenario):
    context = browser.new_context(viewport={'width': width, 'height': 1000}, service_workers='block')
    context.add_init_script(smoke.session_script() + "\nconst fixtureSession=JSON.parse(localStorage.getItem('vacleaner_session'));fixtureSession.expires_at=1;localStorage.setItem('vacleaner_session',JSON.stringify(fixtureSession));")
    fallback = api_handler(config)
    requests = {'refresh': 0, 'protected': 0, 'old_token': 0}
    outage = {'active': scenario == 'outage'}

    def route_handler(route):
        url = route.request.url
        if '/auth/v1/token?grant_type=refresh_token' in url:
            requests['refresh'] += 1
            if scenario == 'terminal':
                route.fulfill(status=400, content_type='application/json', body=json.dumps({'error': 'invalid_grant', 'error_code': 'refresh_token_not_found'}))
            elif outage['active']:
                route.fulfill(status=503, content_type='application/json', body=json.dumps({'error': 'unexpected_failure'}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'access_token': 'recovered-token', 'refresh_token': 'rotated-fixture', 'expires_at': int(time.time()) + 3600}))
            return
        authorization = route.request.headers.get('authorization', '')
        if authorization:
            requests['protected'] += 1
            if authorization != 'Bearer recovered-token':
                requests['old_token'] += 1
                route.fulfill(status=401, content_type='application/json', body='{"error":"unauthorized"}')
                return
        fallback(route)

    smoke.install_routes(context, base, route_handler)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    label = f'{width}-{scenario}'
    try:
        page.goto(base + '/admin/bronuvannia/#bookings', wait_until='networkidle')
        if scenario == 'terminal':
            expect(page.get_by_role('heading', name='Вхід в адмінку')).to_be_visible()
            checks.check(page.evaluate("localStorage.getItem('vacleaner_session') === null"), label + ': rejected session cleared by sign-in path')
            checks.check(requests['refresh'] == 1 and requests['protected'] == 0, label + ': one refresh and no protected replay')
            checks.screenshot(page, label + '-signin.png')
        else:
            expect(page.locator('#retryLoad')).to_be_visible()
            checks.check(page.evaluate("JSON.parse(localStorage.getItem('vacleaner_session')).refresh_token === 'test-refresh-token'"), label + ': outage preserves session')
            checks.check(requests['refresh'] == 1 and requests['protected'] == 0, label + ': outage sends no business request')
            checks.screenshot(page, label + '-temporary-error.png')
            outage['active'] = False
            page.locator('#retryLoad').click()
            expect(page.locator('.booking-card').first).to_be_visible()
            checks.check(requests['refresh'] == 2 and requests['old_token'] == 0, label + ': retry recovers with one refresh and fresh tokens')
            checks.check(page.evaluate("JSON.parse(localStorage.getItem('vacleaner_session')).refresh_token === 'rotated-fixture'"), label + ': rotated token persisted')
            checks.screenshot(page, label + '-recovered.png')
        checks.check(smoke.no_horizontal_overflow(page), label + ': no overflow')
        checks.check(not errors, label + ': no runtime errors ' + repr(errors))
    except Exception as error:
        checks.check(False, label + ': ' + str(error))
        checks.capture_failure(page, label)
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/session-recovery')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as playwright:
        options = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):
            options['executable_path'] = os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
        browser = playwright.chromium.launch(**options)
        for width in [320, 390, 430, 768, 1440]:
            for scenario in ['terminal', 'outage']:
                exercise(browser, base, config, checks, width, scenario)
        browser.close()
    result = {'passed': checks.passed, 'failed': checks.failed}
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    (checks.artifacts / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
