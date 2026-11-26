"""UX-01 browser assertions on the supplied normal artifact; no live API calls."""
import argparse
import json
import math
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import expect, sync_playwright
import e2e_smoke as smoke
import admin_idle_qa as idle
from admin_entrypoint_finance_qa import pages_server


def accessible_period(control):
    box = control.bounding_box()
    return bool(box and box['height'] >= 44 and control.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)') >= 16)


def verify_dashboard(page, view, width, check, exercise=True):
    root = page.locator('#view > .ux01-dashboard')
    expect(root).to_be_visible()
    select = root.locator('#dashboardPeriod')
    expect(select).to_be_visible()
    check(f'UX01/{view}: all canonical periods remain selectable', select.locator('option').evaluate_all('els=>els.map(e=>e.value)') == ['7', '30', 'month', 'year', 'all'])
    box = select.bounding_box()
    check(f'UX01/{view}: accessible compact period dropdown', accessible_period(select))
    check(f'UX01/{view}: no document overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    check(f'UX01/{view}: native periods delegate from one visible select', not root.locator('.admin-periods').is_visible() and page.locator('#dashboardPeriod').count() == 1)
    check(f'UX01/{view}: every detailed section remains', root.locator('.ux01-detail').count() == (13 if view == 'analytics' else 5))
    check(f'UX01/{view}: gold outline icons are real SVG', root.locator('.ux01-icon svg path,.ux01-icon svg rect').count() >= 5)
    colors = root.locator('.ux01-icon svg path,.ux01-icon svg rect').evaluate_all("els=>els.map(e=>getComputedStyle(e).stroke.match(/\\d+/g)?.slice(0,3).map(Number))")
    check(f'UX01/{view}: native KPI text styles cannot mute the gold SVG stroke', all(c and c[0]>c[1]>c[2] and c[0]>=190 and c[1]>=140 for c in colors))
    if view == 'analytics':
        check('UX01/analytics: four canonical KPI owners retained', root.locator('.analytics-kpis .kpi').count() == 4)
        # Canonical source remains in a closed disclosure; innerText is empty there.
        native_expense = root.locator('[data-analytics-operating-amount]')
        expected = native_expense.text_content() if native_expense.get_attribute('data-analytics-operating-established') == 'true' else '—'
        check('UX01/analytics: expense is the canonical acknowledged display, unknown stays unknown', root.locator('.ux01-projected-expense strong').text_content() == expected, expected=repr(expected), actual=repr(root.locator('.ux01-projected-expense strong').text_content()))
        check('UX01/analytics: completed count comes from the existing metric', root.locator('.ux01-projected-completed strong').inner_text() == root.locator('[data-analytics-completed-count]').text_content())
        expect(root.locator('.ux01-profit-hero').get_by_text('За внесеними витратами · облік може бути неповним', exact=True)).to_be_visible()
        check('UX01/analytics: trend uses actual finite points', len(root.locator('.analytics-trend-line').get_attribute('points').split()) > 1 and all(math.isfinite(float(n)) for point in root.locator('.analytics-trend-line').get_attribute('points').split() for n in point.split(',')))
    else:
        expect(root.locator('.ux01-finance-warning')).to_be_visible()
        check('UX01/finance: one summary retains all four metrics', root.locator('.finance-kpis').count() == 1 and root.locator('.finance-kpis .kpi').count() == 4)
        check('UX01/finance: one original expense action plus one delegated visible control', page.locator('#view #addExpense').count() == 1 and page.locator('#dashboardAddExpense').count() == 1)
        page.locator('#dashboardAddExpense').click()
        expect(page.locator('#expenseForm')).to_be_visible()
        page.locator('#expenseForm [data-close]').first.click()
        expect(page.locator('#expenseForm')).not_to_be_attached()
    if not exercise:
        return box
    # Each choice must survive the canonical rerender, not just change a label.
    for period in ['7', 'month', 'year', 'all', '30']:
        page.locator('#dashboardPeriod').select_option(period)
        expect(page.locator('#dashboardPeriod')).to_have_value(period)
        expect(page.locator(f'#view .admin-periods [data-analytics-period="{period}"]')).to_have_class('chip active')
        if period in ('month', 'year'):
            trigger = page.locator('#view .analytics-picker-trigger')
            expect(trigger).to_be_visible()
            trigger.click()
            expect(page.locator('#view .analytics-picker-popover:visible')).to_have_count(1)
            page.locator('#view .analytics-picker-close:visible').click()
    if width <= 900:
        page.locator('.native-search-options').click()
        sheet = page.locator('.v43-filter-sheet')
        expect(sheet).to_be_visible()
        expect(sheet.locator('.native-v2-sheet-action')).to_have_count(5)
        sheet.locator('.native-v2-sheet-action').first.click()
        expect(page.locator('#dashboardPeriod')).to_have_value('7')
        expect(sheet).not_to_be_attached()
        page.locator('#dashboardPeriod').select_option('30')
        check(f'UX01/{view}: existing mobile filter sheet still delegates all canonical period actions', True)
    page.locator('#dashboardPeriod').focus()
    page.locator('#dashboardPeriod').select_option('7')
    expect(page.locator('#dashboardPeriod')).to_be_focused()
    page.locator('#dashboardPeriod').select_option('30')
    expect(page.locator('#dashboardPeriod')).to_be_focused()
    page.locator('#dashboardPeriod').press('Tab')
    check(f'UX01/{view}: period rerender preserves keyboard focus and Tab reaches the next control', page.evaluate("document.activeElement.matches('button,summary,input,select') && document.activeElement.id!=='dashboardPeriod'"))
    first = page.locator('.ux01-detail').first
    if not first.get_attribute('open') == '':
        first.locator(':scope > summary').click()
    expect(first).to_have_attribute('open', '')
    page.locator('#dashboardPeriod').select_option('7')
    expect(page.locator('.ux01-detail').first).to_have_attribute('open', '')
    page.locator('#dashboardPeriod').select_option('30')
    check(f'UX01/{view}: disclosure choice survives period rerenders', page.locator('.ux01-detail').first.get_attribute('open') == '')
    if view == 'analytics':
        page.locator('[data-trend-metric="rentals"]').click()
        expect(page.locator('.analytics-trend-chart')).to_have_attribute('aria-label', 'Динаміка завершених оренд')
        expect(page.locator('#dashboardPeriod')).to_have_value('30')
        page.locator('[data-trend-metric="revenue"]').click()
    # Meaningful wrong-layout control: a too-small dropdown must be rejected.
    original_style = page.locator('#dashboardPeriod').get_attribute('style')
    page.locator('#dashboardPeriod').evaluate("e=>{for(const [k,v] of Object.entries({'min-height':'10px','height':'10px','padding':'0','line-height':'10px','font-size':'10px'}))e.style.setProperty(k,v,'important')}")
    check(f'UX01/{view}: a shrunken touch target is detected', not accessible_period(page.locator('#dashboardPeriod')))
    page.locator('#dashboardPeriod').evaluate("(e,s)=>s===null?e.removeAttribute('style'):e.setAttribute('style',s)", original_style)
    return box


def verify_financial_states(page, width, check, set_fixture, reset_fixture, spent_on, after_reload=lambda: None, capture_state=lambda name: None):
    """Change only the intercepted read response, never submit a business write."""
    scenarios = [
        ('unknown', [], False),
        ('investment-only', [{'id':'ux01-investment', 'spent_on':spent_on, 'category':'equipment', 'cost_type':'investment', 'amount':1200}], False),
        ('loss', [{'id':'ux01-loss', 'spent_on':spent_on, 'category':'chemistry', 'cost_type':'operating', 'amount':1000000}], False),
        ('zero-revenue-loss', [{'id':'ux01-zero', 'spent_on':spent_on, 'category':'chemistry', 'cost_type':'operating', 'amount':100}], True),
    ]
    for name, expenses, no_revenue in scenarios:
        set_fixture(expenses, no_revenue)
        page.reload()
        page.wait_for_selector('#view .booking-card,#view .upcoming-row,#view .empty')
        after_reload()
        idle.navigate(page, 'analytics')
        expect(page.locator('#dashboardPeriod')).to_be_visible()
        page.locator('#dashboardPeriod').select_option('30')
        expect(page.locator('#dashboardPeriod')).to_have_value('30')
        analytics = {
            'profit':page.locator('.ux01-profit-hero>strong').text_content(),
            'revenue':page.locator('.ux01-mini-kpi.kpi-revenue>strong').text_content(),
            'cost':page.locator('.ux01-projected-expense>strong').text_content(),
        }
        idle.navigate(page, 'finances')
        expect(page.locator('.ux01-finance-summary')).to_be_visible()
        summary = page.locator('.ux01-finance-summary')
        # Compare to the unmodified native method detail; no duplicate formula.
        canonical = page.locator('.finance-method>div>strong').all_text_contents()
        check(f'UX01/{name}/{width}: promoted profit and costs equal canonical method',
              summary.locator('.ux01-finance-profit>strong').text_content() == canonical[2]
              and summary.locator('.finance-cost>strong').text_content() == canonical[1]
              and summary.locator('.ux01-finance-components>.kpi').first.locator('strong').text_content() == canonical[0])
        check(f'UX01/{name}/{width}: both reports preserve the same source values',
              analytics == {'profit':canonical[2], 'revenue':canonical[0], 'cost':canonical[1]})
        expect(summary.locator('.ux01-finance-warning')).to_be_visible()
        check(f'UX01/{name}/{width}: no viewport or summary overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and summary.evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
        if name == 'unknown':
            expect(summary.locator('.ux01-finance-profit>strong')).to_have_text('—')
            expect(summary.locator('.finance-cost>strong')).to_have_text('—')
            expect(page.locator('.finance-onboarding')).to_be_visible()
            expect(page.locator('.ux01-margin-meter')).to_have_count(0)
            page.locator('#addFirstExpense').click()
            expect(page.locator('#expenseForm')).to_be_visible()
            page.locator('#expenseForm [data-close]').first.click()
        elif 'loss' in name:
            check(f'UX01/{name}/{width}: real loss retains negative amount and loss styling', canonical[2].startswith('-') and summary.locator('.finance-loss').count() == 1)
            expect(page.locator('.ux01-margin-meter')).to_have_count(0)
            if name == 'zero-revenue-loss':
                expect(summary.locator('.ux01-finance-margin>strong')).to_have_text('—')
        else:
            expect(summary.locator('.finance-cost>strong')).to_have_text('0 грн')
            check(f'UX01/{name}/{width}: investment remains separate', page.locator('.finance-investment-note>strong').text_content() != canonical[1])
        capture_state(name)
        if expenses:
            ledger = page.locator('.ux01-detail:has(.finance-ledger)')
            if ledger.get_attribute('open') is None:
                ledger.locator(':scope>summary').click()
            page.locator('#expenseCategoryFilter').select_option('repair')
            expect(page.locator('.expense-row')).to_have_count(0)
            page.locator('#expenseCategoryFilter').select_option('all')
            expect(page.locator('.expense-row')).to_have_count(len(expenses))
            page.locator('.expense-row').first.click()
            expect(page.locator('#expenseForm [name=amount]')).to_have_value(str(expenses[0]['amount']))
            expect(page.locator('#archiveExpense')).to_be_visible()
            page.locator('#expenseForm [data-close]').first.click()
            check(f'UX01/{name}/{width}: category filter and native edit form remain usable without writes', True)
            page.locator('#globalSearch').fill(str(expenses[0]['amount']))
            expect(page.locator('.global-search-layout')).to_be_visible()
            expect(page.locator('#dashboardAddExpense')).to_have_count(0)
            expect(page.locator('html')).not_to_have_attribute('data-ux01-ready', 'true')
            page.locator(f'[data-search-expense="{expenses[0]["id"]}"]').click()
            expect(page.locator('#expenseForm [name=amount]')).to_have_value(str(expenses[0]['amount']))
            page.locator('#expenseForm [data-close]').first.click()
            page.locator('#clearSearch').click()
            expect(page.locator('#dashboardPeriod')).to_be_visible()
            check(f'UX01/{name}/{width}: global expense search and return preserve native behavior without a leaked dashboard action', True)

    reset_fixture()
    page.reload()
    page.wait_for_selector('#view .booking-card,#view .upcoming-row,#view .empty')
    after_reload()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
    parser.add_argument('--widths', default='320,390,430,440,768,1024,1280,1440,1648')
    parser.add_argument('--artifacts', required=True)
    parser.add_argument('--local-fixtures', action='store_true')
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') != 'true' and not args.local_fixtures:
        parser.error('Local evidence must be explicitly marked --local-fixtures')
    out = Path(args.artifacts).resolve(); out.mkdir(parents=True, exist_ok=True)
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    results, forbidden, errors = [], [], []
    def check(name, ok, **extra):
        results.append({'name': name, 'passed': bool(ok), **extra})
        print(('PASS ' if ok else 'FAIL ') + name + ((' ' + json.dumps(extra, ensure_ascii=False)) if extra else ''), flush=True)
        if not ok and not page.is_closed():
            page.screenshot(path=str(out/'failure.png'))
        assert ok, name
    with pages_server(Path(args.root).resolve()) as base, sync_playwright() as pw:
        opts = {'headless': True}
        if args.browser == 'chromium':
            opts['args'] = ['--no-sandbox']
            opts['executable_path'] = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE', '/usr/bin/chromium')
        browser = getattr(pw, args.browser).launch(**opts)
        for width in map(int, args.widths.split(',')):
            context = browser.new_context(viewport={'width': width, 'height': 956 if width <= 440 else 1000}, service_workers='block', timezone_id='Europe/Kyiv')
            context.add_init_script(smoke.session_script() + ("Object.defineProperty(navigator,'standalone',{value:true})" if width <= 440 else ''))
            api = idle.fixtures(config, 414, 322, forbidden)
            def route_request(route):
                req = route.request
                if req.url.startswith(base + '/'):
                    return route.continue_()
                if req.url.startswith(smoke.SUPABASE_HOST):
                    if req.method == 'OPTIONS':
                        return route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'})
                    if urlsplit(req.url).path.startswith('/auth/v1/'):
                        return route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='{"id":"00000000-0000-4000-8000-000000000099"}')
                    return api(route)
                return route.abort()
            context.route('**/*', route_request)
            page = context.new_page(); page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/admin/bronuvannia/')
            page.wait_for_selector('#view .booking-card,#view .upcoming-row')
            previous = None
            for view in ['analytics', 'finances']:
                idle.navigate(page, view)
                box = verify_dashboard(page, view, width, check)
                if previous:
                    check(f'UX01/{width}: both period controls have identical dimensions', abs(box['width'] - previous['width']) <= 1 and abs(box['height'] - previous['height']) <= 1, analytics=previous, finances=box)
                previous = box
                page.locator('.main').evaluate('e=>e.scrollTop=0')
                page.screenshot(path=str(out/f'{view}-{width}.png'))
            idle.navigate(page, 'bookings')
            check(f'UX01/{width}: section action does not leak into global navigation', page.locator('#dashboardAddExpense').count() == 0)
            context.close()
        browser.close()
    check('UX01: no unintended writes', not forbidden, writes=forbidden)
    check('UX01: no browser errors', not errors, errors=errors)
    (out/'results.json').write_text(json.dumps({'checks': results, 'browser': args.browser, 'localFixtures': args.local_fixtures, 'pinnedAcceptance': os.environ.get('GITHUB_ACTIONS') == 'true'}, ensure_ascii=False, indent=2)+'\n')

if __name__ == '__main__':
    main()
