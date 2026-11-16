"""Exercise UI feedback with the exact supplied artifact and intercepted APIs only."""
import argparse
import json
import traceback
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
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
    root, output = Path(args.root).resolve(), Path(args.artifacts).resolve()
    output.mkdir(parents=True, exist_ok=True)
    release = json.loads((root / 'release.json').read_text())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    origin = config.get('supabaseUrl') or config.get('supabase', {}).get('url') or 'https://yweluzclearwrazdkahu.supabase.co'
    results, errors, forbidden, actions = [], [], [], []
    allow_login = False
    fixture = idle.fixtures(config, 21, 7, forbidden)
    session = {'access_token': 'ui-feedback-synthetic-token', 'refresh_token': 'ui-feedback-synthetic-refresh',
               'expires_in': 3600, 'token_type': 'bearer',
               'user': {'id': '00000000-0000-4000-8000-000000000062', 'email': 'fixture-only@invalid.example'}}

    def check(name, passed, **evidence):
        results.append({'name': name, 'passed': bool(passed), **evidence})
        print(('PASS: ' if passed else 'FAIL: ') + name, flush=True)

    def route_request(route):
        request, parsed = route.request, urlsplit(route.request.url)
        if parsed.hostname in ['localhost', '127.0.0.1']:
            return route.continue_()
        if parsed.scheme + '://' + parsed.netloc != origin:
            forbidden.append({'path': parsed.path, 'host': parsed.hostname, 'method': request.method})
            return route.abort()
        headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
                   'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Cache-Control': 'no-store'}
        if request.method == 'OPTIONS':
            return route.fulfill(status=204, headers=headers)
        payload = request.post_data_json if request.post_data else {}
        action = (payload or {}).get('action')
        actions.append({'path': parsed.path, 'action': action, 'method': request.method})
        body, status = None, 200
        if parsed.path == '/auth/v1/token':
            if allow_login:
                body = session
            else:
                body, status = {'error': 'invalid_credentials'}, 401
        elif parsed.path == '/auth/v1/settings':
            body = {'disable_signup': True}
        elif parsed.path == '/auth/v1/user':
            body = session['user']
        elif action == 'referral_summary':
            body = {'referral': {'code': 'QA<&TEST>', 'profile': {'instagram': 'fixture.invalid', 'preferred_contact': 'instagram'},
                                 'referrals': [], 'rewards': [], 'activeRewards': [], 'activeRewardCount': 0,
                                 'completedReferrals': 0, 'activeRewardAmount': 0}}
        if body is not None:
            return route.fulfill(status=status, headers=headers, content_type='application/json', body=json.dumps(body))
        return fixture(route)

    with pages_server(root) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        browser = getattr(pw, args.browser).launch(**options)
        device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'} if args.width <= 900 else {}
        device.update(viewport={'width': args.width, 'height': 956}, timezone_id='Europe/Kyiv', service_workers='block')
        context = browser.new_context(**device)
        context.route('**/*', route_request)
        context.add_init_script("""(() => {
          window.__feedbackHandoffs=[];
          window.open=(url)=>{window.__feedbackHandoffs.push(String(url));return null};
          const anchorClick=HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click=function(){
            if(this.href.startsWith('instagram:')){window.__feedbackHandoffs.push(this.href);return}
            return anchorClick.call(this);
          };
          Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new DOMException('Fixture clipboard denial','NotAllowedError'))}});
        })();""")
        if args.width <= 900:
            context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        try:
            page.goto(base + '/admin/bronuvannia/')
            auth = page.locator('#authForm')
            expect(auth).to_be_visible()
            auth.locator('[name=password]').fill('synthetic-wrong-password')
            auth.locator('[type=submit]').click()
            error = page.locator('#authError')
            expect(error).to_have_text('Невірний логін або пароль')
            expect(error).to_have_attribute('role', 'alert')
            expect(auth.locator('[name=login]')).to_have_attribute('autocomplete', 'username')
            expect(auth.locator('[name=password]')).to_have_attribute('autocomplete', 'current-password')
            expect(auth.locator('[name=password]')).to_have_value('synthetic-wrong-password')
            expect(auth.locator('[type=submit]')).to_be_enabled()
            check('failed login announces its message and retains password-manager fields for retry', True)
            page.screenshot(path=str(output / 'auth-error.png'))
            allow_login = True
            auth.locator('[name=password]').fill('synthetic-valid-fixture-password')
            auth.locator('[type=submit]').click()
            expect(page.locator('.booking-card,.upcoming-row').first).to_be_visible()

            if args.width <= 900:
                trigger = page.locator('.mobile-nav .more-nav')
                for _ in range(5):
                    trigger.click()
                    expect(page.locator('.mobile-more-menu')).to_be_visible()
                    trigger.click()
                    expect(page.locator('.mobile-more-menu')).to_have_count(0)
                check('five actual More toggle cycles clear the menu and open class', not page.locator('html').evaluate("el=>el.classList.contains('mobile-more-open')"))
                trigger.click()
                expect(page.locator('.native-v25-profile-static[role=group]')).to_be_visible()
                expect(page.locator('.native-data-refresh')).to_be_visible()
                page.keyboard.press('Home')
                check('menu Home reaches the late refresh action while the profile remains informational', page.locator('.native-data-refresh').evaluate('el=>el===document.activeElement'))
                page.keyboard.press('ArrowDown')
                check('menu ArrowDown reaches the first navigation action after refresh', page.locator('[data-more-view=equipment]').evaluate('el=>el===document.activeElement'))
                page.keyboard.press('End')
                check('menu End reaches logout', page.locator('[data-mobile-logout]').evaluate('el=>el===document.activeElement'))
                page.keyboard.press('Escape')
                expect(page.locator('.mobile-more-menu')).to_have_count(0)
                expect(trigger).to_be_focused()
                check('menu Escape restores trigger focus and clears class', not page.locator('html').evaluate("el=>el.classList.contains('mobile-more-open')"))

            idle.navigate(page, 'settings')
            rental = page.locator('[data-settings-tab=rental]')
            rental.click()
            rental.focus()
            page.keyboard.press('ArrowRight')
            expect(page.locator('[data-settings-tab=delivery]')).to_be_focused()
            expect(page.locator('[data-settings-panel=delivery]')).to_be_visible()
            page.keyboard.press('End')
            expect(page.locator('[data-settings-tab=system]')).to_be_focused()
            page.keyboard.press('Home')
            expect(rental).to_be_focused()
            linked = page.locator('[data-settings-tab]').evaluate_all("els=>els.filter(el=>el.tabIndex===0).length===1&&els.every(el=>{const p=document.getElementById(el.getAttribute('aria-controls'));return p?.getAttribute('role')==='tabpanel'&&p.getAttribute('aria-labelledby')===el.id})")
            check('Settings arrows/Home/End select linked panels with one tab stop', linked)
            page.screenshot(path=str(output / 'settings-tabs.png'))

            idle.navigate(page, 'clients')
            page.locator('.client-name b').first.click()
            benefits = page.locator('.client-benefits-section summary')
            expect(benefits).to_be_visible()
            expect(benefits).to_contain_text('Бонуси та рекомендації')
            benefits.click()
            send = page.locator('[data-client-ref=instagram]')
            expect(send).to_be_visible()
            send.click()
            fallback = page.locator('[data-referral-copy-fallback] textarea')
            expect(fallback).to_be_visible()
            expect(fallback).to_have_value(__import__('re').compile(r'QA<&TEST>'))
            expect(fallback).to_have_attribute('readonly', '')
            expect(send).to_have_attribute('aria-pressed', 'false')
            check('denied clipboard shows the actual labelled selectable text without marking a send',
                  page.evaluate('window.__feedbackHandoffs.length') == 1 and not any(row['action'] == 'referral_mark_sent' for row in actions))
            check('fallback message stays text rather than injecting markup', page.locator('[data-referral-copy-fallback] textarea test').count() == 0)
            fallback.scroll_into_view_if_needed()
            page.screenshot(path=str(output / 'clipboard-fallback.png'))
        except Exception as error:
            check('UI feedback scenario completes', False, error=str(error), traceback=traceback.format_exc())
            page.screenshot(path=str(output / 'failure.png'))
        finally:
            check('browser has no runtime errors', not errors, errors=errors)
            check('all business/provider traffic stayed intercepted with no unrecognized actions', not forbidden, forbidden=forbidden)
            context.tracing.stop(path=str(output / 'trace.zip'))
            browser.close()
    result = {'browser': args.browser, 'width': args.width, 'release': release, 'checks': results,
              'passed': sum(row['passed'] for row in results), 'failed': sum(not row['passed'] for row in results),
              'productionWrites': 0, 'physicalIphoneTested': False, 'actions': actions}
    (output / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    raise SystemExit(bool(result['failed']))


if __name__ == '__main__':
    main()
