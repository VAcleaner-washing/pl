"""Render shipped admin HTML using GitHub Pages extensionless-file precedence.

This deliberately loads every production asset instead of injecting fixture CSS.
All backend calls are mocked; finance forms are opened but never submitted.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import threading
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke


class PagesHandler(smoke.QuietStaticHandler):
    def do_GET(self):
        # Pages resolves the old .html export before the directory at this URL.
        if urlsplit(self.path).path == '/admin/bronuvannia':
            self.path = self.path.replace('/admin/bronuvannia', '/admin/bronuvannia.html', 1)
        super().do_GET()


@contextmanager
def pages_server(root):
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(PagesHandler, directory=str(root)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def fixtures():
    puzzi = smoke.booking('00000000-0000-4000-8000-000000000081', 'VAC-ROUTE-PUZZI', 'issued', 0, 1)
    puzzi.update(base_amount=800, total_amount=800)
    combo = smoke.booking('00000000-0000-4000-8000-000000000082', 'VAC-ROUTE-COMBO', 'issued', 0, 1, 'combo', 'Puzzi + SC 2')
    combo.update(base_amount=1200, total_amount=1200, prepayment_amount=0, prepayment_paid=False, deposit_amount=1400)
    return [puzzi, combo]


def api_handler(config):
    bookings = fixtures()
    smoke.BOOKINGS = bookings
    fallback = smoke.make_api_handler(config)

    def handle(route):
        if '/functions/v1/vacleaner-admin-bookings-v4' in route.request.url:
            payload = route.request.post_data_json or {}
            # Fail if this render-only regression accidentally submits data.
            action = payload.get('action')
            if action not in {'list', 'calendar', 'clients', 'referrals_expiring', 'audit_log', 'lookup_customer'}:
                raise AssertionError(f'Unexpected backend action: {payload.get("action")}')
            body = {'list': {'bookings': bookings}, 'calendar': {'days': smoke.calendar_days()}, 'clients': {'customers': []}, 'referrals_expiring': {'referrals': []}, 'audit_log': {'entries': []}, 'lookup_customer': {'customer': None}}[action]
            route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
        else:
            fallback(route)
    return handle


def aligned_rows(locator):
    return locator.evaluate_all('''rows => rows.map(row => {
      const label = row.querySelector(':scope > span')?.getBoundingClientRect();
      const amount = row.querySelector(':scope > strong, :scope > b')?.getBoundingClientRect();
      return label && amount ? {labelRight:label.right, labelBottom:label.bottom, amountTop:amount.top, amountLeft:amount.left, amountRight:amount.right} : null;
    }).filter(Boolean)''')


def exercise(page, checks, label):
    # The approved mobile home opens Upcoming first; navigate using its real tab.
    mobile_bookings = page.locator('.mobile-nav button[data-mobile-view="bookings"]')
    if mobile_bookings.is_visible():
        mobile_bookings.click()
    page.wait_for_selector('.booking-card')
    checks.check(bool(re.search(r'\bv43-prod\b', page.locator('html').get_attribute('class') or '')), f'{label}: canonical admin shell')
    checks.check(page.locator('link[href*="admin-v436.css"]').count() == 1 and page.locator('script[src*="admin-v437.js"]').count() == 1, f'{label}: shipped finance assets loaded')
    card = page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000081"]')
    finance = card.locator('.booking-finance')
    expect(finance.locator('.booking-finance-received-breakdown')).to_contain_text('Передоплата')
    checks.check(smoke.normalized_text(finance.locator('.booking-finance-received-summary > strong').inner_text()) == '1 200 грн', f'{label}: received 1200 preserved')
    checks.check(smoke.normalized_text(finance.locator('em > strong').inner_text()) == '400 грн', f'{label}: preliminary refund 400 preserved')
    checks.check(not finance.locator('.booking-deposit-state').is_visible() and not finance.locator('.booking-finance-received-legacy').is_visible(), f'{label}: paid deposit and legacy receipt are not duplicated')
    axis = aligned_rows(finance.locator(':scope > .booking-finance-expenses, :scope > .booking-finance-received-summary, :scope > em'))
    # Mobile intentionally stacks the expense headline; received/refund use rows.
    checks.check(len(axis) == 3 and all(x['labelRight'] <= x['amountLeft'] + 1 or x['labelBottom'] <= x['amountTop'] + 1 for x in axis) and max(x['amountRight'] for x in axis)-min(x['amountRight'] for x in axis) <= 2, f'{label}: booking finance labels do not overlap and amounts align')
    if page.locator('.toast').count():
        expect(page.locator('.toast').last).not_to_be_visible(timeout=5000)
    finance.evaluate("el => el.scrollIntoView({block:'center'})")
    checks.screenshot(page, f'{label}-bookings.png')
    finance.screenshot(path=str(checks.artifacts/f'{label}-booking-finance.png'))

    combo = page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000082"]')
    for action, title in [('finance', 'Попередній розрахунок'), ('complete', 'Закриття оренди')]:
        button = combo.locator(f'[data-action="{action}"]')
        if not button.is_visible():
            combo.locator('.booking-row-head').click()
            button = page.locator(f'.detail [data-action="{action}"]')
        button.click()
        form = page.locator('#financeForm')
        expect(form).to_be_visible()
        checks.check(page.get_by_role('heading', name=title, exact=True).is_visible(), f'{label}: {title} opens')
        rows = aligned_rows(form.locator('.finance-flow-group > div:not(.finance-flow-title)'))
        checks.check(len(rows) >= 7 and all(x['labelRight'] <= x['amountLeft'] + 1 for x in rows), f'{label}/{action}: all finance labels have separate amount columns')
        checks.check(bool(rows) and max(x['amountRight'] for x in rows)-min(x['amountRight'] for x in rows) <= 2, f'{label}/{action}: amounts share right edge')
        checks.check(smoke.normalized_text(form.locator('.received-total > strong').inner_text()) == '1 400 грн' and smoke.normalized_text(form.locator('.expenses-total > strong').inner_text()) == '1 200 грн' and smoke.normalized_text(form.locator('.finance-flow-final > strong').inner_text()) == '200 грн', f'{label}/{action}: received, expenses and refund preserved')
        helper = form.locator('.finance-flow-received > div:not(.received-total) span > small')
        checks.check(helper.evaluate("el => getComputedStyle(el).display === 'block'"), f'{label}/{action}: deposit explanation occupies separate line')
        checks.check(smoke.no_horizontal_overflow(page), f'{label}/{action}: no horizontal overflow')
        form.locator('.finance-flow-final').scroll_into_view_if_needed()
        result_visible = form.locator('.finance-flow-final').evaluate('''el => {
          const result = el.getBoundingClientRect(), footer = el.closest('form').querySelector('footer').getBoundingClientRect();
          const header = el.closest('form').querySelector('header').getBoundingClientRect();
          return result.top >= header.bottom - 1 && result.bottom <= footer.top + 1;
        }''')
        checks.check(result_visible, f'{label}/{action}: full settlement result scrolls clear of fixed header/footer')
        checks.screenshot(page, f'{label}-{action}.png')
        form.get_by_role('button', name='Закрити', exact=True).click()
        expect(form).not_to_be_attached()
        if page.locator('.detail').count():
            page.locator('.detail .back').click()
            combo = page.locator('.booking-card[data-id="00000000-0000-4000-8000-000000000082"]')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='dist')
    parser.add_argument('--artifacts', default='admin-entrypoint-test-results')
    parser.add_argument('--widths', default='320,390,430,768,1024,1280,1440,1648,1920')
    parser.add_argument('--routes', default='/admin/bronuvannia,/admin/bronuvannia/,/admin/bronuvannia.html')
    args = parser.parse_args()
    checks = smoke.Checks(Path(args.artifacts).resolve())
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as p:
        options = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):
            options['executable_path'] = os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
        browser = p.chromium.launch(**options)
        for width in map(int, args.widths.split(',')):
            for number, route in enumerate(args.routes.split(',')):
                label = f'{width}-route-{number}'
                context = browser.new_context(viewport={'width': width, 'height': 1000}, service_workers='block')
                context.add_init_script(smoke.session_script())
                smoke.install_routes(context, base, api_handler(config))
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(base+route+'?entrypoint=qa#bookings', wait_until='networkidle')
                    checks.check(page.url == base+route+'?entrypoint=qa#bookings', f'{label}: URL, query and hash preserved')
                    exercise(page, checks, label)
                    checks.check(not errors, f'{label}: no runtime errors {errors}')
                except Exception as exc:
                    checks.check(False, f'{label}: {exc}')
                    checks.capture_failure(page, label)
                finally:
                    context.close()
        browser.close()
    checks.artifacts.mkdir(parents=True, exist_ok=True)
    result = {'passed': checks.passed, 'failed': checks.failed, 'status': 'failed' if checks.failed else 'passed'}
    (checks.artifacts/'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False))
    return int(bool(checks.failed))


if __name__ == '__main__':
    raise SystemExit(main())
