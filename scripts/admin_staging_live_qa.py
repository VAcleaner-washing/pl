"""Opt-in hosted integration checks. Never accepts the production project.

Credentials are read from an external mode-0600 file, never from source or argv.
No signup, invitation, password-reset or outbound-provider route is used.
"""
import argparse
import base64
import concurrent.futures
import http.client
import http.server
import hashlib
import json
import os
import socket
import stat
import threading
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PRODUCTION = 'yweluzclearwrazdkahu'
FUNCTIONS = [
    'vacleaner-admin-bookings-v4', 'vacleaner-admin-data-v1',
    'vacleaner-settings', 'vacleaner-extend-rental-v1',
    'vacleaner-status-correction-v1', 'vacleaner-customer-documents-v1',
]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

class Checks:
    def __init__(self, args):
        self.args = args
        self.secrets_path = Path(args.credentials).resolve()
        root = Path(__file__).resolve().parents[1]
        assert not self.secrets_path.is_relative_to(root), 'Credentials must stay outside the repository'
        assert stat.S_IMODE(self.secrets_path.stat().st_mode) == 0o600, 'Credentials must have mode 0600'
        self.secret = json.loads(self.secrets_path.read_text())
        manifest = json.loads((root / 'staging/local/manifest.generated.json').read_text())
        assert args.project_ref != PRODUCTION
        assert args.project_ref == self.secret['projectRef'] == manifest['projectRef']
        self.origin = 'https://' + args.project_ref + '.supabase.co'
        assert self.secret['origin'] == self.origin
        assert all(a['email'].endswith('@vacleaner-r4.invalid') for a in self.secret['accounts'])
        self.opener = urllib.request.build_opener(NoRedirect)
        self.tokens = {}
        self.report = {'projectRef': args.project_ref, 'phase': args.phase,
                       'startedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'checks': []}

    def request(self, path, body=None, token=None, method='POST', headers=None):
        assert path.startswith('/') and not path.startswith('//')
        h = {'apikey': self.secret['publicKeys']['publishable']}
        if token:
            h['Authorization'] = 'Bearer ' + token
        h.update(headers or {})
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
            h.setdefault('Content-Type', 'application/json')
        req = urllib.request.Request(self.origin + path, data=body, method=method, headers=h)
        started = time.monotonic()
        try:
            with self.opener.open(req, timeout=60) as response:
                status, raw = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read()
        try:
            result = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            result = {'byteLength': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
        return status, result, round((time.monotonic() - started) * 1000)

    def check(self, name, condition, **evidence):
        self.report['checks'].append({'name': name, 'passed': bool(condition), **evidence})
        self.save()
        assert condition, name + ': ' + json.dumps(evidence)

    def save(self):
        path = Path(self.args.artifacts)
        path.mkdir(parents=True, exist_ok=True)
        (path / (self.args.phase + '.json')).write_text(json.dumps(self.report, indent=2) + '\n')

    def login(self):
        for label, account in zip(['manager_a', 'manager_b', 'outsider'], self.secret['accounts']):
            status, body, ms = self.request('/auth/v1/token?grant_type=password',
                {'email': account['email'], 'password': account['password']})
            self.check('login_' + label, status == 200 and bool(body.get('access_token')),
                       status=status, durationMs=ms, error=body.get('error_code'))
            self.tokens[label] = body['access_token']
            if label == 'outsider':
                self.check('outsider_editable_metadata_spoofs_admin',
                    body['user']['user_metadata'].get('is_admin') is True and
                    body['user']['user_metadata'].get('role') == 'admin')

    def fn(self, name, body, actor='manager_a', **kwargs):
        return self.request('/functions/v1/' + name, body, self.tokens.get(actor), **kwargs)

    def booking_action(self, payload, expected=200, actor='manager_a', name=None):
        status, body, ms = self.fn('vacleaner-admin-bookings-v4', payload, actor)
        self.check(name or payload['action'], status == expected, status=status,
                   error=body.get('error'), durationMs=ms,
                   bookingId=body.get('booking', {}).get('id'))
        return body

    def read_booking(self, booking_id):
        result = self.booking_action({'action': 'list'}, actor='manager_b', name='other_manager_read')
        rows = [b for b in result['bookings'] if b['id'] == booking_id]
        self.check('exactly_one_persisted_booking', len(rows) == 1, bookingId=booking_id)
        return rows[0]

    def save_state(self, **state):
        path = Path(self.args.artifacts) / (self.args.phase + '-state.json')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(state, indent=2) + '\n')

    def lifecycle(self):
        assert self.args.allow_synthetic_writes, 'Explicit --allow-synthetic-writes is required'
        state_path = Path(self.args.artifacts) / 'lifecycle-state.json'
        assert not state_path.exists(), 'Inspect existing test state instead of blindly replaying writes'
        self.login()
        request_id = str(uuid.uuid4())
        payload = {'action': 'create', 'clientRequestId': request_id, 'productCode': 'puzzi',
            'startDate': '2030-01-07', 'returnDate': '2030-01-08',
            'pickupWindow': 'morning', 'returnWindow': 'morning',
            'pickupTime': '08:00', 'returnTime': '10:00', 'fulfillment': 'pickup',
            'customerName': 'R4 SYNTHETIC lifecycle', 'customerPhone': '+380000000101',
            'source': 'r4_synthetic', 'adminNote': 'R4 synthetic hosted acceptance; no real client'}
        self.save_state(clientRequestId=request_id, payload=payload)
        created = self.booking_action(payload, expected=201, name='create')
        booking = created['booking']
        bid = booking['id']
        self.save_state(clientRequestId=request_id, bookingId=bid, payload=payload)
        self.check('created_waiting_payment', booking['status'] == 'waiting_payment' and
                   booking['prepayment_paid'] is False and booking['base_amount'] == 700 and
                   booking['deposit_amount'] == 1000, status=booking['status'], base=booking['base_amount'])
        again = self.booking_action(payload, name='same_request_retry')
        self.check('retry_same_id', again['booking']['id'] == bid and again.get('idempotent') is True)
        edited = self.booking_action({**payload, 'action': 'edit', 'bookingId': bid,
                                     'pickupTime': '08:30', 'customerComment': 'synthetic edited draft'})['booking']
        persisted = self.read_booking(bid)
        self.check('exact_time_and_comment_survive_other_manager_read',
            edited['extras']['pickup_time'] == persisted['extras']['pickup_time'] == '08:30' and
            persisted['start_at'].startswith('2030-01-07T08:30:00') and
            persisted['customer_comment'] == 'synthetic edited draft')
        denied = self.booking_action({'action': 'update', 'bookingId': bid, 'status': 'issued'},
                                     expected=409, name='issue_requires_payment')
        self.check('issue_payment_error', denied.get('error') == 'issue_payment_required')
        confirmed = self.booking_action({'action': 'update', 'bookingId': bid, 'status': 'confirmed'})['booking']
        self.check('prepayment_confirmation_persisted', confirmed['status'] == 'confirmed' and
                   confirmed['prepayment_paid'] is True and confirmed['prepayment_amount'] == 200)
        finance = self.booking_action({'action': 'save_finance', 'bookingId': bid,
            'depositAmount': 1000, 'depositPaid': True, 'usedPackets': 2,
            'manualChargeAmount': 50, 'manualChargeReason': 'R4 synthetic extra'})
        self.check('finance_concrete_oracle', finance['finance']['receivedAmount'] == 1200 and
                   finance['finance']['totalAmount'] == 850 and finance['finance']['refundAmount'] == 350,
                   received=finance['finance']['receivedAmount'], total=finance['finance']['totalAmount'])
        issued = self.booking_action({'action': 'update', 'bookingId': bid, 'status': 'issued'})['booking']
        self.check('issued_persisted', self.read_booking(bid)['status'] == issued['status'] == 'issued')
        issue_retry = self.booking_action({'action': 'update', 'bookingId': bid, 'status': 'issued'})
        self.check('issue_retry_is_idempotent', issue_retry.get('alreadyApplied') is True)
        status, extended, ms = self.fn('vacleaner-extend-rental-v1', {'bookingId': bid,
            'returnDate': '2030-01-09', 'returnWindow': 'morning', 'returnTime': '10:00'})
        self.check('extension', status == 200, status=status, error=extended.get('error'), durationMs=ms)
        persisted = self.read_booking(bid)
        self.check('extension_preserves_deposit_and_extras', persisted['return_date'] == '2030-01-09' and
                   persisted['deposit_amount'] == 1000 and persisted['base_amount'] == 1400 and
                   persisted['total_amount'] == 1550 and persisted['extras']['chemistry']['used_packets'] == 2,
                   base=persisted['base_amount'], total=persisted['total_amount'])
        rejected = self.booking_action({'action': 'save_deposit_return', 'bookingId': bid,
            'returned': True, 'settlementConfirmed': True}, expected=409, name='settlement_requires_due_confirmation')
        self.check('unconfirmed_due_rejected', rejected.get('error') == 'due_not_confirmed' and
                   rejected['finance']['dueAmount'] == 350)
        persisted = self.read_booking(bid)
        self.check('rejected_settlement_does_not_complete_or_lose_finance', persisted['status'] == 'issued' and
                   persisted['deposit_returned'] is False and persisted['total_amount'] == 1550)
        settled = self.booking_action({'action': 'save_deposit_return', 'bookingId': bid,
            'returned': True, 'settlementConfirmed': True, 'duePaid': True})['booking']
        persisted = self.read_booking(bid)
        self.check('completed_balance_and_status_agree', settled['status'] == persisted['status'] == 'completed' and
                   persisted['deposit_returned'] is True and persisted['return_payment_amount'] == 350 and
                   persisted['return_payment_paid'] is True and persisted['extras']['settlement']['completed'] is True)
        status, corrected, _ = self.fn('vacleaner-status-correction-v1', {'bookingId': bid,
            'status': 'issued', 'reason': 'R4 synthetic correction regression'})
        self.check('status_correction', status == 200, status=status, error=corrected.get('error'))
        corrected = self.read_booking(bid)
        self.check('correction_reopens_settlement', corrected['status'] == 'issued' and
                   corrected['deposit_returned'] is False and corrected['extras']['settlement']['completed'] is False)
        self.booking_action({'action': 'save_deposit_return', 'bookingId': bid, 'returned': True,
                             'settlementConfirmed': True, 'duePaid': True}, name='resettle_after_correction')
        audit = self.booking_action({'action': 'audit_log', 'bookingId': bid})
        self.check_audit(audit, bid)

    def check_audit(self, audit, bid):
        entries = audit.get('entries')
        self.check('audit_entries_exist', isinstance(entries, list) and len(entries) > 0,
                   responseKeys=list(audit))
        self.check('audit_records_refer_to_correct_booking', all(e['booking_id'] == bid for e in entries))
        self.check('audit_records_capture_authenticated_actor', any(e.get('actor_id') for e in entries))

    def audit(self):
        self.login()
        state = json.loads((Path(self.args.artifacts) / 'lifecycle-state.json').read_text())
        bid = state['bookingId']
        audit = self.booking_action({'action': 'audit_log', 'bookingId': bid})
        self.check_audit(audit, bid)

    def synthetic_payload(self, label, start, end, phone, product='sc2'):
        return {'action': 'create', 'clientRequestId': str(uuid.uuid4()), 'productCode': product,
                'startDate': start, 'returnDate': end, 'pickupWindow': 'morning',
                'returnWindow': 'morning', 'pickupTime': '08:00', 'returnTime': '10:00',
                'fulfillment': 'pickup', 'customerName': 'R4 SYNTHETIC ' + label,
                'customerPhone': phone, 'source': 'r4_synthetic'}

    def concurrency(self):
        assert self.args.allow_synthetic_writes
        assert not (Path(self.args.artifacts) / 'concurrency-state.json').exists()
        self.login()
        same = self.synthetic_payload('concurrent same request', '2030-01-14', '2030-01-15', '+380000000102')
        competing = [self.synthetic_payload('competing ' + str(i), '2030-01-21', '2030-01-22',
                                           '+38000000011' + str(i)) for i in range(3)]
        self.save_state(same=same, competing=competing)
        barrier = threading.Barrier(2)
        def create_same(actor):
            barrier.wait(timeout=15)
            return self.fn('vacleaner-admin-bookings-v4', same, actor)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(create_same, ['manager_a', 'manager_b']))
        self.check('concurrent_same_request_http_success', all(r[0] in (200, 201) for r in results),
                   statuses=[r[0] for r in results], errors=[r[1].get('error') for r in results])
        ids = [r[1]['booking']['id'] for r in results]
        self.check('concurrent_same_request_one_id', len(set(ids)) == 1, bookingIds=ids)
        row = self.read_booking(ids[0])
        self.check('concurrent_request_final_reservation_persisted', row['status'] == 'waiting_payment')
        self.report['concurrentReceipts'] = [
            {'http': r[0], 'status': r[1]['booking']['status'], 'idempotent': r[1].get('idempotent', False),
             'bookingId': r[1]['booking']['id']} for r in results]
        self.save()
        # Do not mask a transient acknowledgement as final success.
        self.check('both_concurrent_receipts_match_final_state',
                   all(r[1]['booking']['status'] == row['status'] for r in results),
                   receipts=[r[1]['booking']['status'] for r in results], finalStatus=row['status'])
        barrier = threading.Barrier(3)
        def compete(payload):
            barrier.wait(timeout=15)
            return self.fn('vacleaner-admin-bookings-v4', payload)
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(compete, competing))
        self.check('inventory_capacity_two_not_oversold', sorted(r[0] for r in results) == [201, 201, 409],
                   statuses=[r[0] for r in results], errors=[r[1].get('error') for r in results])
        for result in results:
            if result[0] == 201:
                self.check('successful_competing_reservation_persisted',
                           self.read_booking(result[1]['booking']['id'])['status'] == 'waiting_payment')

    def lost_response(self):
        assert self.args.allow_synthetic_writes
        assert not (Path(self.args.artifacts) / 'lost_response-state.json').exists()
        self.login()
        payload = self.synthetic_payload('lost response', '2030-01-28', '2030-01-29', '+380000000120')
        self.save_state(payload=payload)
        upstream = {}
        checks = self
        class DropResponse(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass
            def do_POST(self):
                incoming = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                assert incoming == payload
                upstream['result'] = checks.fn('vacleaner-admin-bookings-v4', incoming)
                # Actual upstream request has finished; drop the entire downstream response.
                self.connection.shutdown(socket.SHUT_RDWR)
                self.connection.close()
        server = http.server.HTTPServer(('127.0.0.1', 0), DropResponse)
        thread = threading.Thread(target=server.handle_request)
        thread.start()
        client = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=65)
        disconnected = False
        try:
            client.request('POST', '/', json.dumps(payload), {'Content-Type': 'application/json'})
            client.getresponse()
        except http.client.RemoteDisconnected:
            disconnected = True
        finally:
            client.close()
            thread.join(timeout=65)
            server.server_close()
        self.check('proxy_dropped_real_response', disconnected and not thread.is_alive())
        status, body, _ = upstream['result']
        self.check('upstream_actual_create_committed', status == 201, status=status, error=body.get('error'))
        bid = body['booking']['id']
        self.save_state(payload=payload, bookingId=bid)
        self.check('other_manager_sees_committed_booking_after_response_loss',
                   self.read_booking(bid)['client_request_id'] == payload['clientRequestId'])
        retried = self.booking_action(payload, name='explicit_retry_after_response_loss')
        self.check('retry_after_response_loss_does_not_duplicate',
                   retried['booking']['id'] == bid and retried.get('idempotent') is True)

    def persistence(self):
        assert self.args.allow_synthetic_writes
        assert not (Path(self.args.artifacts) / 'persistence-state.json').exists()
        self.login()
        status, original, _ = self.request('/functions/v1/vacleaner-settings', method='GET')
        self.check('initial_settings', status == 200, status=status)
        pricing = original['deliveryPricing']
        changed = {**pricing, 'local': pricing['local'] + 1}
        self.save_state(originalDeliveryPricing=pricing)
        try:
            status, body, _ = self.fn('vacleaner-settings', {'deliveryPricing': changed})
            self.check('save_settings', status == 200, status=status, error=body.get('error'))
            status, body, _ = self.request('/functions/v1/vacleaner-settings',
                                          token=self.tokens['manager_b'], method='GET')
            self.check('other_manager_sees_acknowledged_setting', status == 200 and
                       body['deliveryPricing']['local'] == changed['local'], status=status)
            status, body, _ = self.fn('vacleaner-settings', {'deliveryPricing': {'local': -1}})
            self.check('invalid_setting_rejected', status == 400 and body.get('error') == 'invalid_delivery_fee', status=status)
            status, body, _ = self.request('/functions/v1/vacleaner-settings', method='GET')
            self.check('rejected_setting_keeps_persisted_value', status == 200 and
                       body['deliveryPricing']['local'] == changed['local'])
        finally:
            status, body, _ = self.fn('vacleaner-settings', {'deliveryPricing': pricing})
            self.check('restore_synthetic_catalog_default', status == 200, status=status, error=body.get('error'))
        phone = '+380000000130'
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'save_customer', 'originalPhone': phone,
            'customerPhone': phone, 'customerName': 'R4 SYNTHETIC customer persistence',
            'customerAddress': 'R4 test address', 'customerAddressDetail': 'Synthetic only'})
        self.check('save_customer', status == 200, status=status, error=body.get('error'))
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'clients'}, 'manager_b')
        rows = [c for c in body.get('customers', []) if c['phone'] == phone]
        self.check('other_manager_sees_customer_fields', status == 200 and len(rows) == 1 and
                   rows[0]['address_detail'] == 'Synthetic only')
        today = time.strftime('%Y-%m-%d', time.gmtime())
        expense = {'action': 'save_expense', 'spentOn': today, 'category': 'other', 'amount': 123,
                   'vendor': 'R4 SYNTHETIC', 'note': 'Synthetic acceptance only'}
        status, body, _ = self.fn('vacleaner-admin-data-v1', expense)
        self.check('save_synthetic_expense', status == 200, status=status, error=body.get('error'))
        eid = body['expense']['id']
        self.save_state(originalDeliveryPricing=pricing, customerPhone=phone, expenseId=eid)
        status, body, _ = self.fn('vacleaner-admin-data-v1', {**expense, 'expenseId': eid, 'amount': 124})
        self.check('edit_synthetic_expense', status == 200, status=status, error=body.get('error'))
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'list'}, 'manager_b')
        rows = [e for e in body.get('expenses', []) if e['id'] == eid]
        self.check('other_manager_sees_edited_expense', status == 200 and len(rows) == 1 and rows[0]['amount'] == 124)
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'archive_expense', 'expenseId': eid})
        self.check('archive_synthetic_expense', status == 200, status=status, error=body.get('error'))
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'list'}, 'manager_b')
        self.check('archived_expense_absent_from_list', status == 200 and
                   all(e['id'] != eid for e in body['expenses']))

    def documents(self):
        assert self.args.allow_synthetic_writes
        self.login()
        phone = '+380000000130'
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5VQAAAAASUVORK5CYII=')
        path = '/functions/v1/vacleaner-customer-documents-v1'
        status, uploaded, _ = self.request(path + '?action=upload', png, self.tokens['manager_a'], headers={
            'Content-Type': 'image/png', 'x-client-phone': phone, 'x-file-name': 'R4-synthetic-1px.png'})
        self.check('upload_synthetic_png', status == 200 and uploaded.get('ok') is True,
                   status=status, error=uploaded.get('error'))
        self.save_state(customerPhone=phone, objectPath=uploaded['path'])
        status, viewed, _ = self.request(path + '?action=view', {'phone': phone}, self.tokens['manager_b'])
        self.check('other_manager_can_request_signed_document', status == 200 and bool(viewed.get('document')), status=status)
        signed = urllib.parse.urlsplit(viewed['document']['url'])
        self.check('signed_document_stays_in_stage', signed.scheme + '://' + signed.netloc == self.origin)
        status, raw, _ = self.request(signed.path + '?' + signed.query, method='GET')
        self.check('signed_url_returns_exact_synthetic_png', status == 200 and
                   raw.get('sha256') == hashlib.sha256(png).hexdigest(), status=status)
        status, body, _ = self.request(path + '?action=view', {'phone': phone}, self.tokens['outsider'])
        self.check('outsider_cannot_request_real_test_document', status == 403, status=status)
        public_path = '/storage/v1/object/public/vacleaner-client-documents/' + uploaded['path']
        status, _, _ = self.request(public_path, method='GET')
        self.check('document_bucket_not_public', status in (400, 401, 403, 404), status=status)
        direct_path = '/storage/v1/object/vacleaner-client-documents/' + uploaded['path']
        status, _, _ = self.request(direct_path, token=self.tokens['outsider'], method='GET')
        self.check('outsider_direct_storage_denied', status in (400, 401, 403, 404), status=status)
        status, body, _ = self.request(path + '?action=delete', {'phone': phone}, self.tokens['manager_a'])
        self.check('delete_synthetic_document', status == 200 and body.get('ok') is True, status=status)
        status, body, _ = self.request(path + '?action=view', {'phone': phone}, self.tokens['manager_b'])
        self.check('deleted_document_absent_after_reread', status == 200 and body.get('document') is None, status=status)

    def referrals(self):
        assert self.args.allow_synthetic_writes
        assert not (Path(self.args.artifacts) / 'referrals-state.json').exists()
        self.login()
        owner = '+380000000101'
        summary = self.booking_action({'action': 'referral_summary', 'phone': owner})['referral']
        self.check('completed_customer_has_real_referral_code', bool(summary['code']) and summary['completedOrders'] >= 1)
        payload = self.synthetic_payload('real friend code', '2030-02-04', '2030-02-05', '+380000000140')
        payload['referralCode'] = summary['code']
        self.save_state(friendPayload=payload)
        friend = self.booking_action(payload, expected=201, name='create_friend_referral')['booking']
        bid = friend['id']
        self.save_state(friendPayload=payload, friendBookingId=bid)
        self.check('friend_discount_is_100', friend['base_amount'] == 400 and
                   friend['extras']['referral_friend']['discount_amount'] == 100)
        self.booking_action({'action': 'update', 'bookingId': bid, 'status': 'confirmed'})
        self.booking_action({'action': 'save_finance', 'bookingId': bid, 'depositPaid': True,
                             'depositAmount': 1000, 'usedPackets': 0})
        self.booking_action({'action': 'update', 'bookingId': bid, 'status': 'issued'})
        self.booking_action({'action': 'save_deposit_return', 'bookingId': bid, 'returned': True,
                             'settlementConfirmed': True, 'refundPaid': True})
        summary = self.booking_action({'action': 'referral_summary', 'phone': owner})['referral']
        self.check('completed_friend_activates_one_150_reward', summary['completedReferrals'] == 1 and
                   summary['activeRewardCount'] == 1 and summary['activeRewardAmount'] == 150)
        reward_payload = self.synthetic_payload('reward consumer', '2030-02-11', '2030-02-12', owner)
        consumer = self.booking_action(reward_payload, expected=201, name='create_reward_consumer')['booking']
        self.save_state(friendPayload=payload, friendBookingId=bid, rewardConsumerId=consumer['id'])
        self.check('reward_applies_150_once', consumer['base_amount'] == 350 and
                   consumer['extras']['referral_reward']['amount'] == 150)
        summary = self.booking_action({'action': 'referral_summary', 'phone': owner})['referral']
        self.check('claimed_reward_no_longer_available', summary['activeRewardAmount'] == 0 and
                   len([r for r in summary['rewards'] if r['status'] == 'used']) == 1)
        self.booking_action({'action': 'update', 'bookingId': consumer['id'], 'status': 'cancelled'})
        summary = self.booking_action({'action': 'referral_summary', 'phone': owner})['referral']
        self.check('cancellation_releases_claimed_reward', summary['activeRewardAmount'] == 150)
        status, body, _ = self.fn('vacleaner-status-correction-v1', {'bookingId': bid,
            'status': 'issued', 'reason': 'R4 synthetic referral correction'})
        self.check('completed_referral_correction', status == 200, status=status, error=body.get('error'))
        summary = self.booking_action({'action': 'referral_summary', 'phone': owner})['referral']
        self.check('correction_revokes_unspent_reward', summary['activeRewardAmount'] == 0 and summary['completedReferrals'] == 0)
        self.booking_action({'action': 'save_deposit_return', 'bookingId': bid, 'returned': True,
                             'settlementConfirmed': True, 'refundPaid': True})
        summary = self.booking_action({'action': 'referral_summary', 'phone': owner})['referral']
        self.check('resettlement_restores_same_reward_without_duplicates', len(summary['rewards']) == 1 and
                   summary['activeRewardAmount'] == 150 and summary['completedReferrals'] == 1)
        attribution = self.synthetic_payload('instagram attribution only', '2030-02-18', '2030-02-19', '+380000000141')
        attribution['source'] = 'instagram'
        attributed = self.booking_action(attribution, expected=201, name='create_attribution_only')['booking']
        analytics = self.booking_action({'action': 'referral_analytics'})
        self.check('instagram_source_does_not_become_friend_referral',
                   len(analytics['uses']) == 1 and analytics['uses'][0]['booking_id'] == bid and
                   all(u['booking_id'] != attributed['id'] for u in analytics['uses']) and analytics['messages'] == [])
        campaign_payload = {'action': 'create_campaign', 'campaignType': 'personal', 'customerPhone': owner,
            'name': 'R4 SYNTHETIC inactive campaign', 'code': 'R4-' + uuid.uuid4().hex[:12].upper(),
            'discountType': 'fixed', 'discountValue': 100, 'durationDays': 14}
        status, body, _ = self.fn('vacleaner-admin-data-v1', campaign_payload)
        self.check('create_synthetic_personal_campaign_without_dispatch', status == 200, status=status, error=body.get('error'))
        cid = body['campaign']['id']
        self.check('personal_code_requires_explicit_activation', len(body['codes']) == 1 and body['codes'][0]['active'] is False)
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'campaigns'}, 'manager_b')
        rows = [c for c in body.get('campaigns', []) if c['id'] == cid]
        self.check('campaign_analytics_have_no_fabricated_conversion', status == 200 and len(rows) == 1 and
                   rows[0]['conversion'] is None and rows[0]['smsRecipientCount'] == 0 and
                   rows[0]['usedCount'] == 0 and rows[0]['revenue'] == 0 and rows[0]['activatedCount'] == 0)
        status, body, _ = self.fn('vacleaner-admin-data-v1', {'action': 'set_campaign_status', 'campaignId': cid, 'status': 'paused'})
        self.check('pause_synthetic_campaign', status == 200 and body.get('status') == 'paused', status=status)

    def auth(self):
        status, body, _ = self.request('/functions/v1/r4-provision-test-identities', {},
                                      self.secret['publicKeys']['anon'])
        self.check('temporary_provisioner_disabled', status == 410 and
                   body.get('error') == 'bootstrap_permanently_disabled', status=status)
        self.login()
        for name in FUNCTIONS:
            for actor, token, expected in [('missing', None, 401), ('invalid', 'invalid-r4-token', 401),
                    ('outsider', self.tokens['outsider'], 403)]:
                status, body, ms = self.request('/functions/v1/' + name, {'action': 'list'}, token)
                self.check(name + '_' + actor, status == expected, status=status,
                           error=body.get('error'), durationMs=ms)
            for actor in ['manager_a', 'manager_b']:
                payload = {'action': 'list'} if name in FUNCTIONS[:2] else {}
                status, body, ms = self.fn(name, payload, actor)
                expected = 200 if name in FUNCTIONS[:2] else 400
                self.check(name + '_' + actor, status == expected, status=status,
                           error=body.get('error'), durationMs=ms)
        status, settings, ms = self.request('/functions/v1/vacleaner-settings', method='GET')
        self.check('public_catalog_get_is_intentional', status == 200 and
                   bool(settings.get('catalog', {}).get('products')), status=status, durationMs=ms)
        for actor in [None, 'outsider', 'manager_a']:
            token = self.tokens.get(actor)
            label = actor or 'anonymous'
            for table in ['vacleaner_bookings', 'vacleaner_customers', 'vacleaner_settings']:
                status, body, _ = self.request('/rest/v1/' + table + '?select=*&limit=1',
                                                token=token, method='GET')
                self.check(label + '_direct_' + table, status in (401, 403),
                           status=status, error=body.get('code'))
            status, body, _ = self.request('/rest/v1/rpc/vacleaner_apply_reservation', {
                'p_booking_id': '00000000-0000-4000-8000-000000000000',
                'p_start_date': '2030-01-01', 'p_return_date': '2030-01-02',
                'p_pickup_window': 'morning', 'p_return_window': 'morning',
                'p_start_at': '2030-01-01T08:00:00.000Z', 'p_end_at': '2030-01-02T10:00:00.000Z',
                'p_rental_days': 1, 'p_resources': [], 'p_target_status': 'confirmed',
                'p_hold_expires_at': None}, token)
            self.check(label + '_privileged_rpc_denied', status in (401, 403),
                       status=status, error=body.get('code'))
        status, body, _ = self.request('/rest/v1/admin_users?select=user_id',
                                      token=self.tokens['outsider'], method='GET')
        self.check('outsider_cannot_read_allowlist', status == 200 and body == [], status=status)
        for actor in ['manager_a', 'manager_b']:
            status, body, _ = self.request('/rest/v1/admin_users?select=user_id',
                                          token=self.tokens[actor], method='GET')
            self.check(actor + '_allowlist_self_only', status == 200 and len(body) == 1, status=status)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-ref', required=True)
    parser.add_argument('--credentials', default='/workspace/.va-r4-secrets/access.json')
    parser.add_argument('--artifacts', required=True)
    parser.add_argument('--phase', choices=['auth', 'lifecycle', 'audit', 'concurrency', 'lost_response',
                                          'persistence', 'documents', 'referrals'], required=True)
    parser.add_argument('--allow-synthetic-writes', action='store_true')
    args = parser.parse_args()
    checks = Checks(args)
    try:
        getattr(checks, args.phase)()
        checks.report['completed'] = True
        checks.save()
        print(json.dumps({'phase': args.phase, 'passed': len(checks.report['checks']), 'completed': True}))
    except Exception as error:
        checks.report['completed'] = False
        checks.report['failureType'] = type(error).__name__
        checks.save()
        raise

if __name__ == '__main__':
    main()
