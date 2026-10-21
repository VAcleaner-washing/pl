"""Exercise shipped mobile forms in Chromium/WebKit with read-only, isolated I/O.

The iPhone profile and standalone flag are emulation, not a physical-device claim.
No fixture CSS or compatibility DOM is injected into the production shell.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke
from admin_entrypoint_finance_qa import exercise as finance_exercise, fixtures, pages_server


def readonly_api(config, forbidden):
    bookings = fixtures()
    for row in bookings:
        row.update(customer_name='Тестова Олександра Олександрівна', customer_telegram='@test_client')
    smoke.BOOKINGS = bookings
    fallback = smoke.make_api_handler(config)
    client = {'phone': '+380951111111', 'name': bookings[0]['customer_name'],
              'telegram': '@test_client', 'preferred_contact': 'telegram',
              'address': 'Полтава, тестова вулиця, 10 · під’їзд 2, квартира 6',
              'document_type': 'ID-картка', 'document_verified_at': None}
    reads = {'list', 'calendar', 'clients', 'campaigns', 'referrals_expiring',
             'audit_log', 'lookup_customer', 'referral_summary', 'customer_sms_history', 'pending_bonus'}

    def handle(route):
        request = route.request
        payload = request.post_data_json if request.post_data else {}
        action = (payload or {}).get('action')
        if '/vacleaner-customer-documents-v1' in request.url and request.method in {'GET','POST'} and parse_qs(urlsplit(request.url).query).get('action') == ['view']:
            route.fulfill(status=200, content_type='application/json', body='{"url":null}')
            return
        if '/vacleaner-settings' in request.url and request.method != 'GET':
            forbidden.append({'url':request.url,'method':request.method})
            route.fulfill(status=409, content_type='application/json', body='{"error":"qa_write_forbidden"}')
            return
        if '/functions/v1/' in request.url and 'vacleaner-settings' not in request.url:
            if action not in reads:
                forbidden.append({'url': request.url, 'action': action})
                route.fulfill(status=409, content_type='application/json', body='{"error":"qa_write_forbidden"}')
                return
            body = {'list': {'bookings': bookings}, 'calendar': {'days': smoke.calendar_days()},
                    'clients': {'customers': [client]}, 'campaigns': {'campaigns': []},
                    'referrals_expiring': {'rewards': [], 'referrals': []},
                    'audit_log': {'entries': []}, 'lookup_customer': {'customer': None},
                    'referral_summary': {'referral': None},
                    'pending_bonus': {'bonus': None},
                    'customer_sms_history': {'consent': 'explicit', 'history': []}}[action]
            route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
        else:
            fallback(route)
    return handle


def readable_fields(form, checks, label):
    small = form.locator('input:visible,select:visible,textarea:visible').evaluate_all('''els => els
      .filter(el => !['checkbox','radio','hidden'].includes(el.type))
      .filter(el => getComputedStyle(el).opacity !== '0' && getComputedStyle(el).pointerEvents !== 'none')
      .filter(el => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map(el => ({name:el.name,size:getComputedStyle(el).fontSize}))''')
    checks.check(not small, f'{label}: readable form fields {small}')


def booking_form(page, checks, label):
    page.locator('#mobileNewBooking:visible,#newBooking:visible').first.click()
    form = page.locator('#bookingForm')
    expect(form).to_be_visible()
    readable_fields(form, checks, label+'/rental')
    checks.check(form.locator('footer').evaluate('''el=>{const r=el.getBoundingClientRect();
      return r.top>=0&&r.bottom<=innerHeight+1&&r.height>=44}'''), label+': booking footer fits viewport')
    form.locator('input[name="startDate"]').fill(smoke.iso(0))
    form.locator('input[name="returnDate"]').fill(smoke.iso(1))
    next_step = form.locator('.mobile-booking-next')
    if next_step.is_visible():
        next_step.click()
    form.locator('input[name="customerName"]').fill('Тестова Олександра Олександрівна')
    form.locator('input[name="customerPhone"]').fill('+380951111111')
    readable_fields(form, checks, label+'/client')
    if next_step.is_visible():
        next_step.click()
        readable_fields(form, checks, label+'/extras')
        next_step.click()
    readable_fields(form, checks, label+'/payment')
    outbound = form.locator('[data-logistics-kind="outbound"][data-logistics-value="delivery"]')
    returned = form.locator('[data-logistics-kind="return"][data-logistics-value="return_to_location"]')
    outbound.click()
    returned.click()
    checks.check(form.locator('[data-logistics-kind]').evaluate_all('els=>els.every(el=>el.getBoundingClientRect().height>=44)'), label+': logistics touch targets are at least 44 px')
    checks.check(form.locator('[name="deliveryOutboundMethod"]').input_value() == 'delivery'
                 and form.locator('[name="deliveryReturnMethod"]').input_value() == 'return_to_location',
                 label+': real independent logistics controls remain usable')
    readable_fields(form, checks, label+'/delivery')
    checks.check(smoke.no_horizontal_overflow(page), label+': booking has no horizontal overflow')
    checks.screenshot(page, label+'-booking-payment.png')
    form.locator('header [data-close]').click()
    expect(form).not_to_be_attached()


def client_card(page, checks, label, width):
    card = page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000081"]')
    card.locator('[data-client-card]').first.click()
    form = page.locator('#clientEditor')
    expect(form).to_be_visible()
    checks.check(form.locator('h2').inner_text() == 'Тестова Олександра Олександрівна', label+': long client name preserved')
    checks.check(form.locator('.client-rental-history article').count() == 2, label+': full rental history preserved')
    values = form.locator('.client-editor-summary strong').all_text_contents()
    checks.check(values[0] == '0' and smoke.normalized_text(values[1]) == '0 грн', label+': completed-only client statistics preserved')
    if width <= 900:
        checks.check(form.locator('.client-editor-summary').evaluate('el=>getComputedStyle(el).gridTemplateColumns.split(" ").length===2'), label+': four client metrics form two balanced rows')
        actions = form.locator('.client-quick-actions-v245 > *').evaluate_all('els=>els.map(el=>el.getBoundingClientRect().toJSON())')
        checks.check(len(actions) == 4 and abs(actions[0]['width']-actions[-1]['width']) <= 1, label+': primary and final client actions fill their rows')
        blocks = form.locator('.client-contact-read > div').evaluate_all('els=>els.map(el=>el.getBoundingClientRect().height)')
        checks.check(bool(blocks) and max(blocks) < 120, label+': contact rows do not stretch into empty space')
        summary_heights = form.locator('details.client-secondary-section > summary').evaluate_all('els=>els.map(el=>el.getBoundingClientRect().height)')
        checks.check(all(44 <= h <= 100 for h in summary_heights), label+': closed secondary sections stay compact and tappable')
    checks.check(smoke.no_horizontal_overflow(page), label+': client card has no horizontal overflow')
    checks.check(not form.locator('.client-contact-edit-fields').is_visible(), label+': contact editing starts closed')
    checks.screenshot(page, label+'-client-top.png')
    form.locator('.client-history-section').scroll_into_view_if_needed()
    history = form.locator('.client-rental-history article')
    checks.check(history.evaluate_all('''els=>els.every(el=>{
      const p=el.getBoundingClientRect();return [...el.querySelectorAll('strong,span,b,button')]
        .every(c=>{const r=c.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1});})'''), label+': history status, amount and button fit their card')
    checks.screenshot(page, label+'-client-history.png')
    form.locator('#clientContactEdit').click()
    expect(form.locator('.client-contact-edit-fields')).to_be_visible()
    readable_fields(form, checks, label+'/edit-client')
    form.locator('[name="customerName"]').fill('Тестова Олександра Олександрівна QA')
    expect(form.locator('footer')).to_be_visible()
    checks.check(form.locator('footer').evaluate('''el=>{const r=el.getBoundingClientRect();
      return r.top>=0&&r.bottom<=innerHeight+1}'''), label+': editing footer remains reachable')
    form.locator('header [data-close]').click()
    expect(form).not_to_be_attached()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--artifacts', default='pwa-test-results/mobile-forms')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT/'config/vacleaner.json').read_text())
    forbidden = []
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as p:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        executable = os.environ.get(f'PLAYWRIGHT_{args.browser.upper()}_EXECUTABLE')
        if executable:
            options['executable_path'] = executable
        browser = getattr(p, args.browser).launch(**options)
        version = browser.version
        for mode in ['browser', 'standalone']:
            for width, height in [(320,568),(390,664),(440,956),(844,390),(932,430)]:
                label = f'{args.browser}-{mode}-{width}x{height}'
                profile = {k:v for k,v in p.devices['iPhone 13'].items() if k != 'default_browser_type'}
                profile.update(viewport={'width':width,'height':height}, device_scale_factor=1, service_workers='block')
                context = browser.new_context(**profile)
                context.add_init_script(smoke.session_script())
                if mode == 'standalone':
                    context.add_init_script("Object.defineProperty(navigator,'standalone',{get:()=>true})")
                smoke.install_routes(context, base, readonly_api(config, forbidden))
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(base+'/admin/bronuvannia/#bookings', wait_until='networkidle')
                    finance_exercise(page, checks, label)
                    booking_form(page, checks, label)
                    client_card(page, checks, label, width)
                    checks.check(not errors, label+': no runtime errors '+repr(errors))
                except Exception as exc:
                    checks.check(False, label+': '+str(exc))
                    checks.capture_failure(page, label)
                finally:
                    context.close()
        browser.close()
    checks.check(not forbidden, 'No business mutations attempted: '+repr(forbidden))
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    result = {'browser':args.browser,'engineVersion':version,'passed':checks.passed,'failed':checks.failed,
              'physicalDevice':False,'liveWrites':False,'status':'failed' if checks.failed else 'passed'}
    (checks.artifacts/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
