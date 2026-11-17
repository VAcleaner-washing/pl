"""Reject runtime/hydration errors on the exported public routes, including slow JS."""
from __future__ import annotations

import argparse
import json
import os
import re
import time
import traceback
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree

from playwright.sync_api import expect, sync_playwright
from e2e_smoke import SUPABASE_HOST, choose_booking_slot, iso, make_api_handler, static_server

PROJECT = Path(__file__).resolve().parents[1]
DRAFT_KEY = 'vacleaner_booking_draft_v4144'


class ApiReadTracker:
    """Keep the deliberate reload behind the actual, debounced quote response."""

    def __init__(self, page):
        self.page = page
        self.rows = []
        self.pending = {}
        self.last_activity = time.monotonic()
        page.on('request', self.started)
        page.on('requestfinished', lambda request: self.finished(request, None))
        page.on('requestfailed', lambda request: self.finished(request, request.failure))

    def started(self, request):
        if not request.url.startswith(SUPABASE_HOST) or request.method == 'OPTIONS':
            return
        try:
            payload = request.post_data_json if request.post_data else {}
        except Exception:
            payload = {}
        row = {'serial': len(self.rows) + 1, 'payload': payload, 'finished': False, 'failure': None}
        self.rows.append(row)
        self.pending[request] = row
        self.last_activity = time.monotonic()

    def finished(self, request, failure):
        row = self.pending.pop(request, None)
        if row is not None:
            row.update(finished=True, failure=failure)
            self.last_activity = time.monotonic()

    def state(self, expected):
        matches = [row for row in self.rows if isinstance(row['payload'], dict)
                   and all(row['payload'].get(key) == value for key, value in expected.items())]
        latest = matches[-1] if matches else None
        quiet = time.monotonic() - self.last_activity
        return {'ready': bool(latest and latest['finished'] and not latest['failure']
                              and not self.pending and quiet >= .5),
                'matchingRead': latest, 'pendingSerials': [row['serial'] for row in self.pending.values()],
                'quietMs': round(quiet * 1000), 'totalReads': len(self.rows)}

    def settle(self, expected):
        # The application debounces availability by 320ms, whereas draft save is 180ms.
        # A saved draft alone does not establish that the departing document is idle.
        # Observe a completed read for the current logical inputs plus 500ms with no
        # outstanding/read activity. All pageerror listeners stay active throughout.
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if self.state(expected)['ready']:
                return
            self.page.wait_for_timeout(25)
        raise AssertionError({'reloadReadinessTimedOut': self.state(expected), 'expectedRead': expected})


class FulfillmentExportParser(HTMLParser):
    """Read only the exported booking fulfillment row, before React can hydrate it."""

    def __init__(self):
        super().__init__()
        self.depth = 0
        self.rows = 0
        self.buttons = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            if self.depth:
                self.depth += 1
            elif 'booking-choice-row' in attrs.get('class', '').split():
                self.depth = 1
                self.rows += 1
        if self.depth and tag == 'button':
            self.buttons.append(attrs)

    def handle_endtag(self, tag):
        if tag == 'div' and self.depth:
            self.depth -= 1


def check_fulfillment_export(root):
    parser = FulfillmentExportParser()
    parser.feed((root / 'bronuvannia/index.html').read_text())
    assert parser.rows == 1 and len(parser.buttons) == 2, f'Expected one exported fulfillment row with two choices: {parser.buttons}'
    selected = [button for button in parser.buttons
                if 'is-selected' in button.get('class', '').split()
                or button.get('aria-pressed') == 'true' or button.get('aria-checked') == 'true']
    assert not selected, f'Exported HTML preselects fulfillment while React starts without a choice: {selected}'
    return {'rows': parser.rows, 'buttons': parser.buttons}


def booking_fulfillment_case(page, width, evidence):
    """Exercise customer choices and draft replay, including actual React validation."""
    mobile = width <= 620
    choices = page.locator('#booking-extras .booking-choice-row button')
    cta = page.locator('.booking-mobile-summary button')
    progress = page.locator('.booking-progress button')
    dates = page.locator('#booking-dates input[type="date"]')
    start, finish = iso(2), iso(3)

    def snapshot(label):
        evidence.append({'stage': label, **page.evaluate("""() => ({
            activeStep: document.querySelector('.booking-form')?.dataset.vxActiveStep,
            choices: [...document.querySelectorAll('#booking-extras .booking-choice-row button')].map(button => ({
                text: button.textContent.trim(), class: button.className,
                ariaPressed: button.getAttribute('aria-pressed'), ariaChecked: button.getAttribute('aria-checked')
            })),
            progress: [...document.querySelectorAll('.booking-progress button')].map(button => ({text: button.textContent.trim(), class: button.className})),
            cta: document.querySelector('.booking-mobile-summary button')?.textContent.trim(),
            dates: [...document.querySelectorAll('#booking-dates input[type="date"]')].map(input => input.value),
            address: [...document.querySelectorAll('.booking-delivery-address input')].map(input => ({value: input.value, required: input.required}))
        })""")})

    def unselected(label):
        snapshot(label)
        expect(choices).to_have_count(2)
        expect(page.locator('#booking-extras .booking-choice-row button.is-selected')).to_have_count(0)
        expect(page.locator('#booking-extras .booking-choice-row button[aria-pressed="true"],#booking-extras .booking-choice-row button[aria-checked="true"]')).to_have_count(0)

    def selected(label):
        active = page.locator('#booking-extras .booking-choice-row button.is-selected')
        expect(active).to_have_count(1)
        expect(active).to_contain_text(label)

    def available():
        # The completed date step is derived from the fulfilled availability response.
        expect(progress.nth(1)).to_have_class(re.compile(r'\bis-complete\b'), timeout=10000)

    def restored_inputs():
        expect(dates.nth(0)).to_have_value(start)
        expect(dates.nth(1)).to_have_value(finish)
        expect(page.locator('.booking-products button[data-product-code="puzzi_jimmy"]')).to_have_class(re.compile(r'\bis-selected\b'))
        expect(page.locator('#booking-contact .booking-contact-grid input').nth(0)).to_have_value('Тест чернетки')
        expect(page.locator('#booking-contact .booking-contact-grid input').nth(1)).to_have_value('+380951111111')
        expect(page.locator('#booking-contact textarea')).to_have_value('Лише локальна перевірка відновлення')

    def wait_for_draft(mode):
        page.wait_for_function("""({key, mode, start, finish, requireStep}) => {
            const draft = JSON.parse(sessionStorage.getItem(key) || 'null');
            return draft?.fulfillment === mode && draft.product === 'puzzi_jimmy'
                && draft.controls?.['date-0']?.value === start && draft.controls?.['date-1']?.value === finish
                && draft.controls?.phone?.value === '+380951111111'
                && draft.controls?.comment?.value === 'Лише локальна перевірка відновлення'
                && (!requireStep || draft.step === 2
                    && Number(document.querySelector('.booking-form')?.dataset.vxActiveStep) === 2);
        }""", arg={'key': DRAFT_KEY, 'mode': mode, 'start': start, 'finish': finish, 'requireStep': mobile})

    def reload_draft(mode):
        wait_for_draft(mode)
        expected_request = {'action': 'availability', 'productCode': 'puzzi_jimmy',
                            'startDate': start, 'returnDate': finish, 'fulfillment': mode,
                            'customerPhone': '+380951111111',
                            'deliveryAddress': 'Європейська 146Е' if mode == 'delivery' else ''}
        evidence.append({'stage': mode + ' before reload readiness', 'reads': page._vac_reads.state(expected_request)})
        page._vac_reads.settle(expected_request)
        evidence.append({'stage': mode + ' actual reload point', 'reads': page._vac_reads.state(expected_request)})
        page.reload(wait_until='networkidle')
        page.wait_for_selector('html[data-vacleaner-hydrated="1"]', state='attached')
        available()
        # A selected-looking DOM alone is insufficient: this label requires React's
        # fulfillment state (and delivery address) to pass its own validation.
        expect(cta).to_contain_text('До контактів', timeout=10000)
        restored_inputs()
        selected('Самовивіз' if mode == 'pickup' else 'Доставка')
        if mobile:
            expect(page.locator('#booking-extras')).to_have_class(re.compile(r'\bis-vx-active\b'))

    page.wait_for_selector('.vx-smart-entry')
    unselected('after hydration')
    page.locator('[data-vx-task="mattress"]').click()
    page.locator('.booking-products button[data-product-code="puzzi_jimmy"]').click()
    unselected('after product update')
    if mobile:
        expect(cta).to_contain_text('Обрати дату')
        cta.click()
        expect(page.locator('#booking-dates')).to_have_class(re.compile(r'\bis-vx-active\b'))
    dates.nth(0).fill(start)
    choose_booking_slot(page, 0, 'morning', '#booking-dates')
    dates.nth(1).fill(finish)
    choose_booking_slot(page, 1, 'morning', '#booking-dates')
    dates.nth(1).dispatch_event('change')
    available()
    expect(cta).to_contain_text('До отримання')
    if mobile:
        cta.click()
        expect(page.locator('#booking-extras')).to_have_class(re.compile(r'\bis-vx-active\b'))
    else:
        progress.nth(2).click()
    unselected('step 3 after date updates')
    progress.nth(3).click()
    expect(progress.nth(2)).not_to_have_class(re.compile(r'\bis-complete\b'))
    expect(cta).to_contain_text('До отримання')
    if mobile:
        cta.click()
        expect(page.locator('#booking-extras')).to_have_class(re.compile(r'\bis-vx-active\b'))
    snapshot('no choice cannot advance')

    choices.filter(has_text='Доставка').click()
    selected('Доставка')
    address = page.locator('.booking-delivery-address input:not([data-vac-address-detail])')
    expect(address).to_be_visible()
    expect(address).to_have_attribute('required', '')
    expect(address).to_have_value('')
    expect(cta).not_to_contain_text('До контактів')
    snapshot('first tap delivery requires address')

    choices.filter(has_text='Самовивіз').click()
    selected('Самовивіз')
    expect(page.locator('.booking-delivery-address')).to_have_count(0)
    expect(cta).to_contain_text('До контактів')
    snapshot('pickup advances without address')
    if mobile:
        cta.click()
        expect(page.locator('#booking-contact')).to_have_class(re.compile(r'\bis-vx-active\b'))
    else:
        progress.nth(3).click()
    contact = page.locator('#booking-contact .booking-contact-grid input')
    contact.nth(0).fill('Тест чернетки')
    contact.nth(1).fill('+380951111111')
    page.locator('#booking-contact textarea').fill('Лише локальна перевірка відновлення')
    progress.nth(2).click()
    reload_draft('pickup')
    expect(page.locator('.booking-delivery-address')).to_have_count(0)
    snapshot('pickup draft restores React state and input data')

    choices.filter(has_text='Доставка').click()
    address.fill('Європейська 146Е')
    detail = page.locator('.booking-delivery-address input[data-vac-address-detail]')
    expect(detail).to_have_count(1)
    detail.fill('Другий під’їзд')
    expect(cta).to_contain_text('До контактів')
    page.wait_for_function("""key => {
        const controls = JSON.parse(sessionStorage.getItem(key) || 'null')?.controls;
        return controls?.['address-main']?.value === 'Європейська 146Е'
            && controls?.['address-detail']?.value === 'Другий під’їзд';
    }""", arg=DRAFT_KEY)
    reload_draft('delivery')
    expect(address).to_have_value('Європейська 146Е')
    expect(detail).to_have_value('Другий під’їзд')
    snapshot('delivery draft restores React state and input data')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='hydration-test-results')
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--booking-only', action='store_true', help='Run the three booking cases; default keeps the complete public-route sweep.')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    artifacts = Path(args.artifacts).resolve()
    artifacts.mkdir(parents=True, exist_ok=True)
    routes = [urlparse(e.text).path for e in ElementTree.parse(root / 'sitemap.xml').iter()
              if e.tag.endswith('loc')]
    config = json.loads((PROJECT / 'config/vacleaner.json').read_text())
    results = []
    source_result = {'route': '/bronuvannia/', 'phase': 'static export'}
    try:
        source_result['fulfillment'] = check_fulfillment_export(root)
        source_result['passed'] = True
    except Exception:
        source_result['passed'] = False
        source_result['pythonFailure'] = traceback.format_exc()
    results.append(source_result)
    print(f"{'PASS' if source_result['passed'] else 'FAIL'} booking fulfillment static export", flush=True)
    with static_server(root) as base, sync_playwright() as playwright:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        executable = os.environ.get(f'PLAYWRIGHT_{args.browser.upper()}_EXECUTABLE')
        if executable:
            options['executable_path'] = executable
        elif args.browser == 'chromium' and Path('/usr/bin/chromium').exists():
            options['executable_path'] = '/usr/bin/chromium'
        browser = getattr(playwright, args.browser).launch(**options)
        for width, slow in [(1440, False), (390, False), (390, True)]:
            # This suite tests document hydration with routed API fixtures.
            # Actual service-worker lifecycle has its own network-backed suite.
            context = browser.new_context(viewport={'width': width, 'height': 844}, service_workers='block')
            api = make_api_handler(config)
            api_calls = []

            def route_handler(route):
                url = route.request.url
                if url.startswith(SUPABASE_HOST):
                    try:
                        payload = route.request.post_data_json if route.request.post_data else {}
                    except Exception:
                        payload = {}
                    action = payload.get('action') if isinstance(payload, dict) else None
                    api_calls.append({'url': url, 'action': action})
                    if action == 'create':
                        # This suite must never submit even a fixture booking.
                        route.abort()
                    else:
                        api(route)
                elif url.startswith(base):
                    if slow and any(chunk in url for chunk in ['01pb0x0z72e41.js', '146ntlcv_t6~w-v4041.js', '0x2bx8kerxrmz.js']):
                        time.sleep(0.4)
                    route.continue_()
                else:
                    route.abort()

            context.route('**/*', route_handler)
            case_routes = ['/bronuvannia/'] if args.booking_only else (routes if not slow else ['/', '/bronuvannia/', '/komplekty/', '/rishennia/textile/'])
            for route in case_routes:
                # A departing document can still start delayed catalog reads.
                # WebKit reports some replacement-phase cancellations as access-
                # control page errors without a network request (Playwright #43120).
                # Use one document per hydration case; do not filter page errors.
                page = context.new_page()
                page._vac_reads = ApiReadTracker(page)
                errors = []
                failed_requests = []
                booking_evidence = []
                response = None
                python_error = None
                api_start = len(api_calls)
                def on_error(error):
                    errors.append(str(error))
                def on_request_failed(request):
                    failed_requests.append({'url':request.url,'reason':request.failure})
                page.on('pageerror', on_error)
                page.on('requestfailed', on_request_failed)
                try:
                    response = page.goto(base + route, wait_until='networkidle')
                    if page.locator('script[src*="/assets/public-hydration.js"]').count():
                        page.wait_for_selector('html[data-vacleaner-hydrated="1"]', state='attached')
                    if route == '/bronuvannia/':
                        booking_fulfillment_case(page, width, booking_evidence)
                    page.wait_for_timeout(100)
                except Exception:
                    python_error = traceback.format_exc()
                try:
                    pending = page.locator('script[type="application/x-vacleaner-after-hydration"]').count()
                except Exception:
                    pending = None
                    python_error = python_error or traceback.format_exc()
                case_api = api_calls[api_start:]
                create_calls = [call for call in case_api if call['action'] == 'create']
                result = {'route': route, 'width': width, 'slowScripts': slow,
                          'status': response.status if response else None, 'errors': [str(e) for e in errors],
                          'pendingEnhancements': pending}
                if booking_evidence:
                    result['bookingFulfillment'] = booking_evidence
                if python_error:
                    result['pythonFailure'] = python_error
                if create_calls:
                    result['unexpectedCreateCalls'] = create_calls
                if errors or python_error:
                    result['failedRequests'] = failed_requests
                result['passed'] = result['status'] == 200 and not errors and pending == 0 and not python_error and not create_calls
                results.append(result)
                page.remove_listener('pageerror', on_error)
                page.remove_listener('requestfailed', on_request_failed)
                if not result['passed']:
                    try:
                        page.screenshot(path=str(artifacts / f'failure-{len(results)}.png'))
                    except Exception as error:
                        result['screenshotFailure'] = str(error)
                print(f"{'PASS' if result['passed'] else 'FAIL'} {width} slow={slow} {route}", flush=True)
                page.close()
            context.close()
        browser.close()
    summary = {'browser': args.browser, 'passed': sum(r['passed'] for r in results),
               'failed': [r for r in results if not r['passed']], 'results': results}
    (artifacts / 'result.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({'passed': summary['passed'], 'failed': len(summary['failed'])}))
    return 1 if summary['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
