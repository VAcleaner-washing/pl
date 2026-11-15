"""Check the shipped composite field focus and booking steps, with no real APIs."""
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
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    output = Path(args.artifacts).resolve()
    output.mkdir(parents=True, exist_ok=True)
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    forbidden, external, errors, fields, checks = [], [], [], [], []
    result = {'browser': args.browser, 'productionWrites': 0, 'physicalIphoneTested': False,
              'scope': 'Exact supplied normal artifact, intercepted APIs, emulated standalone/safe areas'}
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        browser = getattr(pw, args.browser).launch(**options)
        device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'}
        device.update(viewport={'width': 440, 'height': 956}, timezone_id='Europe/Kyiv', service_workers='block')
        context = browser.new_context(**device)
        context.add_init_script(smoke.session_script() + "Object.defineProperty(navigator,'standalone',{value:true});")
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
            if url.path.startswith('/auth/v1/'):
                return route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='{"id":"00000000-0000-4000-8000-000000000099"}')
            return api(route)

        context.route('**/*', route_request)
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(base + '/admin/bronuvannia/')
            page.wait_for_selector('#view .booking-card,#view .upcoming-row')
            page.evaluate("()=>{document.documentElement.style.setProperty('--pwa-safe-top','59px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')}")
            idle.navigate(page, 'settings')
            for tab in ['rental', 'delivery', 'equipment']:
                page.locator(f'[data-settings-tab="{tab}"]').click()
                names = page.locator('.settings-section input:visible').evaluate_all('els=>els.filter(el=>el.parentElement.querySelector(":scope>em")).map(el=>el.name).filter(Boolean)')
                for name in names:
                    control = page.locator(f'.settings-section input[name="{name}"]:visible').first
                    before = control.input_value()
                    control.scroll_into_view_if_needed()
                    control.focus()
                    sample = control.evaluate('''el=>{const i=getComputedStyle(el),w=getComputedStyle(el.parentElement);return{
                      name:el.name,value:el.value,inputOutline:i.outlineStyle,inputOutlineWidth:i.outlineWidth,
                      wrapperOutline:w.outlineStyle,wrapperOutlineWidth:w.outlineWidth,
                      caretColor:i.caretColor,fontSize:parseFloat(i.fontSize),inputmode:el.inputMode}}''')
                    assert sample['inputOutline'] == 'none' and sample['inputOutlineWidth'] == '0px', sample
                    assert sample['wrapperOutline'] == 'solid' and sample['wrapperOutlineWidth'] == '2px', sample
                    assert sample['caretColor'] not in ['transparent', 'rgba(0, 0, 0, 0)'] and sample['fontSize'] >= 16, sample
                    assert sample['value'] == before, 'Focusing must not change a setting'
                    fields.append(sample)
                if tab == 'delivery':
                    fuel = page.locator('[name=fuelPetrol]')
                    fuel.scroll_into_view_if_needed()
                    fuel.fill('8,5')
                    assert fuel.input_value() == '8,5'
                    selection = fuel.evaluate('el=>({start:el.selectionStart,end:el.selectionEnd})')
                    assert selection == {'start': 3, 'end': 3}, selection
                    page.screenshot(path=str(output / 'fuel-focus.png'), caret='initial')
            assert len(fields) == 19, 'All19 composite Settings cells must be covered'
            checks.append('all19 composite inputs retain value and caret, with a visible wrapper focus ring')
            # Navigation uses the existing dirty-form prompt; discard only this fixture draft.
            page.locator('#mobileNewBooking').click()
            leave = page.locator('.lab-leave-dialog[open]')
            if leave.count():
                leave.locator('[data-lab-discard]').click()
            form = page.locator('#bookingForm')
            expect(form).to_be_visible()
            progress = form.locator('.mobile-booking-progress').evaluate('''el=>{const s=getComputedStyle(el);return{
              labels:[...el.querySelectorAll('[data-booking-progress]')].map(n=>n.textContent.trim()),
              active:el.querySelector('.active')?.textContent.trim(),border:s.borderBottomWidth,padding:s.padding,
              before:getComputedStyle(el,'::before').content,after:getComputedStyle(el,'::after').content}}''')
            assert progress['labels'] == ['1', '2', '3', '4'] and progress['active'] == '1', progress
            assert progress['border'] == '0px' and progress['padding'] == '0px', progress
            assert progress['before'] == progress['after'] == 'none', progress
            page.screenshot(path=str(output / 'booking-steps.png'))
            checks.append('four numbered steps keep the active state without connector or underline decoration')
            assert not errors and not forbidden and not external
            result.update(passed=len(checks), failed=0, checks=checks, fields=fields, progress=progress)
        except Exception as error:
            result.update(passed=len(checks), failed=1, checks=checks, fields=fields,
                          error=str(error), traceback=traceback.format_exc()[-3500:])
            page.screenshot(path=str(output / 'failure.png'))
        finally:
            result.update(runtimeErrors=errors, forbiddenActions=forbidden, externalRequests=external)
            context.tracing.stop(path=str(output / 'trace.zip'))
            context.close()
            browser.close()
    (output / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['browser', 'passed', 'failed', 'productionWrites']}, ensure_ascii=False))
    return int(bool(result['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
