"""Measure shipped admin reads and interaction latency using synthetic data only."""
import argparse
import base64
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import pages_server
from mobile_forms_qa import readonly_api


CLIENT_READS = {'view', 'lookup_customer', 'referral_summary', 'customer_sms_history'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='pwa-test-results/read-performance')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--baseline', action='store_true')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    samples = []
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        if executable := os.environ.get(f'PLAYWRIGHT_{args.browser.upper()}_EXECUTABLE'):
            options['executable_path'] = executable
        browser = getattr(pw, args.browser).launch(**options)
        for width in [390, 1440]:
            for standalone in [False, True]:
                label = f'{width}-' + ('pwa' if standalone else 'browser')
                context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block')
                context.add_init_script(smoke.session_script() + ("Object.defineProperty(navigator,'standalone',{value:true});" if standalone else '') + r'''
                  window.__readPerf={calls:[],failedSms:false};
                  const fetchOriginal=window.fetch.bind(window);
                  window.fetch=async function(input,options={}){
                    const url=String(input);
                    if(!url.includes('/functions/v1/'))return fetchOriginal(input,options);
                    const body=options.body?JSON.parse(options.body):{};
                    const action=new URL(url).searchParams.get('action')||body.action||'settings';
                    const call={action,start:performance.now(),end:null};
                    window.__readPerf.calls.push(call);
                    const response=await fetchOriginal(input,options);
                    await new Promise(resolve=>setTimeout(resolve,300));
                    call.end=performance.now();
                    return response;
                  };
                ''')
                forbidden = []
                fallback = readonly_api(config, forbidden)
                sms_requests = 0
                private_images = []

                def handle(route):
                    nonlocal sms_requests
                    payload = route.request.post_data_json if route.request.post_data else {}
                    if '/vacleaner-customer-documents-v1' in route.request.url and parse_qs(urlsplit(route.request.url).query).get('action') == ['view']:
                        route.fulfill(status=200, content_type='application/json', body=json.dumps({'document': {'url': base + '/qa-private-preview.png', 'name': 'Synthetic QA image'}}), headers={'Access-Control-Allow-Origin': '*'})
                        return
                    if (payload or {}).get('action') == 'customer_sms_history':
                        sms_requests += 1
                        if sms_requests == 1:
                            route.fulfill(status=503, content_type='application/json', body='{"error":"service_error"}', headers={'Access-Control-Allow-Origin': '*'} )
                            return
                    fallback(route)

                smoke.install_routes(context, base, handle)
                def private_image(route):
                    private_images.append(route.request.url)
                    route.fulfill(status=200, content_type='image/png', body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII='))
                context.route('**/qa-private-preview.png', private_image)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/admin/bronuvannia/', wait_until='domcontentloaded')
                page.wait_for_selector('#view .booking-card,#view .upcoming-row')
                startup = page.evaluate('performance.now()')
                # Use actual navigation and card controls, with no injected fixture DOM/CSS.
                nav = page.locator('.mobile-nav [data-mobile-view="bookings"]')
                if nav.is_visible():
                    nav.click()
                page.wait_for_selector('.booking-card')
                metrics = {'label': label, 'startup_ms': round(startup)}
                for view, ready in [('calendar', '.calendar-grid'), ('clients', '.client-row'), ('bookings', '.booking-card')]:
                    nav = page.locator(f'.nav [data-view="{view}"]')
                    if not nav.is_visible():
                        nav = page.locator(f'.mobile-nav [data-mobile-view="{view}"]')
                        if not nav.is_visible():
                            page.locator('.mobile-nav .more-nav').click()
                            nav = page.locator(f'.mobile-more-menu [data-more-view="{view}"]')
                    before = page.evaluate('performance.now()')
                    nav.click()
                    page.wait_for_selector(ready)
                    metrics[view + '_ms'] = round(page.evaluate('performance.now()') - before)
                page.locator('.booking-card [data-client-card]').first.click()
                form = page.locator('#clientEditor')
                expect(form).to_be_visible()
                page.wait_for_timeout(450)
                initial = page.evaluate('window.__readPerf.calls')
                metrics['closed_client_reads'] = [c['action'] for c in initial if c['action'] in CLIENT_READS]
                if not args.baseline:
                    checks.check(not metrics['closed_client_reads'], label + ': closed sections make zero client API reads')
                checks.check(form.locator('.client-contact-read').is_visible() and form.locator('.client-rental-history').is_visible(), label + ': contacts and rental history available immediately')
                for section, actions, ready in [
                    ('.client-benefits-section', {'lookup_customer', 'referral_summary'}, '#clientReferralInfo .client-promo-empty'),
                    ('.client-document-section', {'view'}, '#clientDocumentPreview .document-preview-meta'),
                ]:
                    before = page.evaluate('window.__readPerf.calls.length')
                    form.locator(section + '>summary').click()
                    # Close/reopen while the API is deliberately delayed.
                    if not args.baseline:
                        for _ in range(2):
                            form.locator(section + '>summary').click()
                            page.wait_for_timeout(30)
                    page.wait_for_selector(ready)
                    after = page.evaluate('window.__readPerf.calls')
                    if not args.baseline:
                        checks.check({c['action'] for c in after[before:]} == actions, label + ': expanding ' + section + ' reads only its data')
                    count = len(after)
                    for _ in range(2):
                        form.locator(section + '>summary').click()
                        page.wait_for_timeout(30)
                    page.wait_for_timeout(350)
                    checks.check(page.evaluate('window.__readPerf.calls.length') == count, label + ': successful disclosure does not duplicate reads')
                form.locator('.client-sms-section>summary').click()
                expect(form.locator('#clientSmsHistory')).to_contain_text('Сервіс тимчасово недоступний')
                if not args.baseline:
                    retry = form.locator('.client-sms-section [data-client-read-retry]')
                    expect(retry).to_be_visible()
                    retry.click()
                    expect(form.locator('#clientSmsStatus')).to_have_text('згода є')
                    checks.check(sms_requests == 2, label + ': failed read retries without reopening or duplicate requests')
                checks.check(not forbidden, label + ': no business mutations ' + repr(forbidden))
                checks.check(not errors, label + ': no runtime errors ' + repr(errors))
                checks.check(smoke.no_horizontal_overflow(page), label + ': no overflow')
                checks.screenshot(page, label + '.png')
                if not args.baseline:
                    def close_card():
                        form.locator('.client-header-close').click()
                        expect(page.locator('#clientEditor')).not_to_be_attached()

                    def open_card():
                        page.locator('.booking-card [data-client-card]').first.click()
                        expect(page.locator('#clientEditor')).to_be_visible()

                    close_card()
                    open_card()
                    count = page.evaluate('window.__readPerf.calls.length')
                    page.wait_for_timeout(350)
                    checks.check(page.evaluate('window.__readPerf.calls.length') == count, label + ': fresh card also defers closed sections')
                    # Remove the card before the private-view response resolves.
                    images_before = len(private_images)
                    form.locator('.client-document-section>summary').click()
                    page.wait_for_function("() => window.__readPerf.calls.filter(c=>c.action==='view').length===2")
                    close_card()
                    open_card()
                    page.wait_for_timeout(400)
                    checks.check(len(private_images) == images_before, label + ': detached card never downloads private preview')
                    checks.check(form.locator('#clientSmsStatus').inner_text() == 'Розгорнути', label + ': late response leaves new card untouched')
                    form.locator('.client-document-section>summary').click()
                    page.wait_for_selector('#clientDocumentPreview .document-preview-meta')
                    checks.check(page.evaluate("window.__readPerf.calls.filter(c=>c.action==='view').length") == 3, label + ': reopened card reads fresh private data')
                    checks.check(not forbidden and not errors, label + ': repeated navigation remains read-only and error-free')
                samples.append(metrics)
                context.close()
        browser.close()
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    result = {'browser': args.browser, 'baseline': args.baseline, 'samples': samples, 'passed': checks.passed, 'failed': checks.failed}
    (checks.artifacts / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
