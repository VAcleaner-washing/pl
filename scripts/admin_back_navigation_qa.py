"""Exercise shared Back navigation on the supplied artifact with read-only fixtures."""
import argparse
import json
import re
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
    parser.add_argument('--widths', default='320,390,440,956,1440')
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    root, out = Path(args.root).resolve(), Path(args.artifacts).resolve()
    out.mkdir(parents=True, exist_ok=True)
    config = json.loads((smoke.PROJECT_ROOT / 'config/vacleaner.json').read_text())
    results, forbidden, errors, geometry = [], [], [], []
    fixture = idle.fixtures(config, 21, 7, forbidden)
    reads = {
        'sms_status': {'sender': 'VACLEANER', 'senderStatus': {'status': 0}, 'balance': None},
        'sms_dispatches': {'dispatches': [{'id': 'back-qa-dispatch', 'audience_segment': 'sleeping', 'audience_count': 1, 'status': 'sent', 'created_at': '2026-11-01T08:00:00Z'}]},
        'sms_audience': {'customers': [{'phone': '+380951111111', 'name': 'Тестовий одержувач', 'completedOrders': 2, 'daysDormant': 220, 'consent': 'explicit', 'selectable': True}], 'summary': {'total': 1, 'selectable': 1, 'explicit': 1, 'legacy': 0}},
        'dispatch_recipients': {'recipients': [{'customer_name': 'Тестовий одержувач', 'customer_phone': '+380951111111', 'status': 'delivered'}]},
        'referral_summary': {'referral': {'code': 'VA-BACK123', 'profile': {}, 'referrals': [], 'rewards': [], 'activeRewards': [], 'activeRewardAmount': 0, 'completedReferrals': 0}},
    }

    def check(name, passed, **evidence):
        results.append({'name': name, 'passed': bool(passed), **evidence})
        print(('PASS: ' if passed else 'FAIL: ') + name, flush=True)
        assert passed, evidence or name

    with pages_server(root) as base, sync_playwright() as pw:
        options = {'headless': True}
        if args.browser == 'chromium':
            options['args'] = ['--no-sandbox']
        browser = getattr(pw, args.browser).launch(**options)
        for width in map(int, args.widths.split(',')):
            device = {k: v for k, v in pw.devices['iPhone 17 Pro Max'].items() if k != 'default_browser_type'} if width <= 956 else {}
            device.update(viewport={'width': width, 'height': 440 if width == 956 else 956}, service_workers='block', timezone_id='Europe/Kyiv')
            context = browser.new_context(**device)
            context.add_init_script(smoke.session_script() + ("Object.defineProperty(navigator,'standalone',{value:true});" if width <= 956 else ''))

            def route_request(route):
                request, parsed = route.request, urlsplit(route.request.url)
                if request.url.startswith(base + '/'):
                    return route.continue_()
                if parsed.scheme + '://' + parsed.netloc != smoke.SUPABASE_HOST:
                    forbidden.append({'host': parsed.hostname, 'path': parsed.path})
                    return route.abort()
                headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
                if request.method == 'OPTIONS':
                    return route.fulfill(status=204, headers=headers)
                if parsed.path.startswith('/auth/v1/'):
                    return route.fulfill(status=200, content_type='application/json', headers=headers, body='{"id":"00000000-0000-4000-8000-000000000099"}')
                payload = request.post_data_json if request.post_data else {}
                action = (payload or {}).get('action')
                if action in reads:
                    return route.fulfill(status=200, content_type='application/json', headers=headers, body=json.dumps(reads[action]))
                return fixture(route)

            context.route('**/*', route_request)
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            label = f'{args.browser}-{width}'
            anchor = None

            def back(screen, selector):
                nonlocal anchor
                header = page.locator(selector)
                button = header.locator(':scope > .admin-screen-back')
                expect(button).to_have_count(1)
                expect(button).to_be_visible()
                expect(button).to_have_attribute('type', 'button')
                expect(button.locator('svg')).to_be_visible()
                paint=button.evaluate("el=>({opacity:getComputedStyle(el).opacity,svgOpacity:getComputedStyle(el.querySelector('svg')).opacity,stroke:getComputedStyle(el.querySelector('path')).stroke,strokeWidth:getComputedStyle(el.querySelector('path')).strokeWidth,html:el.innerHTML})")
                check(f'{label}/{screen}: Back icon is visibly painted',float(paint['opacity'])>0 and float(paint['svgOpacity'])>0 and paint['stroke'] not in ('none','transparent','rgba(0, 0, 0, 0)'),paint=paint)
                assert button.get_attribute('aria-label')
                route_label = {'client': 'До бронювання', 'returned-client': 'До бронювання', 'booking1': 'До картки клієнта', 'booking-exit': 'До картки клієнта', 'referral': 'До картки клієнта'}.get(screen)
                if route_label:
                    assert route_label in button.get_attribute('aria-label'), {'screen': screen, 'expectedRoute': route_label}
                box, head = button.bounding_box(), header.bounding_box()
                check(f'{label}/{screen}: accessible44px Back stays in header', box['width'] >= 44 and box['height'] >= 44 and box['y'] >= head['y'] - 1 and box['y'] + box['height'] <= head['y'] + head['height'] + 1, button=box, header=head)
                if width <= 900:
                    if anchor is None:
                        anchor = box
                    check(f'{label}/{screen}: identical top-left anchor', abs(box['x'] - 16) <= .5 and abs(box['y'] - 69) <= .5 and abs(box['x'] - anchor['x']) <= .5 and abs(box['y'] - anchor['y']) <= .5, button=box)
                close = header.locator('button.close:visible')
                if close.count():
                    close_box = close.first.bounding_box()
                    heading_box = header.locator('h1,h2,h3').first.bounding_box()
                    overlap = heading_box and min(close_box['x']+close_box['width'], heading_box['x']+heading_box['width']) > max(close_box['x'], heading_box['x']) and min(close_box['y']+close_box['height'], heading_box['y']+heading_box['height']) > max(close_box['y'], heading_box['y'])
                    check(f'{label}/{screen}: Close remains in header without overlapping Back or title', close_box['y'] >= head['y']-1 and close_box['y']+close_box['height'] <= head['y']+head['height']+1 and close_box['x'] >= box['x']+box['width']+4 and not overlap, close=close_box, title=heading_box)
                check(f'{label}/{screen}: no horizontal overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                geometry.append({'case': label, 'screen': screen, 'button': box, 'header': head})
                if screen in ('detail','client','booking2','sms1','sms-history'):
                    page.screenshot(path=str(out / f'{label}-{screen}.png'))
                return button

            def discard():
                dialog = page.locator('#labLeaveDialog')
                expect(dialog).to_be_visible()
                dialog.locator('[data-lab-discard]').click()

            try:
                page.goto(base + '/admin/bronuvannia/')
                page.wait_for_selector('.booking-card,.upcoming-row')
                if width <= 900:
                    page.evaluate("document.documentElement.style.setProperty('--pwa-safe-top','59px');document.documentElement.style.setProperty('--pwa-safe-bottom','34px')")
                idle.navigate(page, 'bookings')
                booking = next(row for row in fixture.bookings if row['status'] == 'issued')
                card = page.locator(f'.booking-card[data-id="{booking["id"]}"]')
                card.locator('.booking-row-head').click()
                expect(page.locator('.detail')).to_be_visible()
                if width <= 900:
                    expect(page.locator('.operations-detail-layout>.detail-top')).to_be_visible()
                back('detail', '.detail-top')
                page.locator('.detail').evaluate('el=>el.scrollTop=el.scrollHeight')
                scrolled_back = page.locator('.detail-top .admin-screen-back').bounding_box()
                check(f'{label}: Back remains below the safe area after long detail scroll', scrolled_back['y'] >= (59 if width <= 900 else 0) and scrolled_back['y'] + scrolled_back['height'] <= page.viewport_size['height'], button=scrolled_back)
                page.locator('.detail').evaluate('el=>el.scrollTop=0')
                page.locator('[data-native-detail-client]:visible strong').click() if width <= 900 else page.locator('.detail [data-client-card]').click()
                expect(page.locator('#clientEditor')).to_be_visible()
                back('client', '#clientEditor>header')
                page.locator('#clientCreateBooking').click()
                form = page.locator('#bookingForm')
                expect(form).to_be_visible()
                back('booking1', '#bookingForm>header')
                form.locator('[name=startDate]').fill(smoke.iso(8))
                form.locator('[name=returnDate]').fill(smoke.iso(9))
                if width <= 900:
                    form.locator('.mobile-booking-next').click()
                    expect(form).to_have_attribute('data-mobile-step', '2')
                    form.locator('[name=customerName]').fill('Незбережена локальна чернетка')
                    back('booking2', '#bookingForm>header').click()
                    expect(form).to_have_attribute('data-mobile-step', '1')
                    expect(page.locator('#labLeaveDialog')).not_to_be_attached()
                    expect(form.locator('[name=customerName]')).to_have_value('Незбережена локальна чернетка')
                    expect(form.locator('[name=startDate]')).to_have_value(smoke.iso(8))
                    check(f'{label}: previous wizard step retains data without a leave prompt', True)
                    for step in (2, 3, 4):
                        form.locator('.mobile-booking-next').click()
                        expect(form).to_have_attribute('data-mobile-step', str(step))
                        if step >= 3:
                            back(f'booking{step}', '#bookingForm>header')
                    for step in (3, 2, 1):
                        form.locator('header .admin-screen-back').click()
                        expect(form).to_have_attribute('data-mobile-step', str(step))
                        expect(page.locator('#labLeaveDialog')).not_to_be_attached()
                    expect(form.locator('[name=customerName]')).to_have_value('Незбережена локальна чернетка')
                    check(f'{label}: all four wizard steps share Back and preserve the draft', True)
                back('booking-exit', '#bookingForm>header').click()
                expect(page.locator('#labLeaveDialog')).to_be_visible()
                page.locator('#labLeaveDialog [data-lab-keep]').click()
                expect(form.locator('header .admin-screen-back')).to_be_focused()
                form.locator('header .admin-screen-back').click()
                discard()
                expect(page.locator('#clientEditor')).to_be_visible()
                page.locator('#clientEditor .client-benefits-section>summary').click()
                page.locator('#clientOpenReferralDetails').click()
                expect(page.locator('.referral-share-modal')).to_be_visible()
                back('referral', '.referral-share-modal>header').click()
                expect(page.locator('#clientEditor')).to_be_visible()
                back('returned-client', '#clientEditor>header').click()
                expect(page.locator('.detail')).to_be_visible()
                expect(page.locator('.detail')).to_contain_text(booking['booking_code'])
                check(f'{label}: booking-client-new booking returns through the exact parent chain', True)
                back('returned-detail', '.detail-top').click()
                expect(page.locator('.detail')).not_to_be_attached()

                for action, form_id in [('finance', 'financeForm'), ('extend', 'extendRentalForm')]:
                    card.locator(f'[data-action={action}]').click()
                    expect(page.locator('#' + form_id)).to_be_visible()
                    back(action, '#' + form_id + '>header').click()
                    expect(page.locator('#' + form_id)).not_to_be_attached()
                for status, action, form_id in [('pending', 'process', 'processForm'), ('confirmed', 'issue', 'issueForm')]:
                    row = next(row for row in fixture.bookings if row['status'] == status)
                    page.locator(f'.booking-card[data-id="{row["id"]}"] [data-action={action}]').click()
                    expect(page.locator('#' + form_id)).to_be_visible()
                    back(action, '#' + form_id + '>header').click()
                    expect(page.locator('#' + form_id)).not_to_be_attached()

                idle.navigate(page, 'finances')
                page.locator('#addExpense').click()
                expect(page.locator('#expenseForm')).to_be_visible()
                back('expense', '#expenseForm>header').click()
                expect(page.locator('#expenseForm')).not_to_be_attached()

                idle.navigate(page, 'campaigns')
                page.locator('#newCampaign').click()
                form = page.locator('#campaignForm')
                expect(form).to_be_visible()
                form.locator('[name=name]').fill('Лише локальна чернетка')
                back('campaign', '#campaignForm>header').click()
                discard()
                expect(form).not_to_be_attached()

                page.locator('#smsCampaign').click()
                expect(page.locator('#smsAudienceList input:not(:disabled)')).to_have_count(1)
                back('sms1', '.sms-workspace-header')
                page.locator('#smsAudienceList input:not(:disabled)').check()
                page.locator('#smsPrimary').click()
                expect(page.locator('[data-sms-panel="2"]')).to_have_class(re.compile(r'\bactive\b'))
                page.locator('#smsMessage').fill('Тестовий текст, не відправляти')
                back('sms2', '.sms-workspace-header').click()
                expect(page.locator('[data-sms-panel="1"]')).to_have_class(re.compile(r'\bactive\b'))
                expect(page.locator('#smsMessage')).to_have_value('Тестовий текст, не відправляти')
                page.locator('#smsPrimary').click()
                page.locator('[name=smsRoute][value=international]').check()
                page.locator('#smsPrimary').click()
                back('sms3', '.sms-workspace-header').click()
                expect(page.locator('[data-sms-panel="2"]')).to_have_class(re.compile(r'\bactive\b'))
                page.locator('#smsHistoryOpen').click()
                back('sms-history', '.sms-workspace-header')
                page.locator('[data-sms-details]').click()
                expect(page.locator('#smsDispatchRecipients article')).to_have_count(1)
                back('sms-recipients', '.sms-workspace-header').click()
                expect(page.locator('#smsHistoryPanel')).not_to_have_class(re.compile(r'\bdispatch-detail-mode\b'))
                back('sms-history-return', '.sms-workspace-header').click()
                expect(page.locator('[data-sms-panel="2"]')).to_have_class(re.compile(r'\bactive\b'))
                expect(page.locator('#smsMessage')).to_have_value('Тестовий текст, не відправляти')
                back('sms-return-step', '.sms-workspace-header').click()
                back('sms-exit', '.sms-workspace-header').click()
                expect(page.locator('.sms-campaign-modal')).not_to_be_attached()
                check(f'{label}: SMS Back returns one level and retains text and recipient choices', True)
            except Exception:
                failure={'name': label + ': exception', 'passed': False, 'exception': traceback.format_exc()}
                results.append(failure)
                print(failure['exception'].split('Aria snapshot:')[0], flush=True)
                try:
                    page.screenshot(path=str(out / f'{label}-failure.png'))
                except Exception as capture_error:
                    failure['screenshotError']=str(capture_error)
            finally:
                context.close()
        browser.close()
    results.append({'name': 'No remote mutations or external calls', 'passed': not forbidden, 'calls': forbidden})
    results.append({'name': 'No runtime page errors', 'passed': not errors, 'errors': errors})
    failed = [row for row in results if not row['passed']]
    record = {'browser': args.browser, 'release': json.loads((root/'release.json').read_text()), 'passed': len(results)-len(failed), 'failed': failed, 'results': results, 'geometry': geometry, 'physicalIphoneTested': False, 'businessDataWrites': 0}
    (out / 'result.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': record['passed'], 'failed': len(failed)}))
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
