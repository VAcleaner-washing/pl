"""CI-only acceptance of the generated R4 UI against the real isolated server.

Credentials arrive in memory from the run-bound CI identity broker. No production
request, synthetic API response, browser trace, HAR, storage dump or credential
artifact is permitted. The only intercepted business response is deliberately
lost AFTER the server has committed this run's own synthetic booking.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright
from admin_entrypoint_finance_qa import pages_server

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'jdthhqxzfpvosfdxwfem'
ORIGIN = 'https://' + PROJECT + '.supabase.co'
FUNCTIONS = {
    'vacleaner-admin-bookings-v4', 'vacleaner-admin-data-v1', 'vacleaner-settings',
    'vacleaner-extend-rental-v1', 'vacleaner-status-correction-v1',
    'vacleaner-customer-documents-v1', 'vacleaner-prepayment-waiver-v1',
}
READS = {'list', 'calendar', 'clients', 'campaigns', 'health', 'lookup_customer',
         'referrals_expiring', 'referral_analytics', 'referral_summary', 'audit_log'}


def normalized_phone(value):
    return ''.join(character for character in str(value or '') if character.isdigit())


class ConnectedRun:
    def __init__(self, args):
        self.args = args
        self.out = Path(args.artifacts).resolve()
        self.out.mkdir(parents=True, exist_ok=True)
        assert os.environ.get('GITHUB_ACTIONS') == 'true', 'Remote CI only'
        raw = os.environ.pop('VA_R61_CONNECTED_CONFIG', '')
        assert raw, 'Run-bound connected configuration is required'
        self.config = json.loads(raw)
        del raw
        assert self.config.get('projectRef') == PROJECT
        assert self.config.get('origin') == ORIGIN
        self.run_id = str(self.config.get('runId', ''))
        assert re.fullmatch(r'\d{5,20}', self.run_id)
        assert self.run_id == os.environ.get('GITHUB_RUN_ID')
        cohort = str(self.config.get('cohort', ''))
        assert cohort.startswith('R61') and 4 <= len(cohort) <= 70
        assert re.fullmatch(r'[A-Za-z0-9 _:-]+', cohort)
        self.accounts = self.config.get('accounts', [])
        assert len(self.accounts) == 2
        assert [account['email'] for account in self.accounts] == [
            f'r61-ci-{self.run_id}-a@vacleaner-r4.invalid',
            f'r61-ci-{self.run_id}-b@vacleaner-r4.invalid'], 'Exact run-bound CI identities are required'
        assert all(len(account['password']) >= 16 for account in self.accounts)
        self.secrets = [account['password'] for account in self.accounts]
        self.public = json.loads((ROOT / 'staging/hosted-r4-client.json').read_text())
        assert self.public['projectRef'] == PROJECT and self.public['origin'] == ORIGIN
        assert set(self.public['functions']) == FUNCTIONS
        self.name = cohort + ' ' + args.browser
        suffix = int(hashlib.sha256((self.run_id + args.browser).encode()).hexdigest()[:10], 16) % 1000000
        self.phone = '+380000' + f'{suffix:06d}'
        self.start = '2031-07-07' if args.browser == 'chromium' else '2031-07-14'
        date = datetime.date.fromisoformat(self.start)
        assert date > datetime.date.today(), 'The fixed acceptance dates must remain future dates'
        self.end = (date + datetime.timedelta(days=1)).isoformat()
        self.extended = (date + datetime.timedelta(days=2)).isoformat()
        self.checks = []
        self.network = []
        self.unexpected = []
        self.errors = []
        self.owned = {}
        self.create_attempts = []
        self.drop_next_create = True
        self.committed_response_lost = False
        self.base = None
        self.pages = {}
        self.tokens = {}
        self.user_ids = {}

    def redact(self, value):
        if isinstance(value, dict):
            return {key: self.redact(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self.redact(item) for item in value]
        if isinstance(value, str):
            # Playwright may append the whole page accessibility tree to an
            # assertion. Keep its locator evidence, never unrelated stage rows.
            value = value.split('\nAria snapshot:', 1)[0]
            for secret in self.secrets:
                if secret:
                    value = value.replace(secret, '[redacted]')
        return value

    def save(self, complete=False, failure=None):
        result = {'projectRef': PROJECT, 'browser': self.args.browser, 'runId': self.run_id,
                  'cohort': self.name, 'phone': self.phone, 'completed': complete,
                  'checks': self.checks, 'passed': sum(row['passed'] for row in self.checks),
                  'failed': sum(not row['passed'] for row in self.checks),
                  'ownedBookingIds': sorted(self.owned), 'network': self.network,
                  'unexpected': self.unexpected, 'applicationErrors': self.errors,
                  'failure': failure, 'physicalIphone': False,
                  'transport': 'Real exact-stage HTTP; no business response fixtures',
                  'servedArtifact': 'Generated /r4/ artifact on the isolated CI server; private Site cookies are not tested',
                  'productionRequests': 0, 'providerRequestsForwarded': 0,
                  'credentialsInArtifacts': False, 'tracesOrHar': False}
        (self.out / 'result.json').write_text(json.dumps(self.redact(result), ensure_ascii=False, indent=2) + '\n')

    def check(self, name, passed, **evidence):
        self.checks.append({'name': name, 'passed': bool(passed), **self.redact(evidence)})
        self.save()
        print(('PASS: ' if passed else 'FAIL: ') + name, flush=True)
        if not passed:
            raise AssertionError(name)

    def is_own(self, booking):
        return (booking.get('customer_name') == self.name and
                normalized_phone(booking.get('customer_phone')) == normalized_phone(self.phone) and
                booking.get('start_date') == self.start and
                booking.get('return_date') in [self.end, self.extended])

    def capture_booking(self, body):
        booking = body.get('booking') if isinstance(body, dict) else None
        if isinstance(booking, dict) and self.is_own(booking):
            assert re.fullmatch(r'[0-9a-f-]{36}', str(booking.get('id', '')), re.I)
            self.owned[booking['id']] = {
                'id': booking['id'], 'booking_code': booking.get('booking_code'),
                'status': booking.get('status')}

    def safe_write(self, endpoint, body):
        action = body.get('action')
        if endpoint == 'vacleaner-admin-bookings-v4' and action == 'create':
            return (body.get('customerName') == self.name and
                    normalized_phone(body.get('customerPhone')) == normalized_phone(self.phone) and
                    body.get('startDate') == self.start and body.get('returnDate') == self.end and
                    body.get('productCode') == 'puzzi' and body.get('fulfillment') == 'pickup' and
                    bool(re.fullmatch(r'[0-9a-f-]{36}', str(body.get('clientRequestId', '')), re.I)))
        if body.get('bookingId') not in self.owned:
            return False
        if endpoint == 'vacleaner-admin-bookings-v4':
            if action == 'edit':
                return (body.get('customerName') == self.name and
                        normalized_phone(body.get('customerPhone')) == normalized_phone(self.phone) and
                        body.get('startDate') == self.start and body.get('returnDate') in [self.end, self.extended])
            if action == 'update':
                return body.get('status') in ['confirmed', 'issued', 'cancelled']
            return action in ['save_finance', 'save_deposit_return']
        if endpoint == 'vacleaner-extend-rental-v1':
            return body.get('returnDate') == self.extended
        return False

    def route(self, route, role):
        request = route.request
        url = urlsplit(request.url)
        origin = url.scheme + '://' + url.netloc
        if origin == self.base:
            if request.method in ['GET', 'HEAD'] and (url.path.startswith('/r4/') or url.path == '/favicon.ico'):
                return route.continue_()
        if origin != ORIGIN:
            self.unexpected.append({'role': role, 'origin': origin, 'path': url.path, 'method': request.method})
            return route.abort()
        if request.method == 'OPTIONS':
            return route.continue_()
        auth = url.path in ['/auth/v1/settings', '/auth/v1/token', '/auth/v1/user', '/auth/v1/logout']
        if auth:
            permitted = ((url.path in ['/auth/v1/settings', '/auth/v1/user'] and request.method == 'GET') or
                         (url.path == '/auth/v1/token' and request.method == 'POST' and
                          parse_qs(url.query).get('grant_type') in [['password'], ['refresh_token']]) or
                         (url.path == '/auth/v1/logout' and request.method == 'POST' and
                          parse_qs(url.query).get('scope') == ['local']))
            if permitted:
                self.network.append({'role': role, 'path': url.path, 'method': request.method})
                return route.continue_()
        endpoint = url.path.removeprefix('/functions/v1/') if url.path.startswith('/functions/v1/') else None
        body = (request.post_data_json or {}) if request.method == 'POST' else {}
        action = body.get('action')
        read = endpoint in FUNCTIONS and (
            endpoint == 'vacleaner-settings' and request.method == 'GET' or
            request.method == 'POST' and action in READS or
            endpoint == 'vacleaner-customer-documents-v1' and request.method == 'POST' and
            parse_qs(url.query).get('action') == ['view'] and
            normalized_phone(body.get('phone')) == normalized_phone(self.phone))
        mutation = endpoint in FUNCTIONS and request.method == 'POST' and self.safe_write(endpoint, body)
        if not (read or mutation):
            self.unexpected.append({'role': role, 'path': url.path, 'method': request.method, 'action': action})
            return route.abort()
        self.network.append({'role': role, 'path': url.path, 'action': action, 'method': request.method})
        if endpoint == 'vacleaner-admin-bookings-v4' and action == 'create':
            self.create_attempts.append(body['clientRequestId'])
            if self.drop_next_create:
                self.drop_next_create = False
                response = route.fetch(max_redirects=0)
                data = response.json()
                self.capture_booking(data)
                if response.status in [200, 201] and len(self.owned) == 1:
                    self.committed_response_lost = True
                    self.network.append({'role': role, 'action': 'create', 'status': response.status,
                                         'responseLostAfterCommit': True})
                    return route.abort('failed')
                return route.fulfill(response=response)
        return route.continue_()

    def observe(self, response, role):
        if not response.url.startswith(ORIGIN + '/'):
            return
        path = urlsplit(response.url).path
        try:
            if path == '/auth/v1/token' and response.status == 200:
                data = response.json()
                for key in ['access_token', 'refresh_token']:
                    if data.get(key): self.secrets.append(data[key])
            elif path.startswith('/functions/v1/') and response.status < 300:
                self.capture_booking(response.json())
        except Exception:
            # Response-body disposal on a navigation is not a new test result.
            # Authoritative API readback below remains mandatory.
            pass

    def login(self, browser, base, role, account):
        mobile = self.args.browser == 'webkit'
        device = {key: value for key, value in self.pw.devices['iPhone 17 Pro Max'].items()
                  if key != 'default_browser_type'} if mobile else {}
        device.update(viewport={'width': 440 if mobile else 1440, 'height': 956},
                      timezone_id='Europe/Kyiv', service_workers='block')
        context = browser.new_context(**device)
        context.route('**/*', lambda route: self.route(route, role))
        if mobile:
            context.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
        page = context.new_page()
        page.on('response', lambda response: self.observe(response, role))
        page.on('pageerror', lambda error: self.errors.append(self.redact(str(error))))
        page.on('crash', lambda: self.errors.append('Browser page crashed: ' + role))
        self.pages[role] = page
        page.goto(base + '/r4/admin/bronuvannia/')
        expect(page.locator('#authForm')).to_be_visible()
        target = page.evaluate('({projectRef:window.VA_STAGE_CONFIG?.projectRef,origin:window.VA_STAGE_CONFIG?.origin,mode:document.documentElement.dataset.adminLab})')
        self.check(role + ': actual artifact is exact isolated stage before login',
                   target == {'projectRef': PROJECT, 'origin': ORIGIN, 'mode': 'staging'})
        page.locator('#authForm [name=login]').fill(account['email'])
        page.locator('#authForm [name=password]').fill(account['password'])
        page.locator('#authForm [type=submit]').click()
        self.ready(page)
        session = page.evaluate('''()=>{
          const storage=window.VA_STAGE_STORAGE;
          const value=storage.local.getItem('vacleaner_session')||storage.session.getItem('vacleaner_session');
          const session=JSON.parse(value||'{}');
          return{accessToken:session.access_token,userId:session.user?.id};
        }''')
        assert session.get('accessToken') and session.get('userId'), 'Real authenticated session required'
        self.tokens[role] = session['accessToken']; self.secrets.append(session['accessToken'])
        self.user_ids[role] = session['userId']
        self.check(role + ': real UI password login established a server session', True)
        return context, page

    def ready(self, page):
        # Mobile uses display:contents; the wrapper has no visible box in
        # WebKit while its actual main and navigation remain visible.
        expect(page.locator('#adminMount .app')).to_be_attached()
        expect(page.locator('#adminMount main')).to_be_visible()
        nav = '.mobile-nav [data-mobile-view=bookings]' if self.args.browser == 'webkit' else '.nav [data-view=bookings]'
        expect(page.locator(nav)).to_be_visible()

    def navigate_bookings(self, page, status='all'):
        self.ready(page)
        page.locator('.mobile-nav [data-mobile-view=bookings]' if self.args.browser == 'webkit'
                     else '.nav [data-view=bookings]').click()
        expect(page.locator('#labListMode')).to_be_visible()
        if self.args.browser == 'webkit':
            page.locator('.native-search-options').click()
            sheet = page.locator('.v43-filter-sheet')
            expect(sheet).to_be_visible()
            sheet.locator('.native-v2-sheet-action').filter(has_text={
                'all': 'Усі', 'completed': 'Повернені', 'cancelled': 'Скасовані'}[status]).click()
            expect(sheet).to_have_count(0)
        else:
            page.locator(f'.booking-toolbar [data-filter="{status}"]').click()
        # This is the real global search, which replaces cards with grouped
        # search-result rows. Stay in the actual booking list for its actions.
        expect(page.locator('#globalSearch')).to_have_value('')

    def card(self, page, booking_id, status='all', refresh=False):
        if refresh:
            page.reload()
        self.navigate_bookings(page, status)
        card = page.locator(f'.booking-card[data-id="{booking_id}"]')
        expect(card).to_be_visible()
        expect(card).to_contain_text(self.name)
        expect(card).to_have_count(1)
        return card

    def api(self, role, body):
        action = body.get('action')
        assert action == 'list' or self.safe_write('vacleaner-admin-bookings-v4', body)
        response = self.pages[role].context.request.post(ORIGIN + '/functions/v1/vacleaner-admin-bookings-v4',
            headers={'apikey': self.public['publicKey'], 'Authorization': 'Bearer ' + self.tokens[role]},
            data=body, timeout=45000, max_redirects=0)
        data = response.json()
        self.check('independent ' + role + ' API ' + action, response.status == 200,
                   status=response.status, error=data.get('error'))
        return data

    def read(self, booking_id, role='B'):
        data = self.api(role, {'action': 'list'})
        rows = [row for row in data.get('bookings', []) if row.get('id') == booking_id]
        self.check('exactly one authoritative own booking', len(rows) == 1 and self.is_own(rows[0]))
        return rows[0]

    def screenshot(self, page, name):
        # Never capture an authentication form, even though passwords are masked.
        if page.locator('#authForm').is_visible():
            return
        cards = page.locator('.booking-card').filter(has_text=self.name)
        if cards.count() != 1 or cards.get_attribute('data-id') not in self.owned:
            return
        # Capture only our synthetic card, never surrounding existing rows.
        cards.screenshot(path=str(self.out / (name + '.png')))

    def pick_time(self, page, form, field, value):
        control = form.locator(f'[name="{field}"]')
        control.locator('..').locator('.admin-v4315-time-trigger').click()
        overlay = page.locator('.admin-v4315-time-overlay')
        expect(overlay).to_be_visible()
        hour = int(value[:2]); period = 'morning' if hour < 12 else 'day' if hour < 17 else 'evening'
        overlay.locator(f'[data-time-period="{period}"]').click()
        overlay.locator(f'[data-time="{value}"]').click()
        expect(overlay).not_to_be_visible()
        expect(control).to_have_value(value)

    def next_step(self, form):
        if self.args.browser == 'webkit':
            form.locator('.mobile-booking-next').click()

    def create_with_lost_response(self, page_a, page_b):
        self.navigate_bookings(page_a)
        page_a.locator('#mobileNewBooking' if self.args.browser == 'webkit' else '#newBooking').click()
        form = page_a.locator('#bookingForm'); expect(form).to_be_visible()
        form.locator('[name=productCode]').select_option('puzzi')
        form.locator('[name=startDate]').fill(self.start)
        self.pick_time(page_a, form, 'pickupTime', '08:00')
        form.locator('[name=returnDate]').fill(self.end)
        self.pick_time(page_a, form, 'returnTime', '10:00')
        self.next_step(form)
        form.locator('[name=customerName]').fill(self.name)
        form.locator('[name=customerPhone]').fill(self.phone)
        self.next_step(form)
        document = form.locator('[name=documentNumber]')
        if document.is_visible():
            document.fill('R61-QA-' + self.run_id[-6:])
            form.locator('[name=identityVerified]').check()
        self.next_step(form)
        submit = form.locator('.booking-submit')
        expect(submit).to_be_visible(); submit.click()
        expect(submit).to_be_enabled(timeout=45000)
        self.check('actual create committed before its response was deliberately lost',
                   self.committed_response_lost and len(self.owned) == 1 and len(self.create_attempts) == 1)
        expect(form).to_be_visible()
        booking_id = next(iter(self.owned))
        row = self.read(booking_id)
        self.check('other manager sees committed waiting booking before retry',
                   row['status'] == 'waiting_payment' and not row['prepayment_paid'])
        self.initial_base = float(row['base_amount'])
        self.check('initial one-day pickup preserves nominal terms without recording a payment',
                   self.initial_base > 0 and float(row['total_amount']) == self.initial_base and
                   row['prepayment_paid'] is False and float(row['prepayment_amount']) == 200 and
                   row['deposit_paid'] is False and float(row['deposit_amount']) == 1000)
        card_b = self.card(page_b, booking_id, refresh=True)
        expect(card_b.locator('.status')).to_contain_text('Очікує')
        received = card_b.locator('.lab-booking-money>span').first
        expect(received).to_contain_text('Отримано')
        self.check('other manager actual UI displays zero received before any payment',
                   int(re.sub(r'\D', '', received.inner_text())) == 0)
        self.check('manager B actual UI refresh displays the committed booking before A retries', True)
        submit.click(); expect(form).to_have_count(0, timeout=45000)
        self.check('deliberate UI retry reused the original create request ID',
                   len(self.create_attempts) == 2 and self.create_attempts[0] == self.create_attempts[1])
        self.card(page_a, booking_id, refresh=True)
        rows = self.api('B', {'action': 'list'}).get('bookings', [])
        matches = [row for row in rows if self.is_own(row)]
        self.check('UI retry and independent persisted read contain no duplicate',
                   len(matches) == 1 and matches[0]['id'] == booking_id)
        return booking_id

    def exact_time_edit(self, page_a, page_b, booking_id):
        self.card(page_a, booking_id).locator('[data-action=edit]').click()
        form = page_a.locator('#bookingForm'); expect(form).to_be_visible()
        self.pick_time(page_a, form, 'pickupTime', '08:30')
        self.next_step(form); self.next_step(form); self.next_step(form)
        form.locator('.booking-submit').click(); expect(form).to_have_count(0, timeout=45000)
        row = self.read(booking_id)
        self.check('saved exact 08:30 is authoritative for the other manager',
                   row['extras']['pickup_time'] == '08:30' and 'T08:30:00' in row['start_at'])
        expect(self.card(page_b, booking_id, refresh=True)).to_contain_text('08:30')
        self.card(page_a, booking_id, refresh=True).locator('[data-action=edit]').click()
        form = page_a.locator('#bookingForm')
        expect(form.locator('[name=pickupTime]')).to_have_value('08:30')
        form.locator('header [data-close]').click(); expect(form).to_have_count(0)
        expect(page_a.locator('#labLeaveDialog')).to_have_count(0)
        self.check('UI refresh and reopening edit retain exact time without a false dirty warning', True)

    def lifecycle(self, page_a, page_b, booking_id):
        self.card(page_a, booking_id).locator('[data-action=process]').click()
        form = page_a.locator('#processForm'); expect(form).to_be_visible()
        # Use the actual completed profile lookup for this deterministic
        # lifecycle. Separate race regression covers edits made in flight.
        expect(form.locator('#documentProfileState.loading')).to_have_count(0)
        form.locator('[name=contacted]').check()
        form.locator('[name=confirmationSent]').check()
        if form.get_attribute('data-documents-required') == '1':
            form.locator('[name=documentNumber]').fill('R61-QA-' + self.run_id[-6:])
            form.locator('[name=identityVerified]').check()
        form.locator('[name=prepaymentPaid]').check()
        form.locator('#confirmProcess').click(); expect(form).to_have_count(0, timeout=45000)
        row = self.read(booking_id)
        self.check('actual process UI persists confirmed and the paid 200', row['status'] == 'confirmed' and
                   row['prepayment_paid'] is True and row['prepayment_amount'] == 200)
        expect(self.card(page_b, booking_id, refresh=True).locator('.status')).to_contain_text('Підтверджена')
        self.card(page_a, booking_id).locator('[data-action=issue]').click()
        form = page_a.locator('#issueForm'); expect(form).to_be_visible()
        form.locator('[name=depositAmount]').fill('1000')
        form.locator('[name=depositPaid]').check()
        form.locator('[type=submit]').click(); expect(form).to_have_count(0, timeout=45000)
        row = self.read(booking_id)
        self.check('issue UI persists actual deposit and status', row['status'] == 'issued' and
                   row['deposit_paid'] is True and row['deposit_amount'] == 1000)
        card_b = self.card(page_b, booking_id, refresh=True)
        expect(card_b.locator('.status')).to_contain_text('Видана')
        received = card_b.locator('.lab-booking-money>span').first
        expect(received).to_contain_text('Отримано')
        self.check('other manager actual card shows paid 200 plus deposit 1000',
                   int(re.sub(r'\D', '', received.inner_text())) == 1200)
        self.card(page_a, booking_id).locator('[data-action=extend]').click()
        form = page_a.locator('#extendRentalForm'); expect(form).to_be_visible()
        form.locator('[name=returnDate]').fill(self.extended)
        form.locator('[type=submit]').click(); expect(form).to_have_count(0, timeout=45000)
        row = self.read(booking_id)
        self.check('extension UI persists the chosen date without losing deposit or exact time',
                   row['return_date'] == self.extended and row['deposit_amount'] == 1000 and
                   row['extras']['pickup_time'] == '08:30' and row['status'] == 'issued')
        self.check('two weekday rental days reconcile with the recorded one-day base',
                   float(row['base_amount']) == 2 * self.initial_base and
                   float(row['total_amount']) == 2 * self.initial_base)
        self.card(page_b, booking_id, refresh=True)
        self.card(page_a, booking_id).locator('[data-action=complete]').click()
        form = page_a.locator('#financeForm'); expect(form).to_be_visible()
        form.locator('[name=settlementCompleted]').check()
        form.locator('[type=submit]').click(); expect(form).to_have_count(0, timeout=45000)
        row = self.read(booking_id)
        self.check('settlement UI persists completed balance and returned deposit', row['status'] == 'completed' and
                   row['deposit_returned'] is True and row['extras']['settlement']['completed'] is True)
        due = max(0, 2 * self.initial_base - 1200)
        self.check('completed due payment reconciles with actual prepayment deposit and rent',
                   float(row.get('return_payment_amount') or 0) == due and
                   (due == 0 or row.get('return_payment_paid') is True))
        expect(self.card(page_b, booking_id, status='completed', refresh=True).locator('.status')).to_contain_text('Повернена')
        self.check('manager B actual UI refresh reads final completed status', True)
        self.screenshot(page_b, 'other-manager-completed')

    def cleanup(self):
        if not self.owned or 'B' not in self.tokens:
            return
        rows = self.api('B', {'action': 'list'}).get('bookings', [])
        for booking_id in list(self.owned):
            current = next((row for row in rows if row.get('id') == booking_id), None)
            self.check('cleanup revalidates exact own synthetic identity', bool(current) and self.is_own(current),
                       bookingId=booking_id)
            if current['status'] in ['pending', 'waiting_payment', 'confirmed', 'issued']:
                self.api('B', {'action': 'update', 'bookingId': booking_id, 'status': 'cancelled'})
            final = self.read(booking_id)
            self.check('no active reservation remains from this synthetic CI case',
                       final['status'] in ['completed', 'cancelled'], bookingId=booking_id, status=final['status'])

    def run(self):
        failure = None; complete = False
        # API debugging can print fill() arguments. This harness owns its own
        # sanitized evidence instead of inheriting browser protocol debug logs.
        os.environ.pop('DEBUG', None)
        try:
            with tempfile.TemporaryDirectory(prefix='r61-connected-', dir=ROOT / 'staging-ui-test-results') as temp:
                shutil.copytree(ROOT / 'staging-ui-test-results/dist', Path(temp) / 'r4')
                with pages_server(Path(temp)) as base, sync_playwright() as pw:
                    self.base = base; self.pw = pw
                    browser = getattr(pw, self.args.browser).launch(headless=True)
                    try:
                        _, page_a = self.login(browser, base, 'A', self.accounts[0])
                        _, page_b = self.login(browser, base, 'B', self.accounts[1])
                        self.check('two real browser sessions have different authorized user IDs',
                                   self.user_ids['A'] != self.user_ids['B'])
                        baseline = self.api('B', {'action': 'list'}).get('bookings', [])
                        self.check('synthetic cohort does not overwrite an existing booking',
                                   not any(normalized_phone(row.get('customer_phone')) == normalized_phone(self.phone)
                                           for row in baseline))
                        booking_id = self.create_with_lost_response(page_a, page_b)
                        self.exact_time_edit(page_a, page_b, booking_id)
                        self.lifecycle(page_a, page_b, booking_id)
                        self.check('no foreign or provider request was forwarded', not self.unexpected,
                                   unexpected=self.unexpected)
                        self.check('no uncaught application errors during the connected scenario', not self.errors,
                                   errors=self.errors)
                        complete = True
                    except Exception as error:
                        failure = {'type': type(error).__name__, 'message': self.redact(str(error))}
                        self.checks.append({'name': 'connected UI scenario completed', 'passed': False, 'error': failure})
                        print('FAIL: connected UI scenario completed (' + type(error).__name__ + ')', flush=True)
                        for role, page in self.pages.items():
                            try: self.screenshot(page, 'failure-' + role)
                            except Exception: pass
                    finally:
                        try:
                            self.cleanup()
                        except Exception as error:
                            complete = False
                            self.checks.append({'name': 'own synthetic cleanup completed', 'passed': False,
                                                'error': self.redact(str(error))})
                            print('FAIL: own synthetic cleanup completed', flush=True)
                        browser.close()
        except Exception as error:
            complete = False
            failure = {'type': type(error).__name__, 'message': self.redact(str(error))}
            self.checks.append({'name': 'connected UI infrastructure completed', 'passed': False, 'error': failure})
            print('FAIL: connected UI infrastructure completed (' + type(error).__name__ + ')', flush=True)
        self.save(complete=complete, failure=failure)
        passed = sum(row['passed'] for row in self.checks)
        failed = len(self.checks) - passed
        print(json.dumps({'browser': self.args.browser, 'passed': passed, 'failed': failed,
                          'completed': complete, 'liveStage': True, 'productionRequests': 0}), flush=True)
        return int(not complete or bool(failed))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', choices=['chromium', 'webkit'], required=True)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        parser.error('Remote GitHub Actions only; do not start a local Sites browser')
    return ConnectedRun(args).run()


if __name__ == '__main__':
    raise SystemExit(main())
