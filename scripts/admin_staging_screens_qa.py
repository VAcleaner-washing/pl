"""Generated R4 UI acceptance with synthetic HTTP fixtures and real user controls.

Remote CI only. This is not live-server persistence or physical iPhone acceptance.
All remote requests are intercepted; an unexpected route fails the test. Provider
integrations retain the real R4 boundary and are tested as explicitly unavailable.
"""
import argparse
import datetime
import json
import shutil
import tempfile
import time
import traceback
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright
from admin_entrypoint_finance_qa import pages_server
from admin_idle_qa import navigate

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', choices=['chromium', 'webkit'], required=True)
    parser.add_argument('--width', type=int, choices=[440, 1440], required=True)
    parser.add_argument('--artifacts', required=True)
    parser.add_argument('--phase', choices=['all', 'sections'], default='all',
                        help='Default retains every acceptance scenario; sections isolates the failed capture sequence')
    parser.add_argument('--repeat', type=int, default=1,
                        help='Explicit controlled repetitions in fresh contexts of the same browser process')
    args = parser.parse_args()
    if args.repeat < 1 or args.repeat > 5:
        parser.error('--repeat must be between 1 and 5')
    out = Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    fixture = json.loads((ROOT / 'staging/fixtures/mobile-layout.json').read_text())
    config = json.loads((ROOT / 'staging/hosted-r4-client.json').read_text())
    assert fixture['mode'] == 'synthetic-stage-layout-fixture'
    assert config['projectRef'] == 'jdthhqxzfpvosfdxwfem'
    issued = next(b for b in fixture['bookings'] if b['status'] == 'issued')
    complete = json.loads(json.dumps(issued))
    complete.update(id='00000000-0000-4000-8000-000000009060', status='completed',
                    customer_name='R4 QA · completed synthetic',
                    completed_at=fixture['fixedTime'])
    fixture['bookings'].append(complete)
    # The completed fixture is a separate rental of the same synthetic client,
    # allowing completed-only CRM history and revenue to be checked together.
    expected_revenue = int(complete['total_amount'])
    expenses = [{'id': '00000000-0000-4000-8000-000000009061',
                 'spent_on': '2026-11-11', 'created_at': fixture['fixedTime'],
                 'category': 'chemistry', 'cost_type': 'operating', 'amount': 123,
                 'vendor': 'R4 synthetic QA', 'note': 'Fixture only; no database row',
                 'archived': False}]
    calendar_start = datetime.datetime.fromisoformat(fixture['fixedTime']).date()
    calendar = [{'date': (calendar_start + datetime.timedelta(days=i)).isoformat(),
                 'resources': {key: {'label': key, 'capacity': 2, 'morning': 2, 'evening': 2}
                               for key in ['abir', 'jimmy', 'puzzi', 'sc2']}}
                for i in range(14)]
    results, requests, unexpected = [], [], []
    flags = {'campaign_fail': False, 'policy_fail_remaining': 0, 'policy_requests': 0,
             'waiver_fail': True, 'waiver_confirmed': False, 'waiver_payloads': []}
    held_profile_routes = []
    waiver_fixture = next(b for b in fixture['bookings'] if b['status'] == 'waiting_payment')

    def current_bookings():
        rows = json.loads(json.dumps(fixture['bookings']))
        if flags['waiver_confirmed']:
            row = next(b for b in rows if b['id'] == waiver_fixture['id'])
            row.update(status='confirmed', prepayment_paid=False, prepayment_amount=0)
            row.setdefault('extras', {})['prepayment_waiver'] = {'active': True}
        return rows
    diagnostic_events = []
    current = {'phase': None, 'iteration': 1, 'screenshot': None,
               'lastKnownDOM': None, 'crashed': False}

    def resource_snapshot():
        evidence = {}
        for name in ['memory.current', 'memory.peak', 'memory.max', 'memory.events']:
            try:
                evidence[name] = (Path('/sys/fs/cgroup') / name).read_text().strip()
            except OSError:
                evidence[name] = 'unavailable'
        processes = []
        try:
            for directory in Path('/proc').iterdir():
                if not directory.name.isdigit():
                    continue
                try:
                    fields = dict(line.split(':', 1) for line in
                                  (directory / 'status').read_text().splitlines() if ':' in line)
                    rss = int(fields.get('VmRSS', '0 kB').split()[0])
                    processes.append({'pid': int(directory.name),
                                      'ppid': int(fields.get('PPid', '0').strip()),
                                      'name': fields.get('Name', '').strip(), 'rssKiB': rss})
                except (OSError, ValueError):
                    continue
            evidence['largestProcesses'] = sorted(processes,
                                                  key=lambda row: row['rssKiB'], reverse=True)[:12]
        except OSError:
            evidence['largestProcesses'] = 'unavailable'
        return evidence

    def diagnostic(event, **details):
        row = {'event': event, 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'monotonic': time.monotonic(), 'phase': current['phase'],
               'iteration': current['iteration'], 'screenshot': current['screenshot'],
               'resources': resource_snapshot(), **details}
        diagnostic_events.append(row)
        print('DIAGNOSTIC ' + json.dumps(row, ensure_ascii=False), flush=True)

    def artifact_name(name):
        return f'repeat{current["iteration"]}-{name}' if args.repeat > 1 else name

    def check(name, passed, **evidence):
        results.append({'name': name, 'passed': bool(passed), **evidence})
        print(('PASS: ' if passed else 'FAIL: ') + name, flush=True)

    def api(route):
        req = route.request
        url = urlsplit(req.url)
        if url.hostname in ['127.0.0.1', 'localhost']:
            return route.continue_()
        headers = {'Access-Control-Allow-Origin': '*',
                   'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
                   'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                   'Cache-Control': 'no-store'}
        if url.scheme + '://' + url.netloc != config['origin']:
            unexpected.append({'path': url.path, 'method': req.method})
            return route.abort()
        if req.method == 'OPTIONS':
            return route.fulfill(status=204, headers=headers)
        payload = (req.post_data_json or {}) if req.method == 'POST' else {}
        action = payload.get('action')
        requests.append({'path': url.path, 'action': action, 'method': req.method})
        status = 200
        if url.path == '/auth/v1/settings':
            flags['policy_requests'] += 1
            if flags['policy_fail_remaining']:
                flags['policy_fail_remaining'] -= 1
                return route.abort()
            body = {'disable_signup': True}
        elif url.path == '/auth/v1/token':
            assert payload.get('email') == 'manager-a@vacleaner-r4.invalid'
            body = {'access_token': 'r4-screens-synthetic-token',
                    'refresh_token': 'r4-screens-synthetic-refresh',
                    'expires_in': 3600, 'token_type': 'bearer',
                    'user': {'id': '00000000-0000-4000-8000-000000000061',
                             'email': 'manager-a@vacleaner-r4.invalid'}}
        elif url.path.endswith('/vacleaner-settings'):
            body = fixture['settings'] if req.method == 'GET' else {'error': 'service_error'}
            if req.method != 'GET': status = 503
        elif action == 'list': body = {'bookings': current_bookings(), 'expenses': expenses}
        elif action == 'confirm_without_prepayment' and url.path.endswith('/vacleaner-prepayment-waiver-v1'):
            flags['waiver_payloads'].append(payload)
            if flags['waiver_fail']:
                body, status = {'error': 'service_error'}, 503
                flags['waiver_fail'] = False
            else:
                flags['waiver_confirmed'] = True
                body = {'prepaymentWaiver': True, 'booking': next(b for b in current_bookings() if b['id'] == waiver_fixture['id'])}
        elif action == 'calendar': body = {'days': calendar}
        elif action == 'clients': body = {'customers': []}
        elif action == 'campaigns':
            body = {'error': 'service_error'} if flags['campaign_fail'] else {'campaigns': []}
            if flags['campaign_fail']: status = 503
        elif action == 'referrals_expiring': body = {'rewards': []}
        elif action == 'referral_analytics':
            body = {'messages': [], 'uses': [], 'rewards': [], 'customers': [], 'bookings': []}
        elif action == 'referral_summary':
            body = {'referral': {'code': 'VA-R4QA060', 'completedReferrals': 0,
                                'inviteCount': 0, 'earnedRewardAmount': 0,
                                'activeRewardAmount': 0, 'activeRewardCount': 0,
                                'activeRewards': [], 'referrals': [], 'rewards': [],
                                'profile': {'instagram': 'r4_synthetic',
                                            'preferred_contact': 'instagram'}}}
        elif action == 'lookup_customer':
            if current['phase'] == 'profile-race':
                # Leave this one genuine HTTP fixture request pending until the
                # administrator has interacted with the actual process form.
                held_profile_routes.append({'route': route, 'headers': headers,
                                            'phone': payload.get('phone')})
                return
            body = {'customer': None}
        elif action == 'audit_log': body = {'entries': []}
        elif action == 'health':
            body = {'reservation': {'healthy': True},
                    'push': {'healthy': False, 'configReady': False, 'activeSubscriptions': 0}}
        elif parse_qs(url.query).get('action') == ['view'] and url.path.endswith('/vacleaner-customer-documents-v1'):
            body = {'document': None}
        elif action in ['save_customer', 'save_expense', 'create_campaign']:
            body, status = {'error': 'service_error'}, 503
        else:
            unexpected.append({'path': url.path, 'action': action, 'method': req.method})
            return route.abort()
        return route.fulfill(status=status, headers=headers, content_type='application/json',
                             body=json.dumps(body))

    def screenshot(page, name):
        current['screenshot'] = name
        # This snapshot is captured BEFORE requesting a screenshot, and retained
        # in Python. A crash handler never asks a dead WebProcess for its DOM.
        current['lastKnownDOM'] = page.evaluate('''()=>({
          adminView:document.documentElement.dataset.adminView,
          readyState:document.readyState,visibility:document.visibilityState,
          viewport:{width:innerWidth,height:innerHeight},
          nodes:document.querySelectorAll('*').length,
          viewChildren:document.querySelector('#view')?.children.length,
          pageTitle:document.querySelector('#pageTitle')?.textContent,
          rootScrollWidth:document.documentElement.scrollWidth,
          mainScrollTop:document.querySelector('.main')?.scrollTop,
          activeAnimations:document.getAnimations().map(a=>({state:a.playState,
             duration:a.effect?.getComputedTiming().duration})),
          fontsStatus:document.fonts.status
        })''')
        diagnostic('before-screenshot', lastKnownDOM=current['lastKnownDOM'])
        page.screenshot(path=str(out / (artifact_name(name) + '.png')))
        diagnostic('after-screenshot', lastKnownDOM=current['lastKnownDOM'])
        current['screenshot'] = None

    def surface(page, name, selector='#view'):
        expect(page.locator(selector)).to_be_visible()
        geometry = page.locator(selector).evaluate('''el=>{
          const r=el.getBoundingClientRect();return {left:r.left,right:r.right,
            scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,viewport:innerWidth,
            rootScroll:document.documentElement.scrollWidth};}''')
        check(name + ': no page/surface horizontal overflow',
              geometry['rootScroll'] <= args.width + 1 and
              geometry['scrollWidth'] <= geometry['clientWidth'] + 1,
              geometry=geometry)
        screenshot(page, name)

    def close(page, form, discard=False):
        form.locator('header [data-close]').click()
        if discard:
            expect(page.locator('#labLeaveDialog')).to_be_visible()
            page.locator('#labLeaveDialog [data-lab-discard]').click()
        expect(form).to_have_count(0)

    def rejected(page, form, field, value, message='Сервіс тимчасово недоступний'):
        field.fill(value)
        submit = form.locator('[type=submit]')
        submit.click()
        expect(submit).to_be_enabled()
        expect(field).to_have_value(value)
        expect(form).to_be_visible()
        expect(page.locator('.toast').last).to_have_text(message)
        check(form.get_attribute('id') + ': rejected save retains draft and usable action', True)

    def sections(page):
        names = ['upcoming', 'bookings', 'calendar', 'equipment', 'clients',
                 'campaigns', 'finances', 'analytics', 'chemistry', 'settings']
        for name in names:
            diagnostic('before-navigation', targetView=name)
            navigate(page, name)
            diagnostic('after-navigation', targetView=name)
            surface(page, 'section-' + name)
        check('all ten current admin sections are reachable through real navigation', True)

    def clients(page):
        navigate(page, 'clients')
        page.locator('#clientSort').select_option('name')
        page.locator('#clientSegment').select_option('repeat')
        expect(page.locator('.clients-empty')).to_be_visible()
        page.locator('#clientSegment').select_option('all')
        before = len(requests)
        page.locator('.client-row-open .client-name').first.click()
        form = page.locator('#clientEditor')
        expect(form).to_be_visible()
        expect(form.locator('details.client-secondary-section[open]')).to_have_count(0)
        check('client closed disclosures initiate no secondary HTTP reads',
              not [r for r in requests[before:] if r['action'] in
                   ['lookup_customer', 'referral_summary', 'view', 'customer_sms_history']])
        benefits = form.locator('details.client-secondary-section').filter(has_text='Бонуси й referral')
        benefits.locator('summary').click()
        expect(form.locator('#clientReferralInfo')).to_contain_text('VA-R4QA060')
        expect(form.locator('#clientPromoInfo')).to_contain_text('Активних персональних бонусів немає')
        count = sum(r['action'] == 'referral_summary' for r in requests)
        benefits.locator('summary').click(); benefits.locator('summary').click()
        check('client benefits reuse the completed read within this card',
              sum(r['action'] == 'referral_summary' for r in requests) == count)
        doc = form.locator('details.client-secondary-section').filter(has_text='Документ')
        doc.locator('summary').click()
        expect(form.locator('#clientDocumentPreview')).to_contain_text('Фото документа ще не додано')
        sms = form.locator('details.client-secondary-section').filter(has_text='SMS')
        sms.locator('summary').click()
        expect(form.locator('#clientSmsHistory')).to_contain_text('інтеграція вимкнена')
        expect(sms.locator('[data-client-read-retry]')).to_be_visible()
        check('blocked SMS read is an explicit error with retry, not fake empty history', True)
        surface(page, 'client-secondary-states', '#clientEditor')
        form.locator('#clientContactEdit').click()
        rejected(page, form, form.locator('[name=customerName]'), 'R4 QA unsaved synthetic name')
        close(page, form, discard=True)
        page.locator('.client-row-open .client-name').first.click()
        expect(page.locator('#clientEditor')).not_to_contain_text('R4 QA unsaved synthetic name')
        check('reopening client after rejected save uses the original authoritative record', True)

    def referral(page):
        navigate(page, 'clients')
        page.locator('.client-row-open .client-name').first.click()
        form = page.locator('#clientEditor')
        benefits = form.locator('details.client-secondary-section').filter(has_text='Бонуси й referral')
        benefits.locator('summary').click()
        expect(form.locator('#clientReferralInfo')).to_contain_text('VA-R4QA060')
        form.locator('#clientOpenReferralDetails').click()
        modal = page.locator('.referral-share-modal')
        expect(modal).to_be_visible()
        expect(modal.locator('.referral-code-card strong')).to_have_text('VA-R4QA060')
        expect(modal.locator('.referral-empty-state')).to_contain_text('Поки що рекомендацій немає')
        before = len(requests)
        page.once('dialog', lambda dialog: dialog.accept())
        modal.locator('[data-referral-send=instagram]').click()
        expect(modal.locator('#referralActionStatus')).to_contain_text('Ще не надіслано')
        check('R4 blocked referral dispatch never records a sent event', len(requests) == before)
        surface(page, 'referral-modal', '.referral-share-modal')
        modal.locator('footer [data-close]').click()
        expect(modal).to_have_count(0)

    def catalog(page):
        for name in ['equipment', 'chemistry']:
            navigate(page, name)
            page.get_by_role('button', name='Редагувати ціни', exact=True).click()
            form = page.locator('#catalogForm')
            expect(form).to_be_visible()
            if name == 'equipment':
                rejected(page, form, form.locator('[name=puzzi_weekday]'), '1000',
                         'Не вдалося зберегти налаштування. Спробуйте ще раз.')
                surface(page, 'catalog-rejected-draft', '#catalogForm')
                close(page, form, discard=True)
            else:
                expect(form.locator('[name=puzzi_weekday]')).to_have_value(
                    str(fixture['settings']['catalog']['products']['puzzi']['weekday']))
                close(page, form)
        check('equipment and chemistry share the catalog editor without accepting failed changes', True)

    def finance(page):
        navigate(page, 'finances')
        numbers = page.locator('.finance-kpis>.kpi>strong').all_text_contents()
        clean = lambda value: ''.join(c for c in value if c.isdigit() or c == '-')
        check('finance shows exact fixture revenue / operating cost / profit',
              [clean(x) for x in numbers[:3]] ==
              [str(expected_revenue), '123', str(expected_revenue - 123)], values=numbers)
        for period in ['7', '30', 'month', 'year', 'all']:
            page.locator(f'[data-analytics-period="{period}"]').click()
            expect(page.locator('.finance-kpis')).to_be_visible()
        page.locator('#addExpense').click()
        form = page.locator('#expenseForm')
        form.locator('[type=submit]').click()
        expect(form.locator('[aria-invalid=true]').first).to_be_visible()
        form.locator('[name=note]').fill('R4 QA fixture-only expense')
        rejected(page, form, form.locator('[name=amount]'), '321')
        close(page, form, discard=True)
        expect(page.locator('#view')).not_to_contain_text('R4 QA fixture-only expense')
        check('failed expense never appears in confirmed finance rows', True)

    def analytics(page):
        navigate(page, 'analytics')
        for period in ['7', '30', 'month', 'year', 'all']:
            page.locator(f'[data-analytics-period="{period}"]').click()
            expect(page.locator('.analytics-trend-panel')).to_be_visible()
            if period in ['month', 'year']:
                prefix = 'Month' if period == 'month' else 'Year'
                page.locator('#analytics' + prefix + 'Picker').click()
                popover = page.locator('#analytics' + prefix + 'Popover')
                expect(popover).to_be_visible()
                popover.locator('[data-analytics-picker-close]').click()
                expect(popover).not_to_be_visible()
        page.locator('[data-trend-metric=rentals]').click()
        page.locator('[data-trend-metric=revenue]').click()
        expect(page.locator('.referral-analytics-panel')).to_be_visible()
        text = page.locator('#view').inner_text()
        check('analytics contains no NaN/undefined or fabricated referral successes',
              'NaN' not in text and 'undefined' not in text and
              page.locator('.referral-analytics-panel').count() == 1)
        surface(page, 'analytics-periods-and-empty-referral')

    def campaigns(page):
        navigate(page, 'campaigns')
        expect(page.locator('[data-campaigns-unavailable]')).to_be_visible()
        expect(page.locator('#view')).not_to_contain_text('Кампаній ще немає')
        flags['campaign_fail'] = False
        page.locator('[data-retry-module=campaigns]').click()
        expect(page.locator('[data-campaigns-unavailable]')).to_have_count(0)
        check('campaign failed read is distinct from empty success and retries explicitly', True)
        page.locator('#newCampaign').click()
        form = page.locator('#campaignForm')
        for kind in ['product', 'personal', 'weekday', 'return']:
            form.locator('[name=campaignType]').select_option(kind)
            expect(form.locator('.campaign-product-field')).to_be_visible() if kind == 'product' else expect(form.locator('.campaign-product-field')).not_to_be_visible()
            expect(form.locator('.campaign-phone-field')).to_be_visible() if kind == 'personal' else expect(form.locator('.campaign-phone-field')).not_to_be_visible()
        rejected(page, form, form.locator('[name=name]'), 'R4 QA fixture-only campaign')
        close(page, form, discard=True)
        page.locator('#smsCampaign').click()
        modal = page.locator('.sms-campaign-modal')
        expect(modal.locator('#smsAudienceRetry')).to_be_visible()
        expect(modal).to_contain_text('інтеграція вимкнена')
        expect(modal.locator('#smsPrimary')).to_be_disabled()
        check('SMS bootstrap/audience failure is visible and cannot dispatch', True)
        surface(page, 'sms-unavailable', '.sms-campaign-modal')

    def settings(page):
        navigate(page, 'settings')
        for tab in ['rental', 'delivery', 'equipment', 'notifications', 'system']:
            page.locator(f'[data-settings-tab="{tab}"]').click()
            expect(page.locator(f'[data-settings-panel="{tab}"]')).to_be_visible()
            expect(page.locator('[data-settings-panel]:visible')).to_have_count(1)
            surface(page, 'settings-' + tab)
        page.locator('[data-settings-tab=notifications]').click()
        page.once('dialog', lambda dialog: dialog.accept())
        page.locator('#notificationToggle').click()
        check('R4 notification test is blocked without sending', True)
        page.locator('[data-settings-tab=delivery]').click()
        form = page.locator('#deliveryFeeForm')
        prior = page.evaluate("window.VA_STAGE_STORAGE.local.getItem('vacleaner_delivery_pricing')")
        rejected(page, form, form.locator('[name=deliveryLocal]'), '333',
                 'Не вдалося зберегти налаштування. Спробуйте ще раз.')
        check('rejected delivery setting preserves last acknowledged cache',
              page.evaluate("window.VA_STAGE_STORAGE.local.getItem('vacleaner_delivery_pricing')") == prior)
        # Navigate away through the normal dirty-form confirmation, then measure
        # the independent repeated-mount lifecycle from a fresh clean form.
        destination = page.locator('.mobile-nav [data-mobile-view=bookings]' if args.width == 440 else '.nav [data-view=bookings]')
        destination.click()
        expect(page.locator('#labLeaveDialog')).to_be_visible()
        page.locator('#labLeaveDialog [data-lab-discard]').click()
        expect(page.locator('#labLeaveDialog')).to_have_count(0)
        start = page.evaluate('window.__screenResizeListeners.size')
        for _ in range(5):
            navigate(page, 'settings'); navigate(page, 'bookings')
        end = page.evaluate('window.__screenResizeListeners.size')
        check('repeated settings mount/unmount does not accumulate global resize callbacks',
              end <= start + 1, before=start, after=end)

    def booking_time(page):
        page.locator('#mobileNewBooking' if args.width == 440 else '#newBooking').click()
        form = page.locator('#bookingForm')
        expect(form).to_be_visible()
        pickup = form.locator('[name=pickupTime]')
        trigger = pickup.locator('..').locator('.admin-v4315-time-trigger')
        trigger.click()
        overlay = page.locator('.admin-v4315-time-overlay')
        expect(overlay).to_be_visible()
        values = []
        for period in ['morning', 'day', 'evening']:
            overlay.locator(f'[data-time-period="{period}"]').click()
            choices = overlay.locator('.admin-v4315-time-option:not([hidden])')
            values += choices.evaluate_all('els=>els.map(el=>el.dataset.time)')
            choices.last.click(trial=True)
        check('time picker exposes all 29 canonical half-hour choices through real periods',
              len(values) == len(set(values)) == 29 and values[0] == '07:00' and values[-1] == '21:00')
        overlay.locator('[data-time-period=day]').click()
        overlay.locator('[data-time="16:30"]').click()
        expect(pickup).to_have_value('16:30')
        trigger.click()
        expect(overlay.locator('[data-time-period=day]')).to_have_attribute('aria-pressed', 'true')
        page.keyboard.press('Escape')
        expect(overlay).not_to_be_visible()
        expect(trigger).to_be_focused()
        check('selected time reopens in its group; Escape restores focus in the parent form', True)
        close(page, form, discard=True)

    def policy_recovery(page):
        expect(page.locator('.lab-banner [role=status]')).to_have_text('Тестові дані · сервер')
        check('initial policy fetch failure recovers through actual login without reload',
              flags['policy_requests'] == 2, policyRequests=flags['policy_requests'])
        screenshot(page, 'policy-recovered')

    def waiver(page):
        navigate(page, 'bookings')
        card = page.locator(f'.booking-card[data-id="{waiver_fixture["id"]}"]')
        card.locator('[data-action=process]').click()
        form = page.locator('#processForm')
        expect(form).to_be_visible()
        form.locator('[name=contacted]').check()
        form.locator('[name=confirmationSent]').check()
        if form.get_attribute('data-documents-required') == '1':
            form.locator('[name=documentNumber]').fill('R4-QA-6092')
            form.locator('[name=identityVerified]').check()
        form.locator('[name=prepaymentWaived]').check()
        confirm = form.locator('#confirmProcess')
        expect(confirm).to_be_enabled()
        expect(confirm).to_have_text('Підтвердити без 200 грн')
        confirm.click()
        expect(form.locator('.prepayment-waiver-status')).to_contain_text(
            'Не вдалося підтвердити без передоплати. Спробуйте ще раз.')
        expect(confirm).to_be_enabled()
        expect(form.locator('[name=prepaymentWaived]')).to_be_checked()
        check('waiver rejection preserves explicit choice and allows a deliberate retry',
              len(flags['waiver_payloads']) == 1 and not flags['waiver_confirmed'])
        check('waiver actual UI payload reaches its exact isolated canonical route',
              flags['waiver_payloads'][0]['contacted'] is True and
              flags['waiver_payloads'][0]['confirmationSent'] is True and
              flags['waiver_payloads'][0]['bookingCode'] == waiver_fixture['booking_code'])
        unexpected_dialogs = []
        def dialog_handler(dialog):
            unexpected_dialogs.append(dialog.type)
            dialog.dismiss()
        page.on('dialog', dialog_handler)
        confirm.click()
        expect(form).to_have_count(0)
        # Acknowledged confirmation reloads the page. A disappeared old form
        # precedes the next mount; wait for the real navigation before its
        # desktop/mobile visibility branch, rather than racing that mount.
        navigation = '.mobile-nav [data-mobile-view=bookings]' if args.width == 440 else '.nav [data-view=bookings]'
        expect(page.locator(navigation)).to_be_visible()
        navigate(page, 'bookings')
        confirmed = page.locator(f'.booking-card[data-id="{waiver_fixture["id"]}"]')
        expect(confirmed.locator('.status')).to_contain_text('Підтверджена')
        check('acknowledged waiver reloads into authoritative confirmed state without an unsaved/busy warning',
              not unexpected_dialogs and len(flags['waiver_payloads']) == 2,
              dialogs=unexpected_dialogs)
        screenshot(page, 'waiver-confirmed-without-fake200')

    def profile_race(page):
        navigate(page, 'bookings')
        row = next(b for b in fixture['bookings'] if b['status'] == 'pending')
        card = page.locator(f'.booking-card[data-id="{row["id"]}"]')
        customer = {'name': 'R61 SERVER PROFILE', 'address': 'R61 server address',
                    'documentType': 'ID-картка', 'documentNumber': 'SERVER-R61-1234',
                    'documentVerifiedAt': fixture['fixedTime'], 'hasDocument': True,
                    'isRepeatCustomer': True, 'completedOrders': 2}

        def open_pending():
            with page.expect_request(lambda request: request.method == 'POST' and
                                     request.post_data_json and
                                     request.post_data_json.get('action') == 'lookup_customer'):
                card.locator('[data-action=process]').click()
            form = page.locator('#processForm')
            expect(form).to_be_visible()
            expect(form.locator('#documentProfileState')).to_contain_text('Перевіряємо історію')
            return form

        def release_profile():
            assert len(held_profile_routes) == 1, 'Exactly one actual profile request must be held'
            held = held_profile_routes.pop()
            assert held['phone'] == row['customer_phone']
            held['route'].fulfill(status=200, headers=held['headers'],
                                  content_type='application/json',
                                  body=json.dumps({'customer': customer}))

        form = open_pending()
        manual = {'customerName': 'R61 HAND TYPED NAME',
                  'customerAddress': 'R61 hand typed address',
                  'documentNumber': 'MANUAL-R61-9876'}
        for name, value in manual.items():
            form.locator(f'[name={name}]').fill(value)
        form.locator('[name=documentType]').select_option(label='Водійське посвідчення')
        # Record an intentional unchecked state, rather than merely observing
        # the checkbox's original default before the delayed server response.
        form.locator('[name=identityVerified]').check()
        form.locator('[name=identityVerified]').uncheck()
        release_profile()
        expect(form.locator('#documentProfileState')).to_contain_text('Ваші ручні зміни збережено')
        for name, value in manual.items():
            expect(form.locator(f'[name={name}]')).to_have_value(value)
        expect(form.locator('[name=documentType]')).to_have_value('Водійське посвідчення')
        expect(form.locator('[name=identityVerified]')).not_to_be_checked()
        expect(form).to_have_attribute('data-documents-required', '0')
        check('late process profile preserves all five manually edited fields including unchecked identity', True)
        close(page, form, discard=True)

        form = open_pending()
        release_profile()
        expect(form.locator('#documentProfileState')).to_contain_text('Документи є в базі')
        for name, key in [('customerName', 'name'), ('customerAddress', 'address'),
                          ('documentType', 'documentType'), ('documentNumber', 'documentNumber')]:
            expect(form.locator(f'[name={name}]')).to_have_value(customer[key])
        expect(form.locator('[name=identityVerified]')).to_be_checked()
        expect(form).to_have_attribute('data-documents-required', '0')
        check('untouched process fields still autofill from the actual delayed profile response', True)
        form.locator('[name=customerPhone]').fill('+380000009961')
        expect(form.locator('#documentProfileState')).to_contain_text('Потрібна перевірка клієнта')
        expect(form.locator('[name=identityVerified]')).not_to_be_checked()
        expect(form).to_have_attribute('data-documents-required', '1')
        check('changing phone after autofill clears only unedited identity authority and requests manual verification', True)
        close(page, form, discard=True)

        form = open_pending()
        form.locator('[name=customerPhone]').fill('+380000009962')
        form.locator('[name=customerName]').fill('R61 NEW PHONE MANUAL NAME')
        # Observe the actual response-driven status mutation. This avoids a
        # pre-existing error label satisfying the assertion before delivery.
        form.locator('#documentProfileState').evaluate('''node=>{
          window.__r61ProfileMutations=0;
          window.__r61ProfileObserver=new MutationObserver(()=>window.__r61ProfileMutations++);
          window.__r61ProfileObserver.observe(node,{childList:true,subtree:true});
        }''')
        release_profile()
        page.wait_for_function('()=>window.__r61ProfileMutations>0')
        page.evaluate('window.__r61ProfileObserver.disconnect()')
        expect(form.locator('#documentProfileState')).to_contain_text('Потрібна перевірка клієнта')
        expect(form.locator('[name=customerName]')).to_have_value('R61 NEW PHONE MANUAL NAME')
        expect(form.locator('[name=documentNumber]')).to_have_value('')
        expect(form.locator('[name=identityVerified]')).not_to_be_checked()
        expect(form).to_have_attribute('data-documents-required', '1')
        check('late response for the previous phone cannot supply identity or overwrite the current process client', True)
        close(page, form, discard=True)
        check('every deliberately held process profile request was explicitly delivered', not held_profile_routes)

    phases = [('policy-recovery', policy_recovery), ('sections', sections), ('clients', clients), ('referral', referral),
              ('catalog', catalog), ('finance', finance), ('analytics', analytics),
              ('campaigns', campaigns), ('settings', settings), ('booking-time', booking_time), ('waiver', waiver),
              ('profile-race', profile_race)]
    selected_phases = phases if args.phase == 'all' else [phase for phase in phases if phase[0] == args.phase]
    runs = [(iteration, name, run) for iteration in range(1, args.repeat + 1)
            for name, run in selected_phases]
    with tempfile.TemporaryDirectory(prefix='r4-screens-', dir=ROOT / 'staging-ui-test-results') as temp:
        shutil.copytree(ROOT / 'staging-ui-test-results/dist', Path(temp) / 'r4')
        with pages_server(Path(temp)) as base, sync_playwright() as pw:
            options = {'headless': True}
            if args.browser == 'chromium': options['args'] = ['--no-sandbox']
            browser = getattr(pw, args.browser).launch(**options)
            for iteration, name, run in runs:
                current.update(phase=name, iteration=iteration, screenshot=None,
                               lastKnownDOM=None, crashed=False)
                diagnostic('before-phase')
                flags['campaign_fail'] = name == 'campaigns'
                flags['policy_fail_remaining'] = 1 if name == 'policy-recovery' else 0
                flags['policy_requests'] = 0
                device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items()
                          if k != 'default_browser_type'} if args.width == 440 else {}
                device.update(viewport={'width': args.width, 'height': 956},
                              service_workers='block', timezone_id='Europe/Kyiv')
                context = browser.new_context(**device)
                context.tracing.start(screenshots=True, snapshots=True, sources=True)
                context.route('**/*', api)
                context.add_init_script('''(() => {
                  window.__screenResizeListeners=new Set();
                  const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
                  window.addEventListener=(type,listener,opts)=>{if(type==='resize')window.__screenResizeListeners.add(listener);return add(type,listener,opts)};
                  window.removeEventListener=(type,listener,opts)=>{if(type==='resize')window.__screenResizeListeners.delete(listener);return remove(type,listener,opts)};
                })()''')
                if args.width == 440:
                    context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                def on_crash():
                    current['crashed'] = True
                    print('PAGE_CRASH ' + name, flush=True)
                    diagnostic('page-crash', lastKnownDOM=current['lastKnownDOM'])
                page.on('crash', on_crash)
                page.clock.set_fixed_time(datetime.datetime.fromisoformat(fixture['fixedTime']))
                print('PHASE: ' + name, flush=True)
                scenario_failed = False
                try:
                    page.goto(base + '/r4/admin/bronuvannia/')
                    expect(page.locator('#authForm')).to_be_visible()
                    if name == 'policy-recovery':
                        expect(page.locator('.lab-banner [role=status]')).to_have_text('Тестовий вхід закрито')
                        screenshot(page, 'policy-initial-unavailable')
                    page.locator('#authForm [name=login]').fill('manager-a')
                    page.locator('#authForm [name=password]').fill('r4-synthetic-fixture-password')
                    page.locator('#authForm [type=submit]').click()
                    expect(page.locator('.booking-card,.upcoming-row').first).to_be_visible()
                    expect(page.locator('html')).to_have_attribute('data-admin-lab', 'staging')
                    run(page)
                except Exception as error:
                    scenario_failed = True
                    check(name + ': scenario completed', False, error=str(error), trace=traceback.format_exc())
                    diagnostic('scenario-failure', error=str(error),
                               lastKnownDOM=current['lastKnownDOM'])
                    if not current['crashed'] and not page.is_closed():
                        try: screenshot(page, name + '-failure')
                        except Exception as capture_error:
                            diagnostic('failure-screenshot-unavailable', error=str(capture_error))
                finally:
                    check(name + ': no uncaught application errors', not errors, errors=errors)
                    try:
                        if scenario_failed or name == 'sections':
                            trace_path = out / (artifact_name(name) + '-trace.zip')
                            context.tracing.stop(path=str(trace_path))
                            diagnostic('trace-saved', artifact=trace_path.name)
                        else:
                            context.tracing.stop()
                    except Exception as trace_error:
                        diagnostic('trace-unavailable', error=str(trace_error))
                    context.close()
                    diagnostic('after-phase', crashed=current['crashed'])
            browser.close()
    check('all external requests were intercepted; no unexpected API or provider request',
          not unexpected, unexpected=unexpected)
    summary = {'browser': args.browser, 'width': args.width, 'phase': args.phase,
               'repeat': args.repeat,
               'passed': sum(row['passed'] for row in results),
               'failed': sum(not row['passed'] for row in results), 'checks': results,
               'requests': requests, 'fixtureRevenue': expected_revenue,
               'network': 'No remote request forwarded; synthetic fixture only',
               'liveWrites': False, 'physicalIphone': False}
    (out / 'result.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    (out / 'diagnostics.json').write_text(json.dumps(diagnostic_events, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: summary[k] for k in ['browser', 'width', 'passed', 'failed']}), flush=True)
    return int(bool(summary['failed']))


if __name__ == '__main__':
    raise SystemExit(main())
